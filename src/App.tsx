import { useState, useEffect } from 'react';
import type { FormState } from './types/form';
import { INITIAL_FORM_STATE } from './types/form';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import { ShieldAlert, Cpu, Settings, X, CloudUpload, PenTool, BookOpen, Eye, EyeOff, Trash2, Share2, Download, Lock, Save } from 'lucide-react';
import { supabase } from './lib/supabase';

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

  const [lastSaved] = useState<string | null>(null);

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
  const [mobileAppTab, setMobileAppTab] = useState<'edit' | 'preview'>('edit');
  const [showApiKey, setShowApiKey] = useState(false);
  const [cloudSpecs, setCloudSpecs] = useState<any[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [showCloudInspector, setShowCloudInspector] = useState(false);
  const [isCloudAuthed, setIsCloudAuthed] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

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


  const fetchCloudSpecs = async () => {
    if (!supabase) return;
    setIsLoadingCloud(true);
    try {
      const { data: list, error } = await supabase
        .from('specs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCloudSpecs(list || []);
    } catch (err) {
      alert('無法取得雲端資料');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleOpenInspector = () => {
    if (isCloudAuthed) {
      fetchCloudSpecs();
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
      fetchCloudSpecs();
      setShowCloudInspector(true);
    } else {
      alert('密碼錯誤，請重新輸入。');
      setInputPassword('');
    }
  };

  const handleDeleteSpec = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('此為系統保護檔案，不可刪除。');
      return;
    }
    if (!supabase || !confirm('確定要永久刪除此筆備份嗎？')) return;
    
    try {
      const { error } = await supabase.from('specs').delete().eq('id', id);
      if (error) throw error;
      setCloudSpecs(prev => prev.filter(s => s.id !== id));
      alert('刪除成功');
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleExportAll = (format: 'json' | 'csv') => {
    const content = format === 'json' 
      ? JSON.stringify(cloudSpecs, null, 2)
      : "ID,標題,單位,申請人,日期\n" + cloudSpecs.map(s => `"${s.id}","${s.title}","${s.department}","${s.requester}","${new Date(s.created_at).toLocaleString()}"`).join("\n");
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cloud_Specs_Export_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
  };

  const handleShareAll = () => {
    const text = `【台燿採購規範雲端備份清單】\n目前共計 ${cloudSpecs.length} 筆備份資料。\n更新日期：${new Date().toLocaleString()}`;
    navigator.clipboard.writeText(text).then(() => alert('已複製彙總資訊到剪貼簿'));
  };

  const handleShareSpec = (spec: any) => {
    const text = `【台燿採購規範分享】\n設備：${spec.title}\n單位：${spec.department}\n申請人：${spec.requester}\n日期：${new Date(spec.created_at).toLocaleDateString()}`;
    navigator.clipboard.writeText(text).then(() => alert('已複製摘要資訊到剪貼簿'));
  };

  const handleDeleteApiKey = () => {
    if (confirm('確定要刪除 API Key 嗎？')) {
      setTempKey('');
      setApiKey('');
      localStorage.removeItem('tuc_gemini_key');
    }
  };

  return (
    <div className="app-container" style={{ padding: isMobile ? '0.5rem' : '1rem', maxWidth: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.5rem' : '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
          <div style={{ background: 'var(--tuc-red)', width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu color="white" size={isMobile ? 16 : 20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>TUC PRAS</h1>
            {!isMobile && <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>採購驗收建置系統 v3.2</p>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isMobile && lastSaved && <span style={{ fontSize: '0.75rem', color: '#4ADE80' }}>上次存檔: {lastSaved}</span>}
          
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
        {/* 手機版：根據切換顯示編輯或預覽 */}
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
            background: isMobile ? 'white' : 'transparent'
          }}>
            <SpecPreview data={data} />
          </div>
        )}
      </main>

      {/* 手機版底部導覽 */}
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

      {/* Config Modal */}
      {showConfig && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={24} color="var(--tuc-red)" /> 系統設定
              </h2>
              <button onClick={() => setShowConfig(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="input-with-label">
              <label>Gemini API Key (用於建議補充)</label>
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
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <button 
                  className="ghost-button" 
                  style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                  onClick={async () => {
                    if (!tempKey) return alert('請先輸入金鑰');
                    const { checkGeminiConnectivity } = await import('./lib/knowledgeParser');
                    const res = await checkGeminiConnectivity(tempKey);
                    alert(res.message);
                  }}
                >
                  <Cpu size={14} style={{ marginRight: '4px' }} /> 測試連線並列出模型
                </button>
                {tempKey && !tempKey.startsWith('AIza') && (
                  <div style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    警告：金鑰應以 "AIza" 開頭
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', marginTop: '4px' }}>
              注意：API Key 會加密儲存在您的瀏覽器本地端。
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CloudUpload size={18} /> 資料庫管理
              </h3>
              <button 
                className="ghost-button" 
                onClick={handleOpenInspector} 
                style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-color)' }}
                disabled={isLoadingCloud}
              >
                {isLoadingCloud ? '讀取中...' : '一鍵查閱雲端備份內容現況'}
              </button>
            </div>
            <button className="primary-button" onClick={handleSaveConfig} style={{ width: '100%', padding: '0.8rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <Save size={18} /> 儲存設定
            </button>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
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

      {/* Enhanced Cloud Inspector Modal */}
      {showCloudInspector && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '90vw', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={24} color="var(--tuc-red)" /> 雲端備份管理查閱器
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="ghost-button" onClick={() => handleExportAll('json')} style={{ fontSize: '0.8rem' }}>
                  <Download size={16} /> 匯出 JSON
                </button>
                <button className="ghost-button" onClick={() => handleExportAll('csv')} style={{ fontSize: '0.8rem' }}>
                  <Download size={16} /> 匯出 CSV
                </button>
                <button className="ghost-button" onClick={handleShareAll} style={{ fontSize: '0.8rem' }}>
                  <Share2 size={16} /> 分享清單
                </button>
                <button onClick={() => setShowCloudInspector(false)} className="icon-btn">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 10 }}>
                  <tr style={{ color: '#888', fontSize: '0.9rem' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>設備名稱</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>單位</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>申請人員</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>備份日期</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cloudSpecs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#555' }}>目前無任何雲端備份紀錄</td></tr>
                  ) : cloudSpecs.map((spec) => {
                    const isSystem = spec.requester === 'TUC_SYSTEM' || spec.title?.includes('[SYSTEM]');
                    return (
                      <tr key={spec.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover-row">
                        <td style={{ padding: '12px', color: 'white' }}>{spec.title}</td>
                        <td style={{ padding: '12px', color: '#bbb' }}>{spec.department}</td>
                        <td style={{ padding: '12px', color: '#bbb' }}>{spec.requester}</td>
                        <td style={{ padding: '12px', color: '#888', fontSize: '0.8rem' }}>{new Date(spec.created_at).toLocaleString()}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button className="icon-btn" onClick={() => handleShareSpec(spec)} title="分享摘要">
                              <Share2 size={16} />
                            </button>
                            {!isSystem && (
                              <button className="icon-btn" onClick={() => handleDeleteSpec(spec.id, isSystem)} style={{ color: '#EF4444' }} title="刪除紀錄">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
              共計 {cloudSpecs.length} 筆備份資料
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
