import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * V20: 後端代理下載端點
 * 使用 Service Role Key 直接從 Supabase 內部 API 下載檔案，
 * 不經過 CDN，因此不計入 Cached Egress 配額。
 * 
 * 取代前端直接使用 public_url (CDN) 下載的行為。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { storagePath } = req.query;
  if (!storagePath || typeof storagePath !== 'string') {
    return res.status(400).json({ error: 'storagePath query parameter is required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server Supabase credentials not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: fileBlob, error } = await supabase.storage
      .from('spec-files')
      .download(storagePath);

    if (error || !fileBlob) {
      console.error('[DownloadProxy] 下載失敗:', error);
      return res.status(404).json({ error: 'File not found', details: error?.message });
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 依副檔名推斷 Content-Type
    const ext = storagePath.split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
    };
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    // 不設定 Cache-Control，避免 CDN 快取
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (err: any) {
    console.error('[DownloadProxy] 例外錯誤:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
