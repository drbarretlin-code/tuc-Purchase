import { useState, useEffect } from 'react';
import type { FormState } from './types/form';
import { INITIAL_FORM_STATE } from './types/form';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import { ShieldAlert, Cpu, Settings, X, PenTool, BookOpen, Eye, EyeOff, Trash2, Share2, Download, Lock, Save, Database, CloudUpload, Sparkles, Zap } from 'lucide-react';
import { supabase } from './lib/supabase';
import UploadWizardModal from './components/UploadModal';

function App() {
  const [data, setData] = useState<FormState>(() => {
    const savedProfile = localStorage.getItem('tuc_user_profile');
    const initialState = { ...INITIAL_FORM_STATE };
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      initialState.department = profile.department || '';
      initialState.requester = profile.requester || '';
      initialState.extension = profile.extension || '';
      initialState.applicantName = profile.requester || '';
    }
    return initialState;
  });


  useEffect(() => {
    const profile = {
      department: data.department,
      requester: data.requester,
      extension: data.extension
    };
    localStorage.setItem('tuc_user_profile', JSON.stringify(profile));
  }, [data.department, data.requester, data.extension]);

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('tuc_gemini_key') || '');
  const [showConfig, setShowConfig] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isResizing, setIsResizing] = useState(false);
  const [splitPercentage, setSplitPercentage] = useState(45); // 編輯區佔比
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  // V7.1: 補解析與進度條狀態
  const [isReparsing, setIsReparsing] = useState(false);
  const [reparseProgress, setReparseProgress] = useState(0);
  const [reparseCurrentFile, setReparseCurrentFile] = useState('');

  const [mobileAppTab, setMobileAppTab] = useState<'edit' | 'preview'>('edit');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // V6.1 雲端查閱器狀態 (僅保留歷史檔案)
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [showCloudInspector, setShowCloudInspector] = useState(false);
  const [isCloudAuthed, setIsCloudAuthed] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [searchQuery] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !showPreview || isMobile) return;
      const newPercentage = (e.clientX / window.innerWidth) * 100;
      if (newPercentage > 20 && newPercentage < 80) {
        setSplitPercentage(newPercentage);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('unselectable');
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('unselectable');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, showPreview, isMobile]);

  const handleSaveConfig = () => {
    const cleanKey = tempKey.trim();
    setApiKey(cleanKey);
    setTempKey(cleanKey);
    localStorage.setItem('tuc_gemini_key', cleanKey);
    setShowConfig(false);
  };

  const fetchCloudFiles = async () => {
    console.log('[Debug] 正在嘗試獲取雲端歷史檔案...', { supabaseInitialized: !!supabase });
    if (!supabase) {
      console.warn('[Debug] Supabase 客戶端未初始化。請檢查 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY 環境變數。');
      return;
    }
    
    try {
      // 1. 獲取檔案清單
      const { data: list, error: fileError } = await supabase
        .from('tuc_uploaded_files')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fileError) throw fileError;

      // 2. 獲取解析條目統計 (以檔名分群)
      const { data: knowledgeStats, error: countError } = await supabase
        .from('tuc_history_knowledge')
        .select('source_file_name');
      
      if (countError) console.error('無法統計解析條目:', countError);

      const countMap: Record<string, number> = {};
      knowledgeStats?.forEach(item => {
        const name = item.source_file_name;
        countMap[name] = (countMap[name] || 0) + 1;
      });

      // 3. 合併資料
      const enrichedList = (list || []).map(f => ({
        ...f,
        knowledgeCount: countMap[f.original_name] || 0
      }));

      console.log(`[Debug] 查詢成功，找到 ${enrichedList.length} 筆紀錄。`);
      setCloudFiles(enrichedList);
    } catch (err: any) {
      console.error('[Debug] fetchCloudFiles 捕捉到異常:', err.message);
      alert('無法取得檔案紀錄，請檢查網路連線或資料庫權限。');
    }
  };

  const handleOpenInspector = () => {
    if (isCloudAuthed) {
      fetchCloudFiles();
      setShowCloudInspector(true);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handleVerifyPassword = () => {
    if (inputPassword === '3102') {
      setIsCloudAuthed(true);
      setShowPasswordPrompt(false);
      setInputPassword('');
      fetchCloudFiles();
      setShowCloudInspector(true);
    } else {
      alert('密碼錯誤，請重新輸入。');
      setInputPassword('');
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!supabase || !confirm('確定要永久刪除此上傳紀錄嗎？')) return;
    try {
      const { error } = await supabase.from('tuc_uploaded_files').delete().eq('id', id);
      if (error) throw error;
      setCloudFiles(prev => prev.filter(f => f.id !== id));
      alert('刪除成功');
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!supabase || !confirm('系統將自動掃描資料庫中「檔名與設備相同」的重複項，僅保留最新的一筆紀錄。\n此操作將同步清理實體檔案與解析紀錄，確定執行嗎？')) return;
    
    try {
      // 1. 獲取所有紀錄
      const { data: allFiles, error: fetchError } = await supabase
        .from('tuc_uploaded_files')
        .select('id, original_name, equipment_name, created_at, storage_path')
        .order('created_at', { ascending: false });

      if (fetchError || !allFiles) throw fetchError;

      // 2. 演算法辨識重複項 (保留每組的第一筆，即最新的)
      const seen = new Set<string>();
      const toDelete: { id: string, path: string, name: string }[] = [];

      allFiles.forEach(bit => {
        const key = `${bit.original_name}_${bit.equipment_name}`;
        if (seen.has(key)) {
          toDelete.push({ id: bit.id, path: bit.storage_path, name: bit.original_name });
        } else {
          seen.add(key);
        }
      });

      if (toDelete.length === 0) {
        alert('目前資料庫非常整潔，未偵測到任何重複檔案。');
        return;
      }

      // 3. 執行批次清理
      const idsToRemove = toDelete.map(d => d.id);
      const pathsToRemove = toDelete.map(d => d.path);
      const namesToRemove = Array.from(new Set(toDelete.map(d => d.name)));

      // 清理關聯知識庫 (以檔名為準)
      for (const name of namesToRemove) {
        await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', name);
      }
      // 清理 Storage 實體
      await supabase.storage.from('spec-files').remove(pathsToRemove);
      // 清理資料庫紀錄
      await supabase.from('tuc_uploaded_files').delete().in('id', idsToRemove);

      alert(`清理完成！已移除 ${toDelete.length} 筆重複紀錄。`);
      fetchCloudFiles(); // 重新整理列表
    } catch (err: any) {
      console.error('清理失敗:', err);
      alert('清理過程發生錯誤: ' + err.message);
    }
  };

  const handleAutofixLabels = async () => {
    if (!supabase || !confirm('系統將分析全課檔案內容，自動辨識並校準正確的「設備標籤」。\n這將修正如「大明剪床」被誤植至 RTO 等錯誤關聯，確定執行嗎？')) return;

    setIsReparsing(true);
    setReparseProgress(0);
    const userApiKey = localStorage.getItem('tuc_gemini_key') || '';

    try {
      const { data: allFiles } = await supabase.from('tuc_uploaded_files').select('*');
      if (!allFiles) return;

      for (let i = 0; i < allFiles.length; i++) {
        const fileRecord = allFiles[i];
        setReparseCurrentFile(fileRecord.original_name);

        try {
          const resp = await fetch(fileRecord.public_url);
          const blob = await resp.blob();
          const fileObj = new File([blob], fileRecord.original_name, { type: blob.type });

          const result = await KP.processFileToKnowledge(fileObj, userApiKey, fileRecord.equipment_name);
          const newLabel = result?.detectedEquipment || fileRecord.equipment_name;

          if (newLabel && newLabel !== fileRecord.equipment_name) {
            const newDisplayName = `${fileRecord.original_name} (${newLabel})`;
            // 1. 更新檔案紀錄
            await supabase.from('tuc_uploaded_files')
              .update({ equipment_name: newLabel, display_name: newDisplayName })
              .eq('id', fileRecord.id);

            // 2. 更新知識條目 (Metadata 中的標籤)
            // 先獲取舊條目，手動更新 JSONB
            const { data: entries } = await supabase
              .from('tuc_history_knowledge')
              .select('id, metadata')
              .eq('source_file_name', fileRecord.original_name);
            
            if (entries) {
              for (const entry of entries) {
                const newMetadata = { ...entry.metadata, equipment_name: newLabel };
                await supabase.from('tuc_history_knowledge').update({ metadata: newMetadata }).eq('id', entry.id);
              }
            }
          }
        } catch (e) {
          console.error(`校準檔案 ${fileRecord.original_name} 失敗:`, e);
        }

        setReparseProgress(Math.round(((i + 1) / allFiles.length) * 100));
        if (i < allFiles.length - 1) await new Promise(r => setTimeout(r, 2000));
      }

      alert('AI 標籤校準完成！所有歷史檔案已根據內容重新歸類。');
      fetchCloudFiles();
    } catch (err: any) {
      alert('校準過程出錯: ' + err.message);
    } finally {
      setIsReparsing(false);
      setReparseProgress(0);
      setReparseCurrentFile('');
    }
  };

  const handleExportAll = (format: 'csv') => {
    // ... (existing export logic)
  };

  const handleReparseAll = async () => {
    const targets = cloudFiles.filter(f => (f as any).knowledgeCount === 0);
    
    if (targets.length === 0) {
      alert('所有檔案都已經解析完成，無須補解析。');
      return;
    }

    if (!confirm(`偵測到 ${targets.length} 筆檔案尚未解析或無條目紀錄，確定要一鍵自動補解析嗎？\n(解析過程將消耗 AI 配額，請勿關閉視窗)`)) return;

    setIsReparsing(true);
    setReparseProgress(0);
    const userApiKey = localStorage.getItem('tuc_gemini_key') || '';

    try {
      for (let i = 0; i < targets.length; i++) {
        const fileRecord = targets[i];
        setReparseCurrentFile(fileRecord.original_name);
        
        try {
          // 1. 下載雲端檔案
          const response = await fetch(fileRecord.public_url);
          const blob = await response.blob();
          const fileObj = new File([blob], fileRecord.original_name, { type: blob.type });

          // 2. 驅動 AI 解析引擎
          await KP.processFileToKnowledge(fileObj, userApiKey, fileRecord.equipment_name);
          
          // 3. 更新進度
          setReparseProgress(Math.round(((i + 1) / targets.length) * 100));
        } catch (fileErr) {
          console.error(`檔案 ${fileRecord.original_name} 解析失敗:`, fileErr);
        }

        // 為了避免頻控，間隔 2 秒
        if (i < targets.length - 1) await new Promise(r => setTimeout(r, 2000));
      }

      alert('批次補解析任務已完成！');
      fetchCloudFiles(); // 重新整理列表，更新計數
    } catch (err: any) {
      alert('批次處理出錯: ' + err.message);
    } finally {
      setIsReparsing(false);
      setReparseProgress(0);
      setReparseCurrentFile('');
    }
  };
  const handleExportAll = (format: 'csv') => {
    const list = cloudFiles;
    const content = "ID,原檔名,設備名稱,申請人,日期\n" + list.map(f => `"${f.id}","${f.original_name}","${f.equipment_name}","${f.requester}","${new Date(f.created_at).toLocaleString()}"`).join("\n");
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cloud_Files_Export_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareAll = () => {
    const count = cloudFiles.length;
    const text = `【台燿採購規範雲端歷史上傳檔案清單】\n目前共計 ${count} 筆。\n更新日期：${new Date().toLocaleString()}`;
    navigator.clipboard.writeText(text).then(() => alert('已複製彙總資訊到剪貼簿'));
  };

  const handleDeleteApiKey = () => {
    if (confirm('確定要刪除 API Key 嗎？')) {
      setTempKey('');
      setApiKey('');
      localStorage.removeItem('tuc_gemini_key');
    }
  };

  const filteredFiles = cloudFiles.filter(f => 
    (f.display_name || '').includes(searchQuery) ||
    (f.equipment_name || '').includes(searchQuery) ||
    (f.requester || '').includes(searchQuery)
  );

  return (
    <div className="app-container" style={{ padding: isMobile ? '0.5rem' : '1rem', maxWidth: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.5rem' : '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
          <div style={{ background: 'var(--tuc-red)', width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu color="white" size={isMobile ? 16 : 20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>TUC PRAS</h1>
            {!isMobile && <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>採購驗收建置系統 v6.1</p>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isMobile && (
            <button 
              onClick={() => setShowPreview(!showPreview)} 
              className="icon-btn" 
              style={{ 
                padding: '0.5rem 1rem', 
                background: showPreview ? 'rgba(255,255,255,0.05)' : 'var(--tuc-red)',
                borderColor: showPreview ? '#333' : 'var(--tuc-red)',
                color: 'white'
              }}
            >
               {showPreview ? <span className="header-btn-text">隱藏正式預覽</span> : <span className="header-btn-text">顯示正式預覽</span>}
               {!showPreview && <><PenTool size={16} /> <span className="header-btn-text">顯示預覽</span></>}
            </button>
          )}

          <button onClick={() => setShowConfig(true)} className="icon-btn">
            <Settings size={isMobile ? 18 : 20} />
          </button>
        </div>
      </header>

      <main className="main-grid" style={{ 
        gridTemplateColumns: isMobile ? '100%' : (showPreview ? `${splitPercentage}% 6px 1fr` : '1fr 0px 0px'), 
        gap: 0,
        flex: 1, 
        overflow: 'hidden',
        paddingBottom: isMobile ? '70px' : '0'
      }}>
        {(!isMobile || mobileAppTab === 'edit') && (
          <div style={{ minWidth: 0, height: '100%', overflow: 'hidden' }}>
            <SpecForm data={data} onChange={setData} />
          </div>
        )}

        {!isMobile && showPreview && (
          <div 
            className={`layout-resizer ${isResizing ? 'active' : ''}`} 
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {(!isMobile || mobileAppTab === 'preview') && (
          <div style={{ 
            minWidth: 0,
            height: '100%',
            opacity: (!isMobile && !showPreview) ? 0 : 1, 
            pointerEvents: (!isMobile && !showPreview) ? 'none' : 'auto',
            transition: (isResizing || isMobile) ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'auto',
            background: isMobile ? 'white' : 'transparent',
            position: 'relative'
          }}>
            {/* V7.0: 資料庫管理入口遷移至此 */}
            {!isMobile && showPreview && (
              <div style={{ position: 'sticky', top: 0, right: 0, zIndex: 10, padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={16} /> 正式預覽區
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setShowUploadWizard(true)} 
                    className="icon-btn" 
                    title="智慧解析與規範歸納"
                    style={{ color: '#60A5FA', border: '1px solid rgba(96,165,250,0.3)', padding: '4px 8px' }}
                  >
                    <CloudUpload size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>歸納工具</span>
                  </button>
                  <button 
                    onClick={handleOpenInspector} 
                    className="icon-btn" 
                    title="資料庫與歷史檔案管理"
                    style={{ color: 'var(--tuc-red)', border: '1px solid rgba(230,0,18,0.3)', padding: '4px 8px' }}
                  >
                    <Database size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>資料管理</span>
                  </button>
                </div>
              </div>
            )}
            <SpecPreview data={data} />
          </div>
        )}
      </main>

      {isMobile && (
        <nav className="bottom-nav">
          <button 
            className={`nav-tab ${mobileAppTab === 'edit' ? 'active' : ''}`}
            onClick={() => setMobileAppTab('edit')}
          >
            <PenTool size={22} />
            編輯內容
          </button>
          <button 
            className={`nav-tab ${mobileAppTab === 'preview' ? 'active' : ''}`}
            onClick={() => setMobileAppTab('preview')}
          >
            <BookOpen size={22} />
            查看預覽
          </button>
        </nav>
      )}

      {showConfig && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={24} color="var(--tuc-red)" /> 系統設定
              </h2>
              <button onClick={() => setShowConfig(false)} className="icon-btn">
                <X size={24} />
              </button>
            </div>
            
            <div className="input-with-label">
              <label>Gemini API Key (用於智慧建議)</label>
              <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  value={tempKey} 
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="貼入您的 API Key..."
                  style={{ 
                    flex: 1,
                    borderColor: (tempKey && (!tempKey.startsWith('AIza') || tempKey.length < 30)) ? '#EF4444' : 'var(--border-color)'
                  }}
                />
                <button 
                  onClick={() => setShowApiKey(!showApiKey)} 
                  className="icon-btn" 
                  style={{ padding: '0 8px' }}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />} 
                </button>
                <button 
                  onClick={handleDeleteApiKey} 
                  className="icon-btn" 
                  style={{ padding: '0 8px', color: '#EF4444' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <button className="primary-button" onClick={handleSaveConfig} style={{ width: '100%', padding: '0.8rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <Save size={18} /> 儲存設定
            </button>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '350px', textAlign: 'center' }}>
            <Lock size={40} color="var(--tuc-red)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 1rem', color: 'white' }}>管理權限驗證</h3>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1.5rem' }}>請輸入查閱管理密碼</p>
            <input 
              type="password" 
              value={inputPassword} 
              onChange={(e) => setInputPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              placeholder="請輸入密碼..."
              autoFocus
              style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="ghost-button" onClick={() => setShowPasswordPrompt(false)} style={{ flex: 1 }}>取消</button>
              <button className="primary-button" onClick={handleVerifyPassword} style={{ flex: 2 }}>確認</button>
            </div>
          </div>
        </div>
      )}

      {showCloudInspector && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '90vw', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={24} color="var(--tuc-red)" /> 雲端歷史檔案查閱器
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="ghost-button" onClick={() => handleExportAll('csv')} style={{ fontSize: '0.8rem' }}>
                  <Download size={16} /> 匯出 CSV
                </button>
                <button className="ghost-button" onClick={handleShareAll} style={{ fontSize: '0.8rem' }}>
                  <Share2 size={16} /> 分享清單
                </button>
                <button 
                  className="ghost-button" 
                  onClick={handleCleanupDuplicates} 
                  style={{ fontSize: '0.8rem', color: '#FBBF24', borderColor: 'rgba(251,191,36,0.3)' }}
                  title="一鍵清理重複檔案"
                >
                  <Sparkles size={16} /> <span className="header-btn-text">清理重複</span>
                </button>
                <button 
                  className="ghost-button" 
                  onClick={handleReparseAll} 
                  disabled={isReparsing}
                  style={{ 
                    fontSize: '0.8rem', 
                    color: '#60A5FA', 
                    borderColor: 'rgba(96,165,250,0.3)',
                    opacity: isReparsing ? 0.5 : 1
                  }}
                  title="補齊未解析檔案的條目"
                >
                  <Zap size={16} /> <span className="header-btn-text">一鍵補解析</span>
                </button>
                <button 
                  className="ghost-button" 
                  onClick={handleAutofixLabels} 
                  disabled={isReparsing}
                  style={{ 
                    fontSize: '0.8rem', 
                    color: '#10B981', 
                    borderColor: 'rgba(16,185,129,0.3)',
                    opacity: isReparsing ? 0.5 : 1
                  }}
                  title="由 AI 重新掃描文件內容並校準設備標籤"
                >
                  <ShieldAlert size={16} /> <span className="header-btn-text">AI 標籤校準</span>
                </button>
                <button onClick={() => setShowCloudInspector(false)} className="icon-btn">
                  <X size={24} />
                </button>
              </div>
            </div>

            {isReparsing && (
              <div style={{ 
                background: 'rgba(96,165,250,0.05)', 
                border: '1px solid rgba(96,165,250,0.2)', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={14} className="spin" /> 正在重新解析: <b>{reparseCurrentFile}</b>
                  </span>
                  <span style={{ color: '#888' }}>整體進度 {reparseProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${reparseProgress}%`, height: '100%', background: '#60A5FA', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 10 }}>
                  <tr style={{ color: '#888', fontSize: '0.9rem' }}>
                    <th style={{ textAlign: 'left', padding: '12px', width: '60px' }}>項次</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>顯示名稱</th>
                    <th style={{ textAlign: 'left', padding: '12px', width: '120px' }}>解析狀態</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>上傳人</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>日期</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#555' }}>目前無任何歷史上傳檔案</td></tr>
                  ) : filteredFiles.map((f, idx) => (
                    <tr key={f.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover-row">
                      <td style={{ padding: '12px', color: '#888' }}>{idx + 1}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ color: 'white' }}>{f.display_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#555' }}>{f.equipment_name}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {(f as any).knowledgeCount > 0 ? (
                          <span style={{ 
                            padding: '2px 8px', 
                            background: 'rgba(16,185,129,0.1)', 
                            color: '#10B981', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem',
                            border: '1px solid rgba(16,185,129,0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Zap size={10} /> 已解析 ({(f as any).knowledgeCount} 條)
                          </span>
                        ) : (
                          <span style={{ 
                            padding: '2px 8px', 
                            background: 'rgba(245,158,11,0.1)', 
                            color: '#F59E0B', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem',
                            border: '1px solid rgba(245,158,11,0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            未偵測到條目
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#bbb' }}>{f.requester}</td>
                      <td style={{ padding: '12px', color: '#888', fontSize: '0.8rem' }}>{new Date(f.created_at).toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="icon-btn" onClick={() => window.open(f.public_url)} title="開新分頁檢視">
                            <Eye size={16} />
                          </button>
                          <button className="icon-btn" onClick={() => handleDeleteFile(f.id)} style={{ color: '#EF4444' }} title="刪除紀錄">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
              共計 {cloudFiles.length} 筆紀錄
            </div>
          </div>
        </div>
      )}

      <UploadWizardModal 
        isOpen={showUploadWizard} 
        onClose={() => setShowUploadWizard(false)} 
        data={data} 
      />
    </div>
  );
}

export default App;
