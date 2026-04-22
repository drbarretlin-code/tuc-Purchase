import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@upstash/qstash';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize inside handler to avoid global crashes if env vars are missing
let qstashClient: Client | null = null;
try {
  if (process.env.QSTASH_TOKEN) {
    qstashClient = new Client({ 
      token: process.env.QSTASH_TOKEN,
      baseUrl: process.env.QSTASH_URL || undefined
    });
  }
} catch (e) {
  console.warn('QSTASH_TOKEN initialization failed');
}

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
    const { fileIds, language } = req.body;
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

    // 2. 推送任務至 QStash
    const results: any[] = [];
    if (qstashClient) {
      for (let i = 0; i < fileIds.length; i++) {
        const id = fileIds[i];
        
        // 為了相容 Gemini Free Tier (15 RPM)，如果是批次上傳，強制加上時間間隔 (每個延遲 20 秒)
        const delaySeconds = i * 20;
        const publishOptions: any = {
          url: workerUrl,
          body: { fileId: id, language: language },
          retries: 3,
        };
        
        if (delaySeconds > 0) {
          publishOptions.delay = `${delaySeconds}s`;
        }

        const response = await qstashClient.publishJSON(publishOptions);
        results.push(response);
      }
    } else {
      console.warn('[Enqueue] QStash Client uninitialized. Did you forget to set QSTASH_TOKEN?');
      return res.status(500).json({ error: 'QSTASH_TOKEN is not configured.' });
    }

    return res.status(200).json({ 
      success: true, 
      enqueued: fileIds.length,
      qstashResults: results 
    });

  } catch (error: any) {
    console.error('[Enqueue API Error]:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
