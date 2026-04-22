-- v3.5 支援後端非同步佇列處理的資料庫更新腳本
-- 請於 Supabase 的 SQL Editor 執行此腳本

ALTER TABLE tuc_uploaded_files 
ADD COLUMN IF NOT EXISTS parse_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 說明:
-- parse_status 的值預期為:
-- 'pending' : 檔案已上傳，等待進入佇列或正在佇列中
-- 'processing' : 後端 Worker 正在處理中
-- 'completed' : 解析成功 (等同於原來的 is_parsed = true)
-- 'failed' : 解析失敗
