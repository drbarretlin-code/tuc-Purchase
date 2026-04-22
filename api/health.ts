import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 檢查各項環境變數是否存在 (只回傳 boolean，不回傳真實金鑰以保證安全)
  const envStatus = {
    QSTASH_TOKEN_CONFIGURED: !!process.env.QSTASH_TOKEN,
    QSTASH_URL_CONFIGURED: !!process.env.QSTASH_URL,
    SERVER_GEMINI_API_KEY_CONFIGURED: !!process.env.SERVER_GEMINI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY_CONFIGURED: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_URL_CONFIGURED: !!process.env.VITE_SUPABASE_URL || !!process.env.SUPABASE_URL,
  };

  const allPassed = Object.values(envStatus).every(status => status === true);

  return res.status(200).json({
    status: allPassed ? '✅ All Systems Operational' : '⚠️ Missing Environment Variables',
    timestamp: new Date().toISOString(),
    environment_checks: envStatus,
    instructions: allPassed 
      ? '環境變數均已設定，您可以開始測試上傳檔案了！' 
      : '請至 Vercel 後台將顯示 false 的變數補齊後，重新部署 (Redeploy)。'
  });
}
