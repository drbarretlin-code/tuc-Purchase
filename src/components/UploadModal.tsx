import React, { useState, useEffect } from 'react';
import { X, CloudUpload, Loader2, ExternalLink, CheckCircle2, History, Zap, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';
import type { FormState } from '../types/form';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  data: FormState;
  language: Language;
}

const UploadWizardModal: React.FC<Props> = ({ isOpen, onClose, onMinimize, isMinimized, data, language }) => {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filesInQueue, setFilesInQueue] = useState(0);
  const [currentUploadingName, setCurrentUploadingName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string, displayName: string}[]>([]);

  // V6.0: 初始化並讀取雲端檔案歷史
  useEffect(() => {
    if (isOpen) {
      const fetchFileHistory = async () => {
        if (!supabase) return;
        try {
          const { data: list, error } = await supabase
            .from('tuc_uploaded_files')
            .select('original_name, public_url, display_name')
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (!error && list) {
            setUploadedFiles(list.map(f => ({
              name: f.original_name,
              url: f.public_url,
              displayName: f.display_name
            })));
          }
        } catch (err) {
          console.error('Fetch file history failed:', err);
        }
      };
      fetchFileHistory();
    }
  }, [isOpen, data.equipmentName]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const client = supabase;
    if (!files || files.length === 0 || !client) return;

    const fileList = Array.from(files) as File[];
    setUploadingFile(true);
    setUploadProgress(0);
    setCurrentUploadingName('');
    setFilesInQueue(fileList.length);
    
    // V7.0: 產生單次工作唯一的 Session ID 用於佇列識別
    const sessionId = Math.random().toString(36).substring(2, 10);
    
    // 初始化中斷追蹤
    localStorage.setItem('tuc_active_upload_job', JSON.stringify({
      total: fileList.length,
      completed: []
    }));

    // 防誤關閉視窗
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    try {
      const newUploads: {name: string, url: string, displayName: string}[] = [];
      let totalAdded = 0;
      let totalSkipped = 0;

      // --- 第一階段：佇列排隊 (協作式調度) ---
      const { error: queueError } = await client.from('tuc_system_queue').insert({
        job_tag: `Upload_${fileList.length}_files`,
        owner_session: sessionId,
        status: 'queued'
      });
      
      if (queueError) throw new Error(`${t('queueError', language)}: ` + queueError.message);

      const waitForTurn = async () => {
        let isMyTurn = false;
        while (!isMyTurn) {
          const { data: activeJobs } = await client
            .from('tuc_system_queue')
            .select('*')
            .in('status', ['queued', 'processing'])
            .order('created_at', { ascending: true });
          
          if (activeJobs && activeJobs[0]?.owner_session === sessionId) {
            isMyTurn = true;
            await client.from('tuc_system_queue').update({ status: 'processing' }).eq('owner_session', sessionId);
          } else {
            console.log('[Queue Waiting] Jobs ahead, retrying in 5s...');
            await new Promise(r => setTimeout(r, 5000));
          }
        }
      };
      await waitForTurn();

      // --- 第二階段：重複檢查與清空 (去重機制) ---
      console.log('[Deduplication] Checking and cleaning duplicates...');
      for (const file of fileList) {
        // 1. 執行批次查詢，找出所有「同檔名 + 同設備」的舊資料 (不論需求說明是否嚴格匹配)
        const { data: dups } = await client
          .from('tuc_uploaded_files')
          .select('id, storage_path')
          .eq('original_name', file.name)
          .contains('equipment_tags', [data.equipmentName || t('unnamedEq', language)]);

        if (dups && dups.length > 0) {
          const idsToRemove = dups.map(d => d.id);
          const pathsToRemove = dups.map(d => d.storage_path);
          
          console.log(`[Deduplication] Found ${dups.length} duplicates, replacing...`);
          
          // 批次刪除知識條目
          await client.from('tuc_history_knowledge').delete().eq('source_file_name', file.name);
          // 批次刪除實體檔案
          await client.storage.from('spec-files').remove(pathsToRemove);
          // 批次刪除上傳紀錄
          await client.from('tuc_uploaded_files').delete().in('id', idsToRemove);
        }
      }

      // --- 第三階段：極速併行上傳 ---
      const maxSizeBytes = 50 * 1024 * 1024; // 50MB
      
      const rawUploadResults = await Promise.all(fileList.map(async (file) => {
        try {
          if (file.size > maxSizeBytes) {
            throw new Error(`File size ${Math.round(file.size/1024/1024)}MB exceeds 50MB limit`);
          }

          // V27.16: 清除副檔名之後的冗餘名稱（如 .pdf.PDF.PDF），只保留第一個正規副檔名
          let cleanFileName = file.name;
          const extMatch = cleanFileName.match(/^(.+?\.(?:pdf|docx?|xlsx?|pptx?|jpe?g|png|txt|csv|rtf))(?:\.[a-zA-Z0-9]+)*$/i);
          if (extMatch) {
            cleanFileName = extMatch[1];
          }

          const ext = cleanFileName.split('.').pop() || 'pdf';
          const storageFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
          const { error: storageError } = await client.storage.from('spec-files').upload(storageFileName, file);
          if (storageError) throw storageError;

          const { data: { publicUrl } } = client.storage.from('spec-files').getPublicUrl(storageFileName);
          const displayName = `${cleanFileName} (${data.requester || t('unknown', language)})`;

          const { data: inserted, error: insertError } = await client.from('tuc_uploaded_files').insert({
            original_name: cleanFileName,
            storage_path: storageFileName,
            public_url: publicUrl,
            display_name: displayName,
            requester: data.requester || t('unknown', language),
            equipment_tags: [data.equipmentName || t('unnamedEq', language)],
            requirement_desc: data.requirementDesc || t('noReqDesc', language),
            is_parsed: false,
            parse_status: 'pending', // 標記為等待解析中
            file_size: file.size
          }).select('id').single();
  
          if (insertError) throw insertError;
  
          return { file, url: publicUrl, displayName, storagePath: storageFileName, id: inserted.id };
        } catch (err: any) {
          console.warn(`[Skip] File upload failed for ${file.name}: ${err.message}`);
          return { file, error: err.message };
        }
      }));

      // 過濾出上傳成功的檔案進入解析
      const uploadResults = rawUploadResults.filter((r): r is { file: File, url: string, displayName: string, storagePath: string, id: string } => !('error' in r));
      const failedUploadsCount = fileList.length - uploadResults.length;
      
      totalAdded = uploadResults.length;
      totalSkipped = failedUploadsCount;

      if (failedUploadsCount > 0) {
        console.warn(`[Upload Warning] ${failedUploadsCount} files were skipped due to size limits or upload errors.`);
      }

      // --- 第四階段：推送至後端解析佇列 ---
      setCurrentUploadingName(t('pushingToQueue', language));
      const fileIdsToEnqueue = uploadResults.map(r => r.id);
      if (fileIdsToEnqueue.length > 0) {
        try {
          const res = await fetch('/api/enqueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              fileIds: fileIdsToEnqueue,
              language: language 
            })
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('[Enqueue API Error Details]:', errorData);
            let errMsg = errorData.details || errorData.error || 'Enqueue API failed';
            if (typeof errMsg === 'string' && (errMsg.includes('QstashDailyRatelimitError') || errMsg.includes('Exceeded daily rate limit'))) {
              errMsg = '已觸及背景排程服務 (QStash) 的免費版每日佇列上限 (1000筆)。您的配額將於隔日早上 08:00 自動刷新。';
            }
            throw new Error(errMsg);
          }
          console.log('[Queue] 檔案已成功送入背景佇列');
        } catch (err: any) {
          console.error('[Queue Error]', err);
          alert(`將檔案送入背景解析佇列時發生錯誤：\n${err.message || '未知錯誤'}\n請稍後至雲端歷史查閱器手動重試。`);
        }
      }

      uploadResults.forEach(({ file, url, displayName }) => {
        newUploads.push({ name: file.name, url, displayName });
      });
      setUploadProgress(100);

      // --- 第五階段：完成佇列解除 ---
      await client.from('tuc_system_queue').update({ status: 'completed' }).eq('owner_session', sessionId);
      
      // UI 同步優化：先過濾掉舊列表中「同名」的檔案，再加入新上傳的
      setUploadedFiles(prev => {
        const filteredPrev = prev.filter(p => !newUploads.some(n => n.name === p.name));
        return [...filteredPrev, ...newUploads].slice(-10);
      });
      
      localStorage.removeItem('tuc_active_upload_job');
      alert(`${t('uploadComplete', language)}\n${t('successCount', language)}：${totalAdded} | ${t('skippedCount', language)}：${totalSkipped}`);

    } catch (err: any) {
      console.error('[佇列錯誤]', err);
      if (client && sessionId) await client.from('tuc_system_queue').update({ status: 'error' }).eq('owner_session', sessionId);
      alert(`${t('interrupted', language)}: ${err.message}`);
    } finally {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setUploadingFile(false);
      setUploadProgress(0);
      setCurrentUploadingName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1300, display: isMinimized ? 'none' : 'flex' }}>
      <div className="glass-panel" style={{ width: '90vw', maxWidth: '800px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CloudUpload size={32} color="var(--tuc-red)" />
            <div>
              <h2 style={{ margin: 0 }}>{t('wizardTitle', language)}</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('wizardDesc', language)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onMinimize} className="icon-btn" title={t('minimizeTip', language)}>
              <Minus size={20} />
            </button>
            <button onClick={onClose} className="icon-btn">
              <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* 左側：上傳區 */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '2px dashed var(--border-color)', 
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            minHeight: '300px'
          }}>
            {!uploadingFile ? (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(230,0,18,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <CloudUpload size={32} color="var(--tuc-red)" />
                </div>
                <h3 style={{ margin: 0 }}>{t('selectFile', language)}</h3>
                <p style={{ fontSize: '0.85rem', color: '#666', maxWidth: '300px' }}>{t('supportFiles', language)}</p>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={handleFileUpload}
                  style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </>
            ) : (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <Loader2 size={48} className="spin" color="var(--tuc-red)" style={{ margin: '0 auto 1.5rem' }} />
                <h3 style={{ margin: '0 0 0.5rem' }}>{t('aiParsing', language)}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--tuc-red)', fontWeight: 'bold' }}>{currentUploadingName}</p>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.5rem' }}>{t('queueRemaining', language)}{filesInQueue} {t('items', language)}</p>
                
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--tuc-red)', transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#999', textAlign: 'right' }}>{t('totalProgress', language)} {uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* 右側：最近上傳紀錄 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <History size={16} /> {t('recentUploads', language)}
            </h4>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {uploadedFiles.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>{t('noRecentRecords', language)}</div>
              ) : uploadedFiles.map((f, i) => (
                <div key={i} style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.displayName}</span>
                  </div>
                  <a href={f.url} target="_blank" rel="noreferrer" className="icon-btn" title={t('viewOriginal', language)}>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(230,0,18,0.05)', borderRadius: '8px', border: '1px solid rgba(230,0,18,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tuc-red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={14} /> <b>{t('expertTip', language)}</b> {t('jsonStored', language)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadWizardModal;
