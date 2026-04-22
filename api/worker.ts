import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { processFileBackend } from './parseHelper.js';

// Initialize Supabase Client dynamically
let supabase: SupabaseClient | null = null;
try {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.warn('Supabase initialization failed in worker');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  // 1. Verify QStash request (Basic verification, assuming Upstash sends valid POST)
  const { fileId, language } = req.body || {};
  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required in body' });
  }

  // V17.8: 安全性檢查 - 確保語系在白名單內
  const SUPPORTED_LANGS = ['zh-TW', 'zh-CN', 'en-US', 'th-TH'];
  const targetLang = SUPPORTED_LANGS.includes(language) ? language : 'zh-TW';

  try {
    // 2. Fetch file record from Database
    const { data: fileRecord, error: fetchError } = await supabase
      .from('tuc_uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileRecord) {
      throw new Error(`File record not found: ${fetchError?.message}`);
    }

    const record = fileRecord as any;

    // 3. Mark as processing
    await supabase.from('tuc_uploaded_files').update({ parse_status: 'processing' } as any).eq('id', fileId);

    // 4. Download file from Supabase Storage
    const storagePath = record.storage_path;
    const { data: fileBlob, error: downloadError } = await supabase.storage.from('spec-files').download(storagePath);
    
    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download from storage: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileBlob.arrayBuffer();

    // 5. Run AI Parsing
    const apiKey = process.env.SERVER_GEMINI_API_KEY || process.env.VITE_GEMINI_KEY || '';
    if (!apiKey) throw new Error('SERVER_GEMINI_API_KEY is not configured on the server.');

    console.log(`[Worker] 開始解析檔案: ${record.original_name}`);

    const parseResult = await processFileBackend(
      arrayBuffer,
      record.original_name,
      apiKey,
      record.equipment_name,
      fileId,
      targetLang
    );

    // 6. 解析成功後，先插入新條目，再刪除舊條目（防止解析失敗導致資料歸零）
    let addedCount = 0;
    const newEntries: any[] = [];
    for (const item of parseResult.entries) {
      newEntries.push({
        category: item.category,
        content: item.content,
        source_file_name: record.original_name,
        metadata: {
          equipment_name: parseResult.detectedEquipment,
          docType: parseResult.docType,
          docId: fileId,
          full_json_data: parseResult.fullJsonData
        }
      });
    }

    if (newEntries.length > 0) {
      // 先刪除舊條目（只在有新條目可替換時才刪除）
      await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', record.original_name);
      
      // 批次插入新條目
      const { error: insertError } = await supabase.from('tuc_history_knowledge').insert(newEntries as any);
      if (insertError) {
        console.error(`[Worker] 批次插入失敗，改用逐筆插入:`, insertError.message);
        for (const entry of newEntries) {
          const { error: singleErr } = await supabase.from('tuc_history_knowledge').insert(entry as any);
          if (!singleErr) addedCount++;
        }
      } else {
        addedCount = newEntries.length;
      }
    } else {
      console.warn(`[Worker] AI 解析結果為空，保留既有知識條目不刪除: ${record.original_name}`);
    }

    // 7. Update uploaded_files record to completed
    await supabase.from('tuc_uploaded_files').update({
      parse_status: 'completed',
      is_parsed: true,
      parsed_at: new Date().toISOString(),
      equipment_name: parseResult.detectedEquipment,
      equipment_tags: [parseResult.detectedEquipment],
      error_message: null
    } as any).eq('id', fileId);

    console.log(`[Worker] 檔案解析成功: ${record.original_name}, 新增條目: ${addedCount}`);
    return res.status(200).json({ success: true, added: addedCount });

  } catch (error: any) {
    console.error(`[Worker Error for ${fileId}]:`, error);
    // Mark as failed in Database
    await supabase.from('tuc_uploaded_files').update({
      parse_status: 'failed',
      error_message: error.message || 'Unknown parsing error'
    } as any).eq('id', fileId);

    // Return 500 so QStash knows it failed and will retry if appropriate
    return res.status(500).json({ error: error.message });
  }
}
