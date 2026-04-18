-- # 台燿規範表系統 - Supabase 初始化腳本
-- 請將此腳本貼入 Supabase 的 SQL Editor 並執行

-- 1. 建立規範表資料表
CREATE TABLE IF NOT EXISTS public.specs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    title text DEFAULT '未命名規範表',
    requester text,
    department text,
    form_data jsonb NOT NULL,
    status text DEFAULT 'draft'
);

-- 2. 建立檔案存儲桶 (Bucket)
-- 注意：這部分通常也可以在 Storage UI 手動建立名為 "spec-files" 的 Bucket
-- 以下 SQL 嘗試建立桶 (如果權限允許)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('spec-files', 'spec-files', true)
ON CONFLICT (id) DO NOTHING;

-- 3. 設定 Row Level Security (RLS) - 初期設定為公開讀寫 (Anon)
ALTER TABLE public.specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for specs" ON public.specs
    FOR ALL USING (true) WITH CHECK (true);

-- 設定 Storage RLS
CREATE POLICY "Allow public read-write for storage" ON storage.objects
    FOR ALL USING (bucket_id = 'spec-files') WITH CHECK (bucket_id = 'spec-files');
