import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 環境變數檢查
  const envStatus = {
    QSTASH_TOKEN_CONFIGURED: !!process.env.QSTASH_TOKEN,
    QSTASH_URL_CONFIGURED: !!process.env.QSTASH_URL,
    VITE_GEMINI_API_KEY_CONFIGURED: !!process.env.VITE_GEMINI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY_CONFIGURED: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  // 2. 佇列狀態檢查
  const { data: stats } = await supabase.from('tuc_uploaded_files').select('parse_status');
  const counts = {
    pending: stats?.filter(s => s.parse_status === 'pending').length || 0,
    processing: stats?.filter(s => s.parse_status?.startsWith('processing')).length || 0,
    failed: stats?.filter(s => s.parse_status === 'failed').length || 0,
    completed: stats?.filter(s => s.parse_status === 'completed').length || 0,
  };

  // 3. 偵測潛在死鎖 (V25: 使用 parsed_at 作為心跳判斷)
  const TEN_MINUTES_AGO = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: stuckFiles } = await supabase
    .from('tuc_uploaded_files')
    .select('id, original_name, parse_status, created_at, parsed_at')
    .ilike('parse_status', 'processing%')
    .or(`parsed_at.lt.${TEN_MINUTES_AGO},and(parsed_at.is.null,created_at.lt.${TEN_MINUTES_AGO})`);

  // 4. 取得最近一筆更新的檔案 (模擬 Heartbeat)
  const { data: lastUpdate } = await supabase
    .from('tuc_uploaded_files')
    .select('original_name, parse_status, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  return res.status(200).json({
    status: 'Operational',
    timestamp: new Date().toISOString(),
    environment: envStatus,
    queue_summary: counts,
    potential_deadlocks: stuckFiles?.map(f => ({
      name: f.original_name,
      status: f.parse_status,
      age_minutes: Math.round((Date.now() - new Date(f.parsed_at || f.created_at).getTime()) / 60000)
    })) || [],
    last_file_event: lastUpdate?.[0] || null,
    recommendation: stuckFiles && stuckFiles.length > 0 
      ? '發現卡住的任務，系統背景 Worker 下次啟動時會自動修復。您也可以手動點擊「重新解析」。'
      : counts.processing > 0 
        ? '背景解析正在進行中，請耐心等候。'
        : counts.pending > 0 
          ? '尚有檔案等待解析，若未自動開始，請上傳一個新檔案來喚醒 Worker。'
          : '系統目前處於閒置狀態，一切正常。'
  });
}
