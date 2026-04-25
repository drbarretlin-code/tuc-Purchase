-- v3.4 歷史檔案紀錄腳本
-- 用於紀錄歸納解析過的所有原始檔案元數據，確保跨 Session 持久化

CREATE TABLE IF NOT EXISTS tuc_uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  requester VARCHAR(100),
  equipment_name VARCHAR(255),
  equipment_tags TEXT[] DEFAULT '{}',
  is_parsed BOOLEAN DEFAULT FALSE,
  is_calibrated BOOLEAN DEFAULT FALSE,
  parse_status VARCHAR(50) DEFAULT 'unparsed',
  file_size BIGINT DEFAULT 0,
  extracted_text TEXT,
  parsed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 開放匿名讀取與寫入權限
ALTER TABLE tuc_uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public insert" ON tuc_uploaded_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all public select" ON tuc_uploaded_files FOR SELECT USING (true);
CREATE POLICY "Allow all public update" ON tuc_uploaded_files FOR UPDATE USING (true);
CREATE POLICY "Allow all public delete" ON tuc_uploaded_files FOR DELETE USING (true);
