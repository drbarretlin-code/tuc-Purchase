-- v3.3 歷史知識庫擴展腳本
-- 用於儲存從過往檔案中提取的技術規範內容

CREATE TABLE IF NOT EXISTS tuc_history_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL, -- 如: 'appearance', 'safety', 'install'
  content TEXT NOT NULL,
  source_file_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 開放匿名讀取與寫入權限 (配合當前開發階段)
ALTER TABLE tuc_history_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public insert" ON tuc_history_knowledge FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all public select" ON tuc_history_knowledge FOR SELECT USING (true);
CREATE POLICY "Allow all public update" ON tuc_history_knowledge FOR UPDATE USING (true);
CREATE POLICY "Allow all public delete" ON tuc_history_knowledge FOR DELETE USING (true);
