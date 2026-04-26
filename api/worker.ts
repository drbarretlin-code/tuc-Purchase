import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getFileChunks, processSingleChunkBackend, getApiKey } from './parseHelper.js';
import { publishWithRotation } from './qstashRotator.js';

// Initialize Supabase
let supabase: SupabaseClient | null = null;
try {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (supabaseUrl && supabaseKey) supabase = createClient(supabaseUrl, supabaseKey);
} catch (e) {}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const workerUrl = `https://${req.headers.host}/api/worker`;
  const { action, fileId, chunkIndex = 0, language = 'zh-TW', mode = 'standard' } = req.body || {};

  try {
    // 模式一：尋找下一筆檔案
    if (action === 'process_next') {
      // V24: 優先檢查死鎖。即使佇列不為空，也要清理卡住的任務，避免系統阻塞。
      const TEN_MINUTES_AGO = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      // V25: 修正死鎖偵測邏輯。優先檢查 parsed_at (心跳時間)，若無則用 created_at。
      // 避免舊檔案 (created_at 很久以前) 一進入處理狀態就被誤判為死鎖。
      const { data: stuckFiles } = await supabase
        .from('tuc_uploaded_files')
        .select('id, original_name, created_at, parsed_at, parse_status')
        .ilike('parse_status', 'processing%')
        .or(`parsed_at.lt.${TEN_MINUTES_AGO},and(parsed_at.is.null,created_at.lt.${TEN_MINUTES_AGO})`);

      if (stuckFiles && stuckFiles.length > 0) {
        const stuckIds = stuckFiles.map((f: any) => f.id);
        console.warn(`[Worker] 偵測到 ${stuckIds.length} 筆檔案死鎖，自動解鎖為 failed`);
        await supabase.from('tuc_uploaded_files')
          .update({ 
            parse_status: 'failed', 
            error_message: '系統偵測到處理逾時（Deadlock），已自動重置。請手動點擊「重新解析」。' 
          } as any)
          .in('id', stuckIds);
      }

      // V26: 嚴格並發控制。確保同一時間只有一個檔案在解析。
      // 如果還有檔案在 processing 且不是剛才清理掉的死鎖任務，則不啟動新任務。
      const { data: activeProcessing } = await supabase
        .from('tuc_uploaded_files')
        .select('id')
        .ilike('parse_status', 'processing%')
        .neq('id', fileId || '') 
        .limit(1);

      if (activeProcessing && activeProcessing.length > 0) {
        console.log('[Worker] 偵測到已有檔案正在解析中，為確保穩定性，本實例安靜退場。');
        return res.status(200).json({ skipped: true, reason: 'Global concurrency lock' });
      }

      const { data: files } = await supabase
        .from('tuc_uploaded_files')
        .select('id, parse_status')
        .eq('parse_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (!files || files.length === 0) {
        console.log('[Worker] 佇隊清空，接力完成');
        return res.status(200).json({ success: true, message: 'Queue empty' });
      }

      const nextFileId = files[0].id;
      
      // 鎖定該筆檔案
      const { data: updated } = await supabase
        .from('tuc_uploaded_files')
        .update({ 
          parse_status: 'processing',
          parsed_at: new Date().toISOString() // 更新心跳時間
        } as any)
        .eq('id', nextFileId)
        .eq('parse_status', 'pending')
        .select()
        .single();
        
      if (!updated) {
        // 並發衝突，代表已有另一筆 Worker 搶先佔用並負責後續接力。
        // 此處應直接退場，避免多軌並行消耗配額。
        console.log('[Worker] 並發搶佔失敗，偵測到已有領頭 Worker，本實例安靜退場以節省配額。');
        return res.status(200).json({ skipped: true, reason: 'concurrency lock mismatch - silent exit' });
      }

      // 發送第一塊切片處理任務
      await publishWithRotation({
        url: workerUrl,
        body: { fileId: nextFileId, chunkIndex: 0, language, mode },
        retries: 3
      });
      return res.status(200).json({ success: true, triggered: nextFileId });
    }

    // 模式二：處理指定檔案的特定微批次切片
    if (!fileId) return res.status(400).json({ error: 'fileId required' });

    const { data: record, error: fetchErr } = await supabase.from('tuc_uploaded_files').select('*').eq('id', fileId).single();
    if (fetchErr || !record) throw new Error('File not found');

    if (!record.parse_status || !record.parse_status.startsWith('processing')) {
      console.log(`[Worker] 檔案 ${record.original_name} 狀態不符 (${record.parse_status})，中止接力。不發送遞迴呼叫以防無限迴圈。`);
      return res.status(200).json({ aborted: true });
    }

    // 取得檔案實體並分塊
    let textChunks: string[] = [];
    let inlineData: any = null;

    // V23 優化：解耦「提取」與「解析」以防止 Vercel 60s 超時
    // V26.27: 嚴格判別 null，防止空字串引起的無限遞迴
    if (record.extracted_text !== null) {
      console.log(`[Worker] 使用快取文字進行接力解析: ${record.original_name}`);
      const cachedText = record.extracted_text || '';
      const MAX_CHUNK_LENGTH = 12000; 
      
      if (cachedText.length > MAX_CHUNK_LENGTH) {
        for (let i = 0; i < cachedText.length; i += MAX_CHUNK_LENGTH) {
          textChunks.push(cachedText.substring(i, i + MAX_CHUNK_LENGTH));
        }
      } else {
        textChunks.push(cachedText);
      }

      // V26.3: 如果提取出的文字量過少且為 PDF，啟動視覺備援（重新下載以取得 inlineData）
      if (textChunks.join('').length < 100 && record.original_name.toLowerCase().endsWith('.pdf')) {
        console.log(`[Worker] 文字量過少，偵測為掃描檔，啟動 PDF 視覺備援模式...`);
        const { data: fileBlob } = await supabase.storage.from('spec-files').download(record.storage_path);
        if (fileBlob) {
          const arrayBuffer = await fileBlob.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          inlineData = { data: base64Data, mimeType: 'application/pdf' };
        }
      }
    } else {
      // 執行重型下載與提取 (第一階段)
      console.log(`[Worker] 執行第一階段：下載與文字提取: ${record.original_name}`);
      const { data: fileBlob } = await supabase.storage.from('spec-files').download(record.storage_path);
      if (!fileBlob) throw new Error('Download failed');
      const arrayBuffer = await fileBlob.arrayBuffer();

      const result = await getFileChunks(arrayBuffer, record.original_name, mode as any);
      const fullText = result.textChunks.join('').trim();

      // V26.27: 防呆 - 若完全提取不到文字且非 PDF，則中斷，不發送下一波 QStash
      if (!fullText && !record.original_name.toLowerCase().endsWith('.pdf')) {
        await supabase.from('tuc_uploaded_files').update({ 
          parse_status: 'failed',
          error_message: '無法從該檔案提取任何有效文字。請確認檔案內容或改用 PDF 格式上傳。'
        } as any).eq('id', fileId);
        return res.status(200).json({ success: false, error: 'Empty text content' });
      }

      // 將提取內容寫入資料庫
      await supabase.from('tuc_uploaded_files').update({ 
        extracted_text: fullText,
        file_size: arrayBuffer.byteLength,
        parse_status: `processing:0/${result.textChunks.length || 1}`
      } as any).eq('id', fileId);
      
      console.log(`[Worker] 提取完成 (${fullText.length} 字)，立即結束當前 Request 並觸發下一波 AI 解析階段。`);
      
      // 重要：為了防止超時，提取完後不直接進行 AI 解析，而是發送一個新的 QStash 任務來啟動 AI 階段
      await publishWithRotation({
        url: workerUrl,
        body: { fileId: fileId, chunkIndex: 0, language, mode },
        delay: '1s'
      });
      return res.status(200).json({ success: true, phase: 'extraction_completed' });
    }
    
    let currentIndex = chunkIndex;
    let processedInThisBatch = 0;
    let totalAddedCount = 0;
    let lastUsedModelId: string | null = null;

    // 若是檔案的第一塊，清空舊有關聯知識庫並寫入初始進度
    if (currentIndex === 0) {
      await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', record.original_name);
      await supabase.from('tuc_uploaded_files').update({
        parse_status: `processing:0/${textChunks.length}`,
        parsed_at: new Date().toISOString() // 更新心跳
      } as any).eq('id', fileId);
    }

    const apiKey = getApiKey();
    const startTime = Date.now();
    const VERCEL_SAFE_LIMIT = 30000; // 30 秒安全紅線

    // V26: 批次處理模式。在 30 秒內盡可能處理多個區塊，大幅減少 QStash 接力次數與不穩定性。
    while (currentIndex < textChunks.length) {
      if (Date.now() - startTime > VERCEL_SAFE_LIMIT) {
        console.log(`[Worker] 接近 Vercel 60s 限制，剩餘 ${textChunks.length - currentIndex} 塊，發送接力中斷...`);
        break;
      }

      const { parsedData, usedModelId } = await processSingleChunkBackend(
        textChunks[currentIndex],
        textChunks.length > 1,
        currentIndex,
        textChunks.length,
        record.original_name,
        inlineData,
        apiKey,
        language,
        mode as any
      );
      lastUsedModelId = usedModelId;

      // 單一切片的結果寫入
      if (parsedData && parsedData.specEntries && parsedData.specEntries.length > 0) {
        const insertBatch = parsedData.specEntries.map((e: any) => ({
          category: e.category || '技術細節',
          content: e.content || '',
          source_file_name: record.original_name,
          metadata: {
            equipment_name: parsedData.detectedEquipment || record.equipment_name,
            docType: parsedData.docType || 'Specific',
            docId: fileId,
            chunk_index: currentIndex
          }
        })).filter((e: any) => e.content.trim() !== '');

        if (insertBatch.length > 0) {
          const { error: insertErr } = await supabase.from('tuc_history_knowledge').insert(insertBatch as any);
          if (!insertErr) totalAddedCount += insertBatch.length;
        }
      }

      currentIndex++;
      processedInThisBatch++;

      // 即時回報進度並更新心跳
      await supabase.from('tuc_uploaded_files').update({
        parse_status: `processing:${currentIndex}/${textChunks.length}`,
        parsed_at: new Date().toISOString()
      } as any).eq('id', fileId);
    }

    // 批次完成，評估檔案進度
    if (currentIndex < textChunks.length) {
      // 檔案還沒做完，寫入進度字串至資料庫
      const progressStatus = `processing:${currentIndex}/${textChunks.length}`;
      await supabase.from('tuc_uploaded_files').update({
        parse_status: progressStatus
      } as any).eq('id', fileId);

      // 召喚下一批次 QStash，喘息 5 秒鐘
      await publishWithRotation({
        url: workerUrl,
        body: { fileId, chunkIndex: currentIndex, language, modelId: lastUsedModelId, mode },
        delay: '5s',
        retries: 3
      });
      console.log(`[Worker] 觸發下一梯次切片任務，接力索引：${currentIndex}`);
    } else {
      // 整份檔案所有切片已結束
      await supabase.from('tuc_uploaded_files').update({
        parse_status: 'completed',
        is_parsed: true,
        parsed_at: new Date().toISOString(),
        error_message: null
      } as any).eq('id', fileId);

      console.log(`[Worker] 檔案 ${record.original_name} 徹底結束。呼叫 process_next。`);
      
      // 喚醒處理下一筆待機檔案
      await publishWithRotation({
        url: workerUrl,
        body: { action: 'process_next', language, modelId: lastUsedModelId, mode },
        delay: '1s'
      });
    }

    return res.status(200).json({ success: true, processedChunks: processedInThisBatch, itemsAdded: totalAddedCount });

  } catch (err: any) {
    console.error(`[Worker Error]`, err);
    const errMsg = err.message || '';
    
    // 429 配額耆盡：QStash retries: 3 會自動重試，保持 processing 狀態不動
    if (fileId && (errMsg.includes('Qstash') || errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted'))) {
      console.warn('[Worker] 捕獲 429/配額耆盡，保留 processing 狀態等待 QStash retry');
      return res.status(429).json({ error: errMsg, retryFriendly: true });
    } else if (fileId) {
      // 其他達暴錯誤：立即標記 failed 防止死鎖
      await supabase.from('tuc_uploaded_files').update({
        parse_status: 'failed',
        error_message: errMsg || '未知斷點錯誤'
      } as any).eq('id', fileId);
      
      console.log(`[Worker] 發生嚴重錯誤，檔案標記為 failed。為防止遞迴死循環，不自動啟動下一筆任務。`);
    }
    return res.status(500).json({ error: errMsg });
  }
}
