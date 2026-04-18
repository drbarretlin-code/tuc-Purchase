import { useState, useEffect } from 'react';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import type { FormState } from './types/form';
import { INITIAL_FORM_STATE } from './types/form';
import { getAIHints } from './logic/aiEnhancer';
import { ShieldAlert, Cpu, Settings, X, Save } from 'lucide-react';

function App() {
  const [data, setData] = useState<FormState>(INITIAL_FORM_STATE);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('tuc_gemini_key') || '');
  const [showConfig, setShowConfig] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  // 當設備名稱或類別變動時，更新 AI 建議 (初始化建議列表)
  useEffect(() => {
    if (data.equipmentName && data.category) {
      const hints = getAIHints(data.equipmentName, data.category);
      
      // 映射到各個大綱區塊
      setData(prev => ({
        ...prev,
        envAIHints: hints.filter(h => h.section === 'environmental').map(h => ({ id: Math.random().toString(), content: h.content, link: h.link, selected: false })),
        regAIHints: hints.filter(h => h.section === 'regulations').map(h => ({ id: Math.random().toString(), content: h.content, link: h.link, selected: false })),
        safetyAIHints: hints.filter(h => h.section === 'safety').map(h => ({ id: Math.random().toString(), content: h.content, link: h.link, selected: false })),
        acceptanceAIHints: hints.filter(h => h.section === 'acceptance').map(h => ({ id: Math.random().toString(), content: h.content, link: h.link, selected: false })),
      }));
    }
  }, [data.equipmentName, data.category]);

  const handleSaveKey = () => {
    localStorage.setItem('tuc_gemini_key', tempKey);
    setApiKey(tempKey);
    setShowConfig(false);
  };

  return (
    <div className="app-container" style={{ padding: '1rem', maxWidth: '1800px', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--tuc-red)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu color="white" size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>TUC PRAS v2.0</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>對齊版本：專業自動化文件生成系統</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <ShieldAlert size={14} color={apiKey ? "#4ADE80" : "#EAB308"} />
            <span>AI 引擎：{apiKey ? '已就緒' : '待配置'}</span>
          </div>
          <button onClick={() => setShowConfig(true)} className="icon-btn"><Settings size={18} /></button>
        </div>
      </header>

      <main className="main-grid" style={{ gridTemplateColumns: 'minmax(450px, 1fr) 210mm', flex: 1, overflow: 'hidden', gap: '1.5rem' }}>
        <SpecForm data={data} onChange={setData} />
        <SpecPreview data={data} />
      </main>

      {/* Config Modal */}
      {showConfig && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>AI 搜尋金鑰配置</h3>
              <X size={20} cursor="pointer" onClick={() => setShowConfig(false)} />
            </div>
            <div className="input-group">
              <label>Gemini API Key</label>
              <input type="password" value={tempKey} onChange={(e) => setTempKey(e.target.value)} placeholder="在此輸入 API Key..." />
            </div>
            <button className="primary-button" onClick={handleSaveKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={18} /> 儲存設定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
