import { useState, useEffect } from 'react';
import type { FormState } from './types/form';
import { INITIAL_FORM_STATE } from './types/form';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import { ShieldAlert, Cpu, Settings, X, Save, CloudUpload, PenTool, BookOpen, Eye, EyeOff, Trash2 } from 'lucide-react';
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

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

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
    setApiKey(tempKey);
    localStorage.setItem('tuc_gemini_key', tempKey);
    setShowConfig(false);
  };

  // 雲端同步邏輯
  const handleCloudSave = async () => {
    if (!supabase) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('specs').insert([
        { 
          title: data.equipmentName || '未命名規範表',
          requester: data.requester,
          department: data.department,
          form_data: data
        }
      ]);
      if (error) throw error;
      setLastSaved(new Date().toLocaleTimeString());
      alert('已成功備份至雲端資料庫！');
    } catch (err) {
      console.error(err);
      alert('雲端連線失敗，請檢查 Supabase 設定或網路。');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchCloudSpecs = async () => {
    if (!supabase) return;
    setIsLoadingCloud(true);
    try {
      const { data: list, error } = await supabase
        .from('specs')
        .select('title, department, requester, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCloudSpecs(list || []);
      setShowCloudInspector(true);
    } catch (err) {
      alert('無法取得雲端資料');
    } finally {
      setIsLoadingCloud(false);
    }
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

          <button 
            onClick={handleCloudSave} 
            disabled={isSaving}
            className="icon-btn" 
            style={{ padding: isMobile ? '0.4rem' : '0.5rem 1rem', border: '1px solid #333' }}
          >
            {isMobile ? <CloudUpload size={18} /> : (isSaving ? '同步中...' : <><CloudUpload size={16} /> <span className="header-btn-text">雲端備份</span></>)}
          </button>
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
                  style={{ flex: 1 }}
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
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', marginTop: '4px' }}>
              注意：API Key 會加密儲存在您的瀏覽器本地端。
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CloudUpload size={18} /> 資料庫管理
              </h3>
              <button 
                className="ghost-button" 
                onClick={fetchCloudSpecs} 
                style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-color)' }}
                disabled={isLoadingCloud}
              >
                {isLoadingCloud ? '讀取中...' : '一鍵查閱雲端備份內容現況'}
              </button>
            </div>

            {showCloudInspector && (
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>雲端資料列表</span>
                  <button onClick={() => setShowCloudInspector(false)} style={{ fontSize: '0.7rem', color: '#666', background: 'none', border: 'none' }}>關閉列表</button>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#222' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px' }}>設備名稱</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>單位</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>人員</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cloudSpecs.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>無備份資料</td></tr>
                      ) : cloudSpecs.map((spec, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px' }}>{spec.title}</td>
                          <td style={{ padding: '8px' }}>{spec.department}</td>
                          <td style={{ padding: '8px' }}>{spec.requester}</td>
                          <td style={{ padding: '8px' }}>{new Date(spec.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button className="primary-button" onClick={handleSaveConfig} style={{ width: '100%', padding: '0.8rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <Save size={18} /> 儲存設定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
