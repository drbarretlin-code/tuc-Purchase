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
  const { fileId } = req.body || {};
  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required in body' });
  }

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
    const { data: fileBlob, error: downloadError } = await supabase.storage.from('tuc_documents').download(storagePath);
    
    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download from storage: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileBlob.arrayBuffer();

    // 5. Run AI Parsing
    const apiKey = process.env.SERVER_GEMINI_API_KEY || process.env.VITE_GEMINI_KEY || '';
    if (!apiKey) throw new Error('SERVER_GEMINI_API_KEY is not configured on the server.');

    console.log(`[Worker] 開始解析檔案: ${record.original_name}`);
    
    // Safety: Delete any old records for this file to ensure clean rebuild
    await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', record.original_name);

    const parseResult = await processFileBackend(
      arrayBuffer,
      record.original_name,
      apiKey,
      record.equipment_name,
      fileId
    );

    // 6. Insert parsed knowledge into Database
    let addedCount = 0;
    for (const item of parseResult.entries) {
      const { error: insertError } = await supabase.from('tuc_history_knowledge').insert({
        category: item.category,
        content: item.content,
        source_file_name: record.original_name,
        metadata: {
          equipment_name: parseResult.detectedEquipment,
          docType: parseResult.docType,
          docId: fileId,
          full_json_data: parseResult.fullJsonData
        }
      } as any);
      if (!insertError) addedCount++;
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
