-- =============================================
-- TUC-PRAS: Gemini API 用量監控擴充腳本
-- 請將此腳本貼入 Supabase 的 SQL Editor 並執行
-- =============================================

-- 1. 確保 tuc_usage_stats 資料表存在（如果尚未建立）
CREATE TABLE IF NOT EXISTS public.tuc_usage_stats (
    stat_date DATE PRIMARY KEY,
    qstash_calls_today INTEGER DEFAULT 0,
    estimated_egress_bytes BIGINT DEFAULT 0,
    last_ai_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. 新增 Gemini API 用量監控相關欄位 (如果已存在則忽略)
ALTER TABLE public.tuc_usage_stats ADD COLUMN IF NOT EXISTS gemini_rpd_today INTEGER DEFAULT 0;
ALTER TABLE public.tuc_usage_stats ADD COLUMN IF NOT EXISTS gemini_rpm_current INTEGER DEFAULT 0;
ALTER TABLE public.tuc_usage_stats ADD COLUMN IF NOT EXISTS gemini_rpm_last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. 建立或更新原子遞增 RPC 函式 (Stored Procedure)
-- 此函式將會自動處理每日清零、每分鐘清零與計數累加，並記錄最後使用的模型
CREATE OR REPLACE FUNCTION increment_gemini_usage(p_model_name TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
    -- V28.x: 直接使用 DATE 型別進行比較，修復 column "stat_date" is of type date but expression is of type text 錯誤
    today_date DATE := (timezone('utc'::text, now()))::date;
    -- 取得當前時間截斷至「分鐘」
    current_minute TIMESTAMP WITH TIME ZONE := date_trunc('minute', now());
    v_last_update TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 確保今日資料列存在，若無則建立
    INSERT INTO public.tuc_usage_stats (stat_date, gemini_rpd_today, gemini_rpm_current, gemini_rpm_last_update, last_ai_model)
    VALUES (today_date, 0, 0, now(), p_model_name)
    ON CONFLICT (stat_date) DO NOTHING;

    -- 取出目前的 last_update 以判斷 RPM 是否跨越了分鐘界線
    SELECT gemini_rpm_last_update INTO v_last_update 
    FROM public.tuc_usage_stats 
    WHERE stat_date = today_date;

    -- 原子更新：更新 RPD (無條件 + 1) 與 RPM (同分鐘 + 1，不同分鐘重置為 1)
    UPDATE public.tuc_usage_stats
    SET 
        gemini_rpd_today = COALESCE(gemini_rpd_today, 0) + 1,
        gemini_rpm_current = CASE 
            WHEN date_trunc('minute', v_last_update) = current_minute THEN COALESCE(gemini_rpm_current, 0) + 1
            ELSE 1
        END,
        gemini_rpm_last_update = now(),
        last_ai_model = COALESCE(p_model_name, last_ai_model)
    WHERE stat_date = today_date;
END;
$$ LANGUAGE plpgsql;

-- 4. 開放 RPC 權限給匿名存取 (Anon) 或授權用戶 (Authenticated)
GRANT EXECUTE ON FUNCTION public.increment_gemini_usage() TO anon, authenticated;
