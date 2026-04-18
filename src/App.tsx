import { useState, useMemo, useEffect } from 'react';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import type { SpecData } from './logic/specGenerator';
import type { AIHint } from './logic/aiEnhancer';
import { generateMarkdown } from './logic/specGenerator';
import { getAIHints } from './logic/aiEnhancer';
import { ShieldAlert, Cpu, Settings, X, Save } from 'lucide-react';

function App() {
  const [data, setData] = useState<SpecData>({
    department: '',
    requester: '',
    equipmentName: '',
    model: '',
    category: '新增',
    requirement: '',
    aiHints: []
  });

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('tuc_gemini_key') || '');
  const [showConfig, setShowConfig] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  // 當關鍵資訊變動時，更新 AI 建議
  useEffect(() => {
    if (data.equipmentName && data.category) {
      const hints: AIHint[] = getAIHints(data.equipmentName, data.category);
      setData(prev => ({ ...prev, aiHints: hints }));
    }
  }, [data.equipmentName, data.category]);

  const markdown = useMemo(() => generateMarkdown(data), [data]);

  const handleSaveKey = () => {
    localStorage.setItem('tuc_gemini_key', tempKey);
    setApiKey(tempKey);
    setShowConfig(false);
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--tuc-red)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu color="white" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>TUC PRAS Generator</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>請購驗收規範表自動化系統</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <ShieldAlert size={16} color={apiKey ? "#4ADE80" : "#EAB308"} />
            <span>AI 引擎：<span style={{ color: apiKey ? '#4ADE80' : '#EAB308' }}>{apiKey ? '已配置 (Gemini)' : '未配置 (雛型模式)'}</span></span>
          </div>
          <button 
            onClick={() => setShowConfig(true)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-color)', 
              color: 'white', 
              padding: '0.5rem', 
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="main-grid">
        <SpecForm data={data} onChange={setData} />
        <SpecPreview markdown={markdown} />
      </main>

      {/* Config Modal */}
      {showConfig && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>AI 配置中心</h3>
              <X size={20} cursor="pointer" onClick={() => setShowConfig(false)} />
            </div>
            <div className="input-group">
              <label>Gemini API Key</label>
              <input 
                type="password" 
                value={tempKey} 
                onChange={(e) => setTempKey(e.target.value)} 
                placeholder="在此輸入 API Key..." 
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                金鑰將加密儲存於您的瀏覽器本地 (LocalStorage)
              </p>
            </div>
            <button className="primary-button" onClick={handleSaveKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={18} />
              儲存配置
            </button>
          </div>
        </div>
      )}

      <footer style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
        © 2026 Taiwan Union Technology Corporation | AI Documentation Specialist
      </footer>
    </div>
  );
}

export default App;
