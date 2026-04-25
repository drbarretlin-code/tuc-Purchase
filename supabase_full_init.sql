-- =============================================
-- TUC-PRAS 新 Supabase 專案初始化腳本 (Plan C)
-- 請依照下列順序，全部貼入新專案的 SQL Editor 一次執行
-- =============================================

-- 步驟 1: 基礎規範表
CREATE TABLE IF NOT EXISTS public.specs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    title text DEFAULT '未命名規範表',
    requester text,
    department text,
    form_data jsonb NOT NULL,
    status text DEFAULT 'draft'
);
ALTER TABLE public.specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for specs" ON public.specs
    FOR ALL USING (true) WITH CHECK (true);

-- 步驟 2: Storage Bucket (若 SQL 無法建立，請至 Storage UI 手動建立名為 spec-files 的公開 Bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('spec-files', 'spec-files', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Allow public read-write for storage" ON storage.objects
    FOR ALL USING (bucket_id = 'spec-files') WITH CHECK (bucket_id = 'spec-files');

-- 步驟 3: 歷史知識庫
CREATE TABLE IF NOT EXISTS tuc_history_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  source_file_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE tuc_history_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public insert" ON tuc_history_knowledge FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all public select" ON tuc_history_knowledge FOR SELECT USING (true);
CREATE POLICY "Allow all public update" ON tuc_history_knowledge FOR UPDATE USING (true);
CREATE POLICY "Allow all public delete" ON tuc_history_knowledge FOR DELETE USING (true);

-- 步驟 4: 上傳檔案紀錄表
CREATE TABLE IF NOT EXISTS tuc_uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  requester VARCHAR(100),
  equipment_name VARCHAR(255),
  equipment_tags TEXT[] DEFAULT '{}',
  requirement_desc TEXT,
  is_parsed BOOLEAN DEFAULT FALSE,
  is_calibrated BOOLEAN DEFAULT FALSE,
  parsed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parse_status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  file_size BIGINT DEFAULT 0
);
ALTER TABLE tuc_uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public insert" ON tuc_uploaded_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all public select" ON tuc_uploaded_files FOR SELECT USING (true);
CREATE POLICY "Allow all public update" ON tuc_uploaded_files FOR UPDATE USING (true);
CREATE POLICY "Allow all public delete" ON tuc_uploaded_files FOR DELETE USING (true);

-- 步驟 5: 系統佇列表
CREATE TABLE IF NOT EXISTS tuc_system_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_tag TEXT,
  owner_session TEXT,
  status TEXT DEFAULT 'queued',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE tuc_system_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public" ON tuc_system_queue FOR ALL USING (true) WITH CHECK (true);

-- 步驟 6: 知識條目統計 RPC 函式
CREATE OR REPLACE FUNCTION get_knowledge_counts()
RETURNS TABLE(source_file_name TEXT, count BIGINT) 
LANGUAGE sql STABLE AS $$
  SELECT source_file_name, COUNT(*) as count
  FROM tuc_history_knowledge
  GROUP BY source_file_name;
$$;
