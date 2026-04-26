import { Client } from '@upstash/qstash';
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase (用於統計日誌) - 優先使用 Vercel 與 Service Role 金鑰
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
if (!supabase) console.warn('[QStash Rotator] 警告：未偵測到 Supabase 配置，用量統計日誌將無法寫入。');

/**
 * 瀑布式備援輪替引擎 (Waterfall Rotation Engine)
 * 讀取 QSTASH_TOKEN, QSTASH_TOKEN_1, QSTASH_TOKEN_2...
 * 並在遭遇 429 額度耗盡時，自動無縫切換到下一把金鑰進行重試。
 */

// 1. 蒐集所有合法的金鑰
function getAvailableTokens(): string[] {
  const tokens: string[] = [];
  
  // 按照優先順序讀取 (也可隨需求增加至更多)
  const envVars = ['QSTASH_TOKEN', 'QSTASH_TOKEN_1', 'QSTASH_TOKEN_2', 'QSTASH_TOKEN_3'];
  
  for (const envKey of envVars) {
    if (process.env[envKey]) {
      tokens.push(process.env[envKey] as string);
    }
  }
  
  return Array.from(new Set(tokens)); // 去除可能重複貼上的相同金鑰
}

export async function publishWithRotation(publishOptions: any): Promise<any> {
  const tokens = getAvailableTokens();
  
  if (tokens.length === 0) {
    throw new Error('系統設定錯誤：找不到任何有效的 QSTASH_TOKEN 環境變數。');
  }

  let lastError: any = null;

  for (let i = 0; i < tokens.length; i++) {
    const currentToken = tokens[i];
    try {
      const client = new Client({ token: currentToken });
      
      const response = await client.publishJSON({
        url: publishOptions.url,
        body: publishOptions.body,
        delay: publishOptions.delay ? parseInt(publishOptions.delay) : undefined,
        retries: publishOptions.retries,
      });

      // V26.18: 寫入用量日誌 (加入 try-catch 保護)
      if (supabase) {
        const modelId = (publishOptions.body as any)?.modelId || null;
        try {
          const { error: rpcErr } = await supabase.rpc('increment_qstash_usage', { 
            bytes_count: 15 * 1024,
            model_name: modelId
          });
          
          if (rpcErr) {
            try { await supabase.rpc('increment_qstash_usage', { bytes_count: 15 * 1024 }); } catch {}
          }
        } catch (rpcCatch: any) {
          console.error('[QStash Log] 統計寫入異常:', rpcCatch.message);
        }
      }

      return response;
      
    } catch (err: any) {
      lastError = err;
      
      // 判斷是否為「額度超額」或者是「驗證失敗(通常代表舊Token已被刪除)」
      const errMsg = err.message || '';
      const isQuotaError = errMsg.includes('DailyRatelimitError') || errMsg.includes('429');
      const isAuthError = errMsg.includes('Unauthorized') || errMsg.includes('401');
      
      if (isQuotaError || isAuthError) {
        console.error(`[QStash Rotator] 金鑰索引 ${i} 發生額度耗盡或無效 (${errMsg})，啟動瀑布備援：嘗試切換至下一把金鑰...`);
        continue; // 嘗試下一個 Token
      } else {
        // 如果是其他的系統或網路嚴重錯誤 (500 等)，就不要隨便更換金鑰，直接向上拋出交給 Vercel/Qstash 的 Retries 處理
        throw err;
      }
    }
  }

  // 若經過迴圈依然無法成功，代表所有「錢包」都已經空了！
  console.error(`[QStash Rotator] 災難性故障：已歷遍全數 ${tokens.length} 組金鑰，但全部皆因配額耗盡而失敗！`);
  throw new Error('已觸及背景排程服務 (QStash) 所有列管金鑰的每日佇列上限。請等待隔日 08:00 重置，或匯入新的免費金鑰。');
}
