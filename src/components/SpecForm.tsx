import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Upload, 
  FileText, 
  Info, 
  Settings, 
  User, 
  Hash, 
  Package, 
  ShieldCheck, 
  Zap,
  ChevronDown,
  Database,
  Hammer,
  Table,
  Building2,
  PenTool,
  Trash2
} from 'lucide-react';
import SectionEditor from './SectionEditor';
import SpecTable from './SpecTable';
import ImageUpload from './ImageUpload';
import * as KP from '../lib/knowledgeParser';
import type { FormState, AIHintSelection, 工程類別 } from '../types/form';
import { INITIAL_FORM_STATE } from '../types/form';
import { DatabaseImportModal } from './DatabaseImportModal';

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
}

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isDbImportModalOpen, setIsDbImportModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const departments = ['生產部', '工程部', '工安部', '設備部', '品保部', '研發部', 'PRD', '採購部'];

  const loadHistoryHints = async (mode: number | 'all') => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const categoryMap: Record<number, {key: keyof FormState, regKey: keyof FormState, category: string}[]> = {
      0: [
        { key: 'appearanceHistoryHints', regKey: 'appearanceRegHints', category: 'appearance' },
        { key: 'requirementDescHistoryHints', regKey: 'requirementDescRegHints', category: 'technical' }
      ],
      1: [
        { key: 'envHistoryHints', regKey: 'envRegHints', category: 'environmental' },
        { key: 'regHistoryHints', regKey: 'regRegHints', category: 'technical' },
        { key: 'maintHistoryHints', regKey: 'maintRegHints', category: 'technical' },
        { key: 'safetyHistoryHints', regKey: 'safetyRegHints', category: 'safety' },
        { key: 'elecHistoryHints', regKey: 'elecRegHints', category: 'technical' },
        { key: 'mechHistoryHints', regKey: 'mechRegHints', category: 'technical' },
        { key: 'physHistoryHints', regKey: 'physRegHints', category: 'technical' },
        { key: 'relyHistoryHints', regKey: 'relyRegHints', category: 'technical' },
        { key: 'rangeHistoryHints', regKey: 'rangeRegHints', category: 'technical' }
      ],
      2: [
        { key: 'installHistoryHints', regKey: 'installRegHints', category: 'installation' },
        { key: 'complianceHistoryHints', regKey: 'complianceRegHints', category: 'compliance' }
      ],
      3: [{ key: 'acceptanceHistoryHints', regKey: 'acceptanceRegHints', category: 'technical' }]
    };

    let targets: {key: keyof FormState, regKey: keyof FormState, category: string}[] = [];
    if (mode === 'all') {
      targets = Object.values(categoryMap).flat();
    } else {
      targets = categoryMap[mode] || [];
    }
    
    if (targets.length === 0) return;

    const initialStatus = { ...data.searchStatus };
    targets.forEach((t: {key: keyof FormState, regKey: keyof FormState, category: string}) => { 
      initialStatus[t.key as string] = 'pending';
      initialStatus[t.regKey as string] = 'pending';
    });
    
    let currentData = { ...data, searchStatus: initialStatus };
    onChange(currentData);

    const concurrency = 2;
    for (let i = 0; i < targets.length; i += concurrency) {
      const chunk = targets.slice(i, i + concurrency);
      
      const chunkResults = await Promise.all(chunk.map(async (target: {category: string, key: keyof FormState, regKey: keyof FormState}) => {
        try {
          // V12: 同時傳入設備名稱與需求說明作為比對關鍵字
          const res = await KP.getHistorySuggestions(target.category, data.equipmentName, data.requirementDesc);
          return { target, res };
        } catch (err) {
          console.error(`Fetch failed for ${target.category}:`, err);
          return { target, res: { hints: [], status: 'ai_error' as const } };
        }
      }));

      const nextData = { ...currentData };
      chunkResults.forEach(({ target, res }: { target: {key: keyof FormState, regKey: keyof FormState}, res: any }) => {
        nextData[target.key as keyof FormState] = res.hints.filter((h: AIHintSelection) => h.docType === 'Specific') as any;
        nextData[target.regKey as keyof FormState] = res.hints.filter((h: AIHintSelection) => h.docType !== 'Specific') as any;
        nextData.searchStatus[target.key as string] = res.status as any;
        nextData.searchStatus[target.regKey as string] = res.status as any;
      });

      currentData = nextData;
      onChange(currentData);
    }
    setIsAnalyzing(false);
  };

  useEffect(() => {
    const formContainer = document.querySelector('.form-content-wrap');
    if (formContainer) {
      formContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  const tabs = [
    { label: '基本資訊', icon: <Info size={18} /> },
    { label: '技術規格', icon: <Settings size={18} /> },
    { label: '施工作業', icon: <Hammer size={18} /> },
    { label: '圖說表格', icon: <Table size={18} /> },
    { label: '會簽確認', icon: <PenTool size={18} /> },
  ];

  const updateField = (field: keyof FormState, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleHint = (hintField: keyof FormState, contentField: keyof FormState, hintId: string) => {
    const currentHints = (data[hintField] as AIHintSelection[]) || [];
    const targetHint = currentHints.find(h => String(h.id) === String(hintId));
    if (!targetHint) return;

    const newSelected = !targetHint.selected;
    const nextHints = currentHints.map(h => 
      String(h.id) === String(hintId) ? { ...h, selected: newSelected } : h
    );

    let nextContent = (data[contentField] as string) || '';
    
    if (newSelected) {
      // V14.2 防禦性合併：清潔尾端空白後，若有內容則強制補上單換行 \n
      const baseContent = nextContent.trimEnd();
      const separator = baseContent ? '\n' : '';
      nextContent = baseContent + separator + targetHint.content;
    } else {
      // 移除邏輯優化：精準替換目標內容，並清理多誤換行
      nextContent = nextContent.replace(targetHint.content, '').trim();
      nextContent = nextContent.replace(/\n{2,}/g, '\n');
    }

    onChange({
      ...data,
      [hintField]: nextHints,
      [contentField]: nextContent
    });
  };

  const updateSignOff = (row: number, col: number, value: string) => {
    const newGrid = data.signOffGrid.map((r: string[], ri: number) => 
      ri === row ? r.map((c: string, ci: number) => ci === col ? value : c) : r
    );
    updateField('signOffGrid', newGrid);
  };

  const isDropdownCell = (_row: number, col: number) => {
    return col === 0 || col === 2 || col === 4;
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TUC_Spec_${data.equipmentName || 'Draft'}.json`;
    a.click();
  };

  const handleClear = () => {
    if (confirm('確定要清除所有欄位並恢復預設完整版面嗎？(此操作不可還原)')) {
      onChange(INITIAL_FORM_STATE);
      setSyncStatus({ type: 'success', message: '✅ 資料已重置為預設狀態' });
      setTimeout(() => setSyncStatus({ type: null, message: '' }), 3000);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        onChange(importedData);
        setIsExportMenuOpen(false);
      } catch (error) {
        alert('無效的 JSON 檔案');
      }
    };
    reader.readAsText(file);
  };

  const handleSyncToKnowledge = async () => {
    if (!data.equipmentName || !data.requirementDesc) {
      setSyncStatus({ type: 'error', message: '請至少填寫設備名稱與需求說明再進行同步。' });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });

    try {
      const result = await KP.syncFormDataToKnowledge(data);
      setSyncStatus({ 
        type: 'success', 
        message: `✅ 同步成功！已更新 ${result.count} 條技術條文至知識庫。 (隱碼: ${result.docId.substring(0,8)}...)` 
      });
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: `❌ 同步失敗: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="form-section glass-panel" style={{ height: isMobile ? '100%' : 'calc(100vh - 120px)', padding: 0, overflow: 'hidden' }}>
      <div className="form-layout">
        {!isMobile && (
          <aside className={`form-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div style={{ padding: isSidebarCollapsed ? '0.5rem' : '0 1.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!isSidebarCollapsed && (
                <div>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--tuc-red)', margin: 0 }}>編輯目錄</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>TUC 採購規範產生器</p>
                </div>
              )}
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                className="icon-btn" 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}
              >
                {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            {tabs.map((tab: {label: string, icon: any}, index: number) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(index)}
                className={`sidebar-nav-item ${activeTab === index ? 'active' : ''}`}
              >
                {tab.icon}
                {!isSidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </aside>
        )}

        <main className="form-main-container" style={{ flex: 1, overflowY: 'auto' }}>
          {isMobile && (
            <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <select 
                className="mobile-chapter-selector"
                value={activeTab}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActiveTab(parseInt(e.target.value))}
              >
                {tabs.map((tab, index) => (
                  <option key={tab.label} value={index}>
                    第 {index + 1} 部分：{tab.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <header className="form-header-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={20} color="var(--tuc-red)" />
              <span style={{ fontWeight: 600, color: 'white' }}>
                {data.equipmentName || '未命名規範文件'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                DocID: {(data.docId || '--------').substring(0,8)}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="dropdown-container">
                <button 
                  className="icon-btn" 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  style={{ gap: '8px', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)' }}
                >
                  <Download size={16} /> 
                  <span className="header-btn-text">檔案選項</span>
                  <ChevronDown size={14} />
                </button>

                {isExportMenuOpen && (
                  <div className="dropdown-menu glass-panel">
                    <button className="dropdown-item" onClick={handleExportJSON}>
                      <Download size={16} /> 下載編輯 JSON (本地)
                    </button>
                    <button className="dropdown-item" onClick={() => { setIsExportMenuOpen(false); setIsDbImportModalOpen(true); }}>
                      <Database size={16} /> 從雲端知識庫匯入
                    </button>
                    <label className="dropdown-item" style={{ cursor: 'pointer' }}>
                      <Upload size={16} /> 載入本地 JSON
                      <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>

              <button 
                className="icon-btn" 
                onClick={handleClear}
                title="清除所有內容並重置"
                style={{ 
                  gap: '8px', 
                  padding: '0.6rem 1rem', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#F87171' 
                }}
              >
                <Trash2 size={16} /> 
                <span className="header-btn-text">清除歸零</span>
              </button>

            </div>
          </header>

          <div className="form-content-wrap">
            {activeTab === 0 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={20} /> 基本資訊與請購項目
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="input-with-label">
                    <label><Building2 size={14} /> 申請單位</label>
                    <input type="text" value={data.department} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('department', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                    <div className="input-with-label">
                      <label><User size={14} /> 申請人員</label>
                      <input type="text" value={data.requester} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('requester', e.target.value)} />
                    </div>
                    <div className="input-with-label">
                      <label><Hash size={14} /> 分機</label>
                      <input type="text" value={data.extension} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('extension', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="doc-section-box">
                  <h4 style={{ color: 'white', marginBottom: '1rem' }}>一. 名稱 (請購細目)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <SectionEditor label="設備名稱" value={data.equipmentName} onChange={(v: string) => updateField('equipmentName', v)} isTextArea={false} />
                    <SectionEditor label="型別" value={data.model} onChange={(v: string) => updateField('model', v)} isTextArea={false} />
                  </div>
                  <div className="input-with-label">
                    <label>工程類別</label>
                    <select value={data.category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('category', e.target.value as 工程類別)} style={{ width: '100%' }}>
                      {['新增', '修繕', '整改', '優化', '購置'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <SectionEditor 
                    label="需求說明" 
                    value={data.requirementDesc} 
                    onChange={(v: string) => updateField('requirementDesc', v)} 
                    required 
                    placeholder="描述技術關鍵字（如：配電、安全、環保、防爆、化學品、特殊作業等）"
                    historyHints={data.requirementDescHistoryHints}
                    regHints={data.requirementDescRegHints}
                    searchStatus={data.searchStatus?.['requirementDescHistoryHints'] || 'none'}
                    onHistoryHintToggle={(id: string) => toggleHint('requirementDescHistoryHints', 'requirementDesc', id)}
                    onRegHintToggle={(id: string) => toggleHint('requirementDescRegHints', 'requirementDesc', id)}
                  />

                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => loadHistoryHints('all')}
                      disabled={isAnalyzing}
                      className="primary-button"
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, var(--tuc-red) 0%, #B91C1C 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                        opacity: isAnalyzing ? 0.7 : 1
                      }}
                    >
                      <Zap size={14} className={isAnalyzing ? 'animate-pulse' : ''} /> 
                      {isAnalyzing ? '智慧建議生成中...' : '點此生成智慧建議 (AI 重分析)'}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <SectionEditor 
                    label="二. 品相" 
                    value={data.appearance} 
                    onChange={(v: string) => updateField('appearance', v)} 
                    historyHints={data.appearanceHistoryHints}
                    regHints={data.appearanceRegHints}
                    searchStatus={data.searchStatus?.['appearanceHistoryHints'] || 'none'}
                    onHistoryHintToggle={(id: string) => toggleHint('appearanceHistoryHints', 'appearance', id)}
                    onRegHintToggle={(id: string) => toggleHint('appearanceRegHints', 'appearance', id)}
                  />
                  <SectionEditor label="三. 數量、單位" value={data.quantityUnit} onChange={(v: string) => updateField('quantityUnit', v)} isTextArea={false} />
                  <SectionEditor label="四. 工程適用範圍 (Scope)" value={data.equipmentScope} onChange={(v: string) => updateField('equipmentScope', v)} />
                  <SectionEditor 
                    label="五. 工程(或設備)適用區間 (Range)" 
                    value={data.rangeRange} 
                    onChange={(v: string) => updateField('rangeRange', v)} 
                    historyHints={data.rangeHistoryHints}
                    regHints={data.rangeRegHints}
                    searchStatus={data.searchStatus?.['rangeHistoryHints'] || 'none'}
                    onHistoryHintToggle={(id: string) => toggleHint('rangeHistoryHints', 'rangeRange', id)}
                    onRegHintToggle={(id: string) => toggleHint('rangeRegHints', 'rangeRange', id)}
                  />
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => loadHistoryHints('all')}
                      className="primary-button"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.75rem',
                        opacity: 0.8,
                        background: 'linear-gradient(135deg, #4B5563, #1F2937)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Zap size={12} /> 重新分析本章建議
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>技術與設計要求</h3>
                <div className="doc-section-box" style={{ marginBottom: '2rem' }}>
                  <h4 className="section-title"><Package size={16} /> 六. 設計要求</h4>
                  <SectionEditor 
                     label="1. 環保要求" 
                     value={data.envRequirements} 
                     onChange={(v: string) => updateField('envRequirements', v)} 
                     hints={data.envAIHints}
                     historyHints={data.envHistoryHints}
                     regHints={data.envRegHints}
                     searchStatus={data.searchStatus?.['envHistoryHints'] || 'none'}
                     onHintToggle={(id: string) => toggleHint('envAIHints', 'envRequirements', id)}
                     onHistoryHintToggle={(id: string) => toggleHint('envHistoryHints', 'envRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('envRegHints', 'envRequirements', id)}
                  />
                  <SectionEditor 
                     label="2. 法規要求" 
                     value={data.regRequirements} 
                     onChange={(v: string) => updateField('regRequirements', v)} 
                     hints={data.regAIHints}
                     historyHints={data.regHistoryHints}
                     regHints={data.regRegHints}
                     searchStatus={data.searchStatus?.['regHistoryHints'] || 'none'}
                     onHintToggle={(id: string) => toggleHint('regAIHints', 'regRequirements', id)}
                     onHistoryHintToggle={(id: string) => toggleHint('regHistoryHints', 'regRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('regRegHints', 'regRequirements', id)}
                  />
                  <SectionEditor 
                     label="3. 維護要求" 
                     value={data.maintRequirements} 
                     onChange={(v: string) => updateField('maintRequirements', v)} 
                     historyHints={data.maintHistoryHints}
                     regHints={data.maintRegHints}
                     searchStatus={data.searchStatus?.['maintHistoryHints'] || 'none'}
                     onHistoryHintToggle={(id: string) => toggleHint('maintHistoryHints', 'maintRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('maintRegHints', 'maintRequirements', id)}
                  />
                </div>

                <div className="doc-section-box" style={{ marginBottom: '2rem' }}>
                  <h4 className="section-title"><ShieldCheck size={16} /> 七. 安全要求</h4>
                  <SectionEditor 
                     label="安全要求內容" 
                     value={data.safetyRequirements} 
                     onChange={(v: string) => updateField('safetyRequirements', v)} 
                     historyHints={data.safetyHistoryHints}
                     regHints={data.safetyRegHints}
                     searchStatus={data.safetyHistoryHints ? data.searchStatus['safetyHistoryHints'] : 'none'}
                     onHistoryHintToggle={(id: string) => toggleHint('safetyHistoryHints', 'safetyRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('safetyRegHints', 'safetyRequirements', id)}
                  />
                </div>

                <div className="doc-section-box">
                  <h4 className="section-title"><Zap size={16} /> 八. 特性要求</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <SectionEditor 
                       label="1. 電氣特性規格" 
                       value={data.elecSpecs} 
                       onChange={(v: string) => updateField('elecSpecs', v)} 
                       historyHints={data.elecHistoryHints}
                       regHints={data.elecRegHints}
                       searchStatus={data.searchStatus['elecHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('elecHistoryHints', 'elecSpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('elecRegHints', 'elecSpecs', id)}
                    />
                    <SectionEditor 
                       label="2. 機構特性規格" 
                       value={data.mechSpecs} 
                       onChange={(v: string) => updateField('mechSpecs', v)} 
                       historyHints={data.mechHistoryHints}
                       regHints={data.mechRegHints}
                       searchStatus={data.searchStatus['mechHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('mechHistoryHints', 'mechSpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('mechRegHints', 'mechSpecs', id)}
                    />
                    <SectionEditor 
                       label="3. 物理特性規格" 
                       value={data.physSpecs} 
                       onChange={(v: string) => updateField('physSpecs', v)} 
                       historyHints={data.physHistoryHints}
                       regHints={data.physRegHints}
                       searchStatus={data.searchStatus['physHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('physHistoryHints', 'physSpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('physRegHints', 'physSpecs', id)}
                    />
                    <SectionEditor 
                       label="4. 信賴特性規格" 
                       value={data.relySpecs} 
                       onChange={(v: string) => updateField('relySpecs', v)} 
                       historyHints={data.relyHistoryHints}
                       regHints={data.relyRegHints}
                       searchStatus={data.searchStatus['relyHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('relyHistoryHints', 'relySpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('relyRegHints', 'relySpecs', id)}
                    />
                  </div>
                  <SectionEditor 
                    label="適用區間 (Range)" 
                    value={data.rangeRange} 
                    onChange={(v: string) => updateField('rangeRange', v)}
                    historyHints={data.rangeHistoryHints}
                    regHints={data.rangeRegHints}
                    onHistoryHintToggle={(id: string) => toggleHint('rangeHistoryHints', 'rangeRange', id)}
                    onRegHintToggle={(id: string) => toggleHint('rangeRegHints', 'rangeRange', id)}
                  />
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>九. 安裝與遵守事項</h3>
                <SectionEditor 
                   label="施工標準 (九)" 
                   value={data.installStandard} 
                   onChange={(v: string) => updateField('installStandard', v)} 
                   historyHints={data.installHistoryHints}
                   regHints={data.installRegHints}
                   searchStatus={data.searchStatus['installHistoryHints']}
                   onHistoryHintToggle={(id: string) => toggleHint('installHistoryHints', 'installStandard', id)}
                   onRegHintToggle={(id: string) => toggleHint('installRegHints', 'installStandard', id)}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <SectionEditor label="完工日期" value={data.deliveryDate} onChange={(v: string) => updateField('deliveryDate', v)} isTextArea={false} inputType="date" />
                  <SectionEditor label="工期（天）" value={data.workPeriod} onChange={(v: string) => updateField('workPeriod', v)} isTextArea={false} />
                </div>
                <SectionEditor 
                  label="驗收要求" 
                  value={data.acceptanceDesc} 
                  onChange={(v: string) => updateField('acceptanceDesc', v)} 
                  hints={data.acceptanceAIHints}
                  historyHints={data.acceptanceHistoryHints}
                  regHints={data.acceptanceRegHints}
                  searchStatus={data.searchStatus?.['acceptanceHistoryHints'] || 'none'}
                  onHintToggle={(id: string) => toggleHint('acceptanceAIHints', 'acceptanceDesc', id)}
                  onHistoryHintToggle={(id: string) => toggleHint('acceptanceHistoryHints', 'acceptanceDesc', id)}
                  onRegHintToggle={(id: string) => toggleHint('acceptanceRegHints', 'acceptanceDesc', id)}
                />
                <SectionEditor 
                   label="十. 遵守事項" 
                   value={data.complianceDesc} 
                   onChange={(v: string) => updateField('complianceDesc', v)} 
                   hints={data.complianceAIHints}
                   historyHints={data.complianceHistoryHints}
                   regHints={data.complianceRegHints}
                   searchStatus={data.searchStatus?.['complianceHistoryHints'] || 'none'}
                   onHintToggle={(id: string) => toggleHint('complianceAIHints', 'complianceDesc', id)}
                   onHistoryHintToggle={(id: string) => toggleHint('complianceHistoryHints', 'complianceDesc', id)}
                   onRegHintToggle={(id: string) => toggleHint('complianceRegHints', 'complianceDesc', id)}
                />
              </div>
            )}

            {activeTab === 3 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>十一. 圖說與十二. 表格</h3>
                <ImageUpload images={data.images} onChange={(imgs: any[]) => updateField('images', imgs)} />
                <div style={{ marginTop: '2.5rem' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem' }}>十二. 驗收要求細目</h4>
                  <SpecTable data={data.tableData} onChange={(td: any[]) => updateField('tableData', td)} />
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>規格確認及會簽</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <SectionEditor label="申請人" value={data.applicantName} onChange={(v: string) => updateField('applicantName', v)} isTextArea={false} />
                  <SectionEditor label="單位主管" value={data.deptHeadName} onChange={(v: string) => updateField('deptHeadName', v)} isTextArea={false} />
                </div>
                
                <div className="doc-section-box">
                  <h4 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>會簽矩陣</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, border: '1px solid var(--border-color)' }}>
                    {data.signOffGrid.map((row: string[], ri: number) => row.map((cell: string, ci: number) => (
                      <div key={`${ri}-${ci}`} style={{ border: '0.5px solid var(--border-color)', minHeight: '100px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ height: '30px', background: isDropdownCell(ri, ci) ? 'rgba(230,0,18,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                          {isDropdownCell(ri, ci) ? '單位代號' : '核決簽署'}
                        </div>
                        {isDropdownCell(ri, ci) ? (
                          <select 
                            value={cell} 
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSignOff(ri, ci, e.target.value)} 
                            style={{ width: '100%', height: '70px', border: 'none', background: 'transparent', color: 'white', fontSize: '0.85rem', textAlign: 'center' }}
                          >
                            <option value="">選擇單位</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : (
                          <textarea 
                            value={cell} 
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSignOff(ri, ci, e.target.value)}
                            style={{ width: '100%', height: '70px', background: 'transparent', border: 'none', color: 'white', padding: '8px', resize: 'none', fontSize: '0.85rem', textAlign: 'center' }}
                          />
                        )}
                      </div>
                    )))}
                  </div>
                </div>

                <div className="doc-section-box" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(59, 130, 246, 0.05)', border: '2px dashed rgba(59, 130, 246, 0.2)', marginTop: '2rem' }}>
                  <h4 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem' }}>✅ 規範編校完成</h4>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    您可以點擊下方按鈕將此份規範同步至雲端知識庫。<br/>
                    系統將自動執行 AI 標籤校準，並根據文件隱碼覆蓋舊有資料。
                  </p>
                  
                  <button 
                    onClick={handleSyncToKnowledge}
                    disabled={isSyncing}
                    className="primary-button"
                    style={{ 
                      width: 'auto', 
                      padding: '1rem 3rem', 
                      fontSize: '1.1rem',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {isSyncing ? '同步中，請稍候...' : '完稿並同步至知識庫'}
                  </button>

                  {syncStatus.type && (
                    <div style={{ 
                      marginTop: '1.5rem', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      background: syncStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: syncStatus.type === 'success' ? '#34D399' : '#F87171',
                      border: `1px solid ${syncStatus.type === 'success' ? '#10B981' : '#EF4444'}`
                    }}>
                      {syncStatus.message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <footer className="form-footer-nav">
            <button 
              disabled={activeTab === 0} 
              onClick={() => setActiveTab(prev => prev - 1)} 
              className="ghost-button"
            >
              <ChevronLeft size={20} /> 上一步
            </button>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              章節 {activeTab + 1} / {tabs.length}
            </div>
            {activeTab < tabs.length - 1 && (
              <button 
                onClick={() => setActiveTab(prev => prev + 1)} 
                className="primary-button"
                style={{ width: 'auto', padding: '0.6rem 2rem' }}
              >
                下一步 <ChevronRight size={20} />
              </button>
            )}
          </footer>
        </main>
      </div>

      <DatabaseImportModal 
        isOpen={isDbImportModalOpen}
        onClose={() => setIsDbImportModalOpen(false)}
        onSelect={(importedData: any) => {
          // V12.5: 強化防禦性，確保所有欄位都不是 null，避免後續 split() 等操作崩潰
          const cleanImported = Object.entries(importedData).reduce((acc: any, [key, value]) => {
            acc[key] = value === null ? '' : value;
            return acc;
          }, {});

          const merged: FormState = {
            ...INITIAL_FORM_STATE,
            ...data,
            ...cleanImported,
            searchStatus: {
              ...(INITIAL_FORM_STATE.searchStatus || {}),
              ...(data.searchStatus || {}),
              ...(cleanImported.searchStatus || {})
            }
          };
          onChange(merged);
        }}
      />

      <style>{`
        .ghost-button {
          background: none;
          border: 1px solid var(--border-color);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ghost-button:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default SpecForm;
