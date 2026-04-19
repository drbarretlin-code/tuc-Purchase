import React, { useState, useEffect } from 'react';
import { X, CloudUpload, Loader2, ExternalLink, CheckCircle2, History, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as KP from '../lib/knowledgeParser';
import type { FormState } from '../types/form';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: FormState;
}

const UploadWizardModal: React.FC<Props> = ({ isOpen, onClose, data }) => {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filesInQueue, setFilesInQueue] = useState(0);
  const [currentUploadingName, setCurrentUploadingName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string, displayName: string}[]>([]);
  const [manualEquipmentName, setManualEquipmentName] = useState(data.equipmentName || '');

  // V6.0: 初始化並讀取雲端檔案歷史
  useEffect(() => {
    if (isOpen) {
      setManualEquipmentName(data.equipmentName || '');
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
          console.error('無法讀取檔案歷史:', err);
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
    setFilesInQueue(fileList.length);
    const userApiKey = localStorage.getItem('tuc_gemini_key') || '';
    
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
      
      if (queueError) throw new Error("佇列系統連線失敗: " + queueError.message);

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
            console.log('[佇列等待] 前方尚有任務，5秒後重試...');
            await new Promise(r => setTimeout(r, 5000));
          }
        }
      };
      await waitForTurn();

      // --- 第二階段：重複檢查與清空 (去重機制) ---
      console.log('[去重運算] 偵測並清理歷史重複檔案...');
      for (const file of fileList) {
        // 1. 執行批次查詢，找出所有「同檔名 + 同設備」的舊資料 (不論需求說明是否嚴格匹配)
        const { data: dups } = await client
          .from('tuc_uploaded_files')
          .select('id, storage_path')
          .eq('original_name', file.name)
          .eq('equipment_name', manualEquipmentName || '未命名設備');

        if (dups && dups.length > 0) {
          const idsToRemove = dups.map(d => d.id);
          const pathsToRemove = dups.map(d => d.storage_path);
          
          console.log(`[去重] 發現 ${dups.length} 筆重複檔案，正在進行取代作業...`);
          
          // 批次刪除知識條目
          await client.from('tuc_history_knowledge').delete().eq('source_file_name', file.name);
          // 批次刪除實體檔案
          await client.storage.from('spec-files').remove(pathsToRemove);
          // 批次刪除上傳紀錄
          await client.from('tuc_uploaded_files').delete().in('id', idsToRemove);
        }
      }

      // --- 第三階段：極速併行上傳 ---
      const uploadResults = await Promise.all(fileList.map(async (file) => {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const { error: storageError } = await client.storage.from('spec-files').upload(fileName, file);
        if (storageError) throw storageError;

        const { data: { publicUrl } } = client.storage.from('spec-files').getPublicUrl(fileName);
        const displayName = `${file.name} (${data.requester || '未知'})`;

        await client.from('tuc_uploaded_files').insert({
          original_name: file.name,
          storage_path: fileName,
          public_url: publicUrl,
          display_name: displayName,
          requester: data.requester || '未知',
          equipment_name: manualEquipmentName || '未命名設備',
          requirement_desc: data.requirementDesc || '無需求說明',
          is_parsed: false
        });

        return { file, url: publicUrl, displayName, storagePath: fileName };
      }));

      // --- 第四階段：智慧解析 ---
      const completedNames: string[] = [];
      for (let i = 0; i < uploadResults.length; i++) {
        const { file, url, storagePath } = uploadResults[i];
        setCurrentUploadingName(file.name);
        setFilesInQueue(uploadResults.length - i);

        const result = await KP.processFileToKnowledge(file, userApiKey, manualEquipmentName);
        const finalDetectedEq = result?.detectedEquipment || manualEquipmentName || '未命名設備';
        
        totalAdded += result?.added || 0;
        totalSkipped += result?.skipped || 0;

        // V8.5: 更新檔案主紀錄的設備標籤為 AI 偵測到的結果，並標記已完成解析
        const newDisplayName = `${file.name} (${finalDetectedEq})`;
        await client.from('tuc_uploaded_files')
          .update({ 
            equipment_name: finalDetectedEq, 
            display_name: newDisplayName,
            is_parsed: true,
            parsed_at: new Date().toISOString()
          })
          .eq('original_name', file.name)
          .eq('storage_path', storagePath);

        completedNames.push(file.name);
        localStorage.setItem('tuc_active_upload_job', JSON.stringify({ total: fileList.length, completed: completedNames }));
        newUploads.push({ name: file.name, url, displayName: newDisplayName });
        setUploadProgress(Math.round(((i + 1) / uploadResults.length) * 100));

        if (i < uploadResults.length - 1) await new Promise(r => setTimeout(r, 2000));
      }

      // --- 第五階段：完成佇列解除 ---
      await client.from('tuc_system_queue').update({ status: 'completed' }).eq('owner_session', sessionId);
      
      // UI 同步優化：先過濾掉舊列表中「同名」的檔案，再加入新上傳的
      setUploadedFiles(prev => {
        const filteredPrev = prev.filter(p => !newUploads.some(n => n.name === p.name));
        return [...filteredPrev, ...newUploads].slice(-10);
      });
      
      localStorage.removeItem('tuc_active_upload_job');
      alert(`檔案上傳解析完成！\n成功：${totalAdded} | 跳過：${totalSkipped}`);

    } catch (err: any) {
      console.error('[佇列錯誤]', err);
      if (client && sessionId) await client.from('tuc_system_queue').update({ status: 'error' }).eq('owner_session', sessionId);
      alert(`程序中斷: ${err.message}`);
    } finally {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setUploadingFile(false);
      setUploadProgress(0);
      setCurrentUploadingName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1300 }}>
      <div className="glass-panel" style={{ width: '90vw', maxWidth: '800px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CloudUpload size={32} color="var(--tuc-red)" />
            <div>
              <h2 style={{ margin: 0 }}>智慧解析與規範歸納</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>上傳歷史 PDF/圖片 規範，AI 將自動萃取技術要點存入知識庫</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn">
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* 左側：上傳與參數設定 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* V8.9: 新增手動修正欄位 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={14} color="var(--tuc-red)" /> 標記設備名稱 (上傳前可修正)
              </label>
              <input 
                type="text"
                value={manualEquipmentName}
                onChange={(e) => setManualEquipmentName(e.target.value)}
                placeholder="輸入目標設備名稱..."
                className="glass-input"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: 'white',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.25s'
                }}
              />
            </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '2px dashed var(--border-color)', 
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              position: 'relative',
              flex: 1,
              minHeight: '220px'
            }}>
            {!uploadingFile ? (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(230,0,18,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <CloudUpload size={32} color="var(--tuc-red)" />
                </div>
                <h3 style={{ margin: 0 }}>選取檔案</h3>
                <p style={{ fontSize: '0.85rem', color: '#666', maxWidth: '200px' }}>支持多檔案同時解析，僅限 PDF 與圖片格式</p>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileUpload}
                  style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </>
            ) : (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <Loader2 size={48} className="spin" color="var(--tuc-red)" style={{ margin: '0 auto 1.5rem' }} />
                <h3 style={{ margin: '0 0 0.5rem' }}>AI 解析中...</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--tuc-red)', fontWeight: 'bold' }}>{currentUploadingName}</p>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.5rem' }}>隊列中剩餘：{filesInQueue} 個任務</p>
                
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--tuc-red)', transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#999', textAlign: 'right' }}>總體進度 {uploadProgress}%</p>
              </div>
            )}
          </div>
        </div>

        {/* 右側：最近上傳紀錄 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <History size={16} /> 最近上傳成果
            </h4>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {uploadedFiles.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>暫無近期歸納紀錄</div>
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
                  <a href={f.url} target="_blank" rel="noreferrer" className="icon-btn" title="查看原始檔">
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(230,0,18,0.05)', borderRadius: '8px', border: '1px solid rgba(230,0,18,0.1)' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tuc-red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={14} /> <b>專家提醒：</b> 系統會自動根據「設備名稱」進行知識分群。解析完成後，您即可在左側對應分頁中看到「TUC 歷史參考 (來自上傳檔案)」的建議條文。
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadWizardModal;
