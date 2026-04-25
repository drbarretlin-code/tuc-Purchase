import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getFileChunks, processSingleChunkBackend } from './parseHelper.js';
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
  const { action, fileId, chunkIndex = 0, language = 'zh-TW' } = req.body || {};

  try {
    // 模式一：尋找下一筆檔案
    if (action === 'process_next') {
      const { data: files } = await supabase
        .from('tuc_uploaded_files')
        .select('id, parse_status')
        .eq('parse_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (!files || files.length === 0) {
        // 佇隊清空前，先自動重置可能的死鎖檔案 (processing 超過 10 分鐘)
        const TEN_MINUTES_AGO = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: stuckFiles } = await supabase
          .from('tuc_uploaded_files')
          .select('id, original_name, updated_at')
          .in('parse_status', ['processing'])
          .lt('updated_at', TEN_MINUTES_AGO);

        if (stuckFiles && stuckFiles.length > 0) {
          const stuckIds = stuckFiles.map((f: any) => f.id);
          console.warn(`[Worker] 偵測到 ${stuckIds.length} 筆檔案死鎖超過 10 分鐘，自動解鎖為 failed`);
          await supabase.from('tuc_uploaded_files')
            .update({ parse_status: 'failed', error_message: '系統偵測到處理逾時，Worker 可能因 API 餃出、Vercel 超時或玲境中斷而未完成，已自動重置。' } as any)
            .in('id', stuckIds);

          // 解鎖後重新起動一次 process_next
          await publishWithRotation({ url: workerUrl, body: { action: 'process_next', language }, delay: '2s' });
          return res.status(200).json({ success: true, message: 'Deadlock resolved', unlockedCount: stuckIds.length });
        }

        console.log('[Worker] 佇隊清空，接力完成');
        return res.status(200).json({ success: true, message: 'Queue empty' });
      }

      const nextFileId = files[0].id;
      
      // 鎖定該筆檔案
      const { data: updated } = await supabase
        .from('tuc_uploaded_files')
        .update({ parse_status: 'processing' } as any)
        .eq('id', nextFileId)
        .eq('parse_status', 'pending')
        .select()
        .single();
        
      if (!updated) {
        // 並發衝突，讓 QStash 重試或直接再觸發一次 process_next
        await publishWithRotation({ url: workerUrl, body: { action: 'process_next', language }, delay: '2s' });
        return res.status(200).json({ skipped: true, reason: 'concurrency lock mismatch' });
      }

      // 發送第一塊切片處理任務
      await publishWithRotation({
        url: workerUrl,
        body: { fileId: nextFileId, chunkIndex: 0, language },
        retries: 3
      });
      return res.status(200).json({ success: true, triggered: nextFileId });
    }

    // 模式二：處理指定檔案的特定微批次切片
    if (!fileId) return res.status(400).json({ error: 'fileId required' });

    const { data: record, error: fetchErr } = await supabase.from('tuc_uploaded_files').select('*').eq('id', fileId).single();
    if (fetchErr || !record) throw new Error('File not found');

    // **中斷驗證防護**
    if (!record.parse_status || !record.parse_status.startsWith('processing')) {
      console.log(`[Worker] 檔案 ${record.original_name} 狀態被變更為 ${record.parse_status}，中止接力。`);
      // 中斷後，負責叫喚下一筆檔案
      await publishWithRotation({ url: workerUrl, body: { action: 'process_next', language }, delay: '1s' });
      return res.status(200).json({ aborted: true });
    }

    // 取得檔案實體並分塊
    let textChunks: string[] = [];
    let inlineData: any = null;

    // V22 優化：省流量「文字快取」機制
    // 如果資料庫已有提取過的純文字，且不是第一個切片（不需要再取 PDF 視覺數據），則直接從快取還原
    if (record.extracted_text && chunkIndex > 0) {
      console.log(`[Worker] 使用快取文字進行接力解析，跳過檔案下載 (節省流量)`);
      const cachedText = record.extracted_text;
      const MAX_CHUNK_LENGTH = 3000;
      if (cachedText.length > MAX_CHUNK_LENGTH) {
        for (let i = 0; i < cachedText.length; i += MAX_CHUNK_LENGTH) {
          textChunks.push(cachedText.substring(i, i + MAX_CHUNK_LENGTH));
        }
      } else {
        textChunks.push(cachedText);
      }
    } else {
      // 否則，執行標準下載與提取
      console.log(`[Worker] 執行標準下載與文字提取: ${record.original_name}`);
      const { data: fileBlob } = await supabase.storage.from('spec-files').download(record.storage_path);
      if (!fileBlob) throw new Error('Download failed');
      const arrayBuffer = await fileBlob.arrayBuffer();

      const result = await getFileChunks(arrayBuffer, record.original_name);
      textChunks = result.textChunks;
      inlineData = result.inlineData;

      // 如果是第一次處理且成功提取文字，將文字快取回資料庫，供後續接力使用
      if (chunkIndex === 0 && textChunks.length > 0) {
        const fullText = textChunks.join('');
        await supabase.from('tuc_uploaded_files').update({ 
          extracted_text: fullText,
          file_size: arrayBuffer.byteLength 
        } as any).eq('id', fileId);
        console.log(`[Worker] 已將 ${fullText.length} 字元的提取內容快取至資料庫。`);
      }
    }
    
    let currentIndex = chunkIndex;
    let processedInThisBatch = 0;
    let totalAddedCount = 0;

    // 若是檔案的第一塊，清空舊有關聯知識庫並寫入初始進度
    if (currentIndex === 0) {
      await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', record.original_name);
      await supabase.from('tuc_uploaded_files').update({
        parse_status: `processing:0/${textChunks.length}`
      } as any).eq('id', fileId);
    }

    const apiKey = process.env.SERVER_GEMINI_API_KEY || process.env.VITE_GEMINI_KEY || '';

    // 微批次迴圈 (Vercel 限制防護機制：一次最多消化 4 塊就停)
    while (currentIndex < textChunks.length && processedInThisBatch < 4) {
      const parsedData = await processSingleChunkBackend(
        textChunks[currentIndex],
        textChunks.length > 1,
        currentIndex,
        textChunks.length,
        record.original_name,
        inlineData,
        apiKey,
        language
      );

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

      // 即時回報單一切片進度，讓前端能即時渲染進度條
      await supabase.from('tuc_uploaded_files').update({
        parse_status: `processing:${currentIndex}/${textChunks.length}`
      } as any).eq('id', fileId);

      // 如果還有下一塊而且還在微批次額度內，休息 5 秒鐘保護 Gemini Rate Limit
      if (currentIndex < textChunks.length && processedInThisBatch < 4) {
        console.log(`[Worker] 等待 5 秒鐘準備同批次第 ${processedInThisBatch + 1} 次 API...`);
        await new Promise(r => setTimeout(r, 5000));
      }
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
        body: { fileId, chunkIndex: currentIndex, language },
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
        body: { action: 'process_next', language },
        delay: '2s'
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
      
      console.log(`[Worker] 發生嚴重錯誤，檔案標記為 failed，印向下一筆`);
      try {
        await publishWithRotation({ url: workerUrl, body: { action: 'process_next', language }, delay: '1s' });
      } catch (e) {
        console.error('[Worker] Fatal: 無法喚醒下一筆檔案。');
      }
    }
    return res.status(500).json({ error: errMsg });
  }
}
