import { useState, useEffect } from 'react';
import type { FormState } from './types/form';
import { INITIAL_FORM_STATE } from './types/form';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import { ShieldAlert, Cpu, Settings, X, Save, CloudUpload } from 'lucide-react';
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

  return (
    <div className="app-container" style={{ padding: '1rem', maxWidth: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--tuc-red)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu color="white" size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>TUC PRAS</h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>採購驗收建置系統 v3.1</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastSaved && <span style={{ fontSize: '0.75rem', color: '#4ADE80' }}>上次存檔: {lastSaved}</span>}
          
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
             {showPreview ? '隱藏正式預覽' : '顯示正式預覽'}
          </button>

          <button 
            onClick={handleCloudSave} 
            disabled={isSaving}
            className="icon-btn" 
            style={{ padding: '0.5rem 1rem', border: '1px solid #333', borderColor: isSaving ? 'rgba(255,255,255,0.1)' : '#333' }}
          >
            {isSaving ? '同步中...' : <><CloudUpload size={16} /> 雲端備份</>}
          </button>
          <button onClick={() => setShowConfig(true)} className="icon-btn">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="main-grid" style={{ 
        gridTemplateColumns: showPreview ? '1fr 210mm' : '1fr 0px', 
        gap: showPreview ? '1.5rem' : '0',
        flex: 1, 
        overflow: 'hidden' 
      }}>
        <div style={{ minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <SpecForm data={data} onChange={setData} />
        </div>
        <div style={{ 
          width: showPreview ? '210mm' : '0', 
          opacity: showPreview ? 1 : 0, 
          pointerEvents: showPreview ? 'auto' : 'none',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}>
          <SpecPreview data={data} />
        </div>
      </main>

      {/* Config Modal */}
      {showConfig && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '450px' }}>
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
              <input 
                type="password" 
                value={tempKey} 
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="貼入您的 API Key..."
                style={{ width: '100%', marginBottom: '1rem' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              注意：API Key 會儲存在您的瀏覽器本地端。
            </div>
            <button className="primary-button" onClick={handleSaveConfig} style={{ width: '100%', padding: '0.8rem', justifyContent: 'center' }}>
              <Save size={18} /> 儲存設定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
