import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { publishWithRotation } from './qstashRotator.js';

let supabase: SupabaseClient | null = null;
try {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.warn('Supabase initialization failed');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileIds, language, mode } = req.body;
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'fileIds array is required' });
    }

    // Determine base URL for Webhook callback
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const workerUrl = `${protocol}://${host}/api/worker`;

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured on the server. Please check environment variables.' });
    }

    // 1. 更新資料庫狀態為 pending
    const { error: dbError } = await supabase
      .from('tuc_uploaded_files')
      .update({ parse_status: 'pending', error_message: null } as any)
      .in('id', fileIds);

    if (dbError) {
      console.error('[Enqueue] 更新狀態失敗:', dbError);
      return res.status(500).json({ error: 'Database update failed', details: dbError });
    }

    // 2. 推送任務至 QStash (改為 Daisy Chain 啟動訊號，搭載備援輪替引擎)
    const results: any[] = [];
    try {
      const publishOptions: any = {
        url: workerUrl,
        body: { action: 'process_next', language: language, mode: mode || 'standard' },
        retries: 3,
      };
      const response = await publishWithRotation(publishOptions);
      results.push(response);
    } catch (pushErr: any) {
      console.warn('[Enqueue] 推播要求被拒或所有金鑰耗盡:', pushErr.message);
      return res.status(500).json({ error: pushErr.message });
    }

    return res.status(200).json({ 
      success: true, 
      enqueued: fileIds.length,
      qstashResults: results 
    });

  } catch (error: any) {
    console.error('[Enqueue API Error]:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal Server Error', 
      details: error.stack 
    });
  }
}
