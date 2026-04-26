import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase configuration missing on server' });
  }

  try {
    // 獲取最新 5 筆統計
    const { data: stats, error: statsErr } = await supabase
      .from('tuc_usage_stats')
      .select('*')
      .order('stat_date', { ascending: false })
      .limit(5);

    // 檢查目前伺服器時間
    const serverTime = new Date().toISOString();
    const serverDate = serverTime.split('T')[0];

    return res.status(200).json({
      success: true,
      server_info: {
        now_iso: serverTime,
        today_utc: serverDate,
        has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      latest_stats: stats,
      error: statsErr
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
