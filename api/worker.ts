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
        console.log('[Worker] 佇列清空，接力完成');
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
    const { data: fileBlob } = await supabase.storage.from('spec-files').download(record.storage_path);
    if (!fileBlob) throw new Error('Download failed');
    const arrayBuffer = await fileBlob.arrayBuffer();

    const { textChunks, inlineData } = await getFileChunks(arrayBuffer, record.original_name);
    
    let currentIndex = chunkIndex;
    let processedInThisBatch = 0;
    let totalAddedCount = 0;

    // 若是檔案的第一塊，清空舊有關聯知識庫
    if (currentIndex === 0) {
      await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', record.original_name);
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
    // 容錯機制：如果 429 失敗，因為有 QStash retries: 3 的保護，不應馬上將狀態切為 failed，
    // 以免破壞 QStash 退避重試機會。我們只在此列印錯誤，不改變 db 狀態（或可在超過次數後另行設計死信佇列邏輯）
    if (fileId && (err.message.includes('Qstash') || err.message.includes('429'))) {
       // 保留 processing 狀態，等待 QStash 重試
       return res.status(500).json({ error: err.message, retryFriendly: true });
    } else if (fileId) {
      await supabase.from('tuc_uploaded_files').update({
        parse_status: 'failed',
        error_message: err.message || '未知斷點錯誤'
      } as any).eq('id', fileId);
      
      console.log(`[Worker] 發生嚴重複雜錯誤，放棄此檔案並邁向下一筆`);
      try {
        await publishWithRotation({ url: workerUrl, body: { action: 'process_next', language }, delay: '1s' });
      } catch (e) {
        console.error('[Worker] Fatal: 無法喚醒下一筆檔案，所有金鑰可能均已失效。');
      }
    }
    return res.status(500).json({ error: err.message });
  }
}
