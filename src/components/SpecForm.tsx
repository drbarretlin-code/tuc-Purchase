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
  Trash2,
  Repeat,
  ShieldAlert,
  Book
} from 'lucide-react';
import { t } from '../lib/i18n';
import SectionEditor from './SectionEditor';
import SpecTable from './SpecTable';
import ImageUpload from './ImageUpload';
import * as KP from '../lib/knowledgeParser';
import type { FormState, AIHintSelection } from '../types/form';
import { INITIAL_FORM_STATE } from '../types/form';
import { DatabaseImportModal } from './DatabaseImportModal';

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
}

const CompactThreshold: React.FC<{ 
  value: number, 
  onChange: (val: number) => void,
  label: string,
  icon?: React.ReactNode
}> = ({ value, onChange, label, icon }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="compact-threshold-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', marginLeft: '6px' }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px', 
        padding: '1px 6px', 
        background: 'rgba(255,255,255,0.08)', 
        borderRadius: '6px',
        fontSize: '0.7rem',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.1)',
        color: value >= 0.6 ? '#10B981' : (value >= 0.3 ? '#F59E0B' : '#EF4444'),
        transition: 'all 0.2s',
        fontWeight: 'bold'
      }}>
        {icon || <Zap size={10} />}
        <span>{Math.round(value * 100)}%</span>
      </div>
      
      {isHovered && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          zIndex: 1000, 
          background: '#1F2937', 
          padding: '12px', 
          borderRadius: '8px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          minWidth: '200px',
          marginTop: '6px'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '8px', fontWeight: 'bold' }}>
            {label}
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05" 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--tuc-red)', height: '4px' }}
          />
        </div>
      )}
    </div>
  );
};

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [isDbImportModalOpen, setIsDbImportModalOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // V14: 遷移舊有硬編碼中文至 i18n 標籤 (Migration Logic)
  React.useEffect(() => {
    const MIGRATION_MAP: Record<string, string> = {
      '依請購內容而定': 'defaultDependingOnProcurement',
      '依台燿規定(承攬商管理規範、承攬商安全衛生管理規則、承攬商作業危害因素告知單等)': 'defaultAccordingToTuc',
      '依台燿規定': 'defaultAccordingToTucShort',
      '符合國家法規': 'defaultNationalRegs',
      '設計與安裝符合職業安全衛生法令規範': 'defaultSafetyRegs',
      '完工後會同勘查(須缺失改善完成及運作) 1個月後辦理驗收': 'defaultAcceptance',
      '補充說明': 'defaultAcceptanceExtra',
      '功能': 'defaultTblFunctional',
      '品質': 'defaultTblQuality',
      '產能': 'defaultTblCapacity',
      '運轉測試': 'defaultTblRuntest',
      '外觀檢驗': 'defaultTblAppearance',
      '出力測速': 'defaultTblOutput'
    };

    let needsUpdate = false;
    const newData = { ...data };

    // 檢查主要文字欄位
    const textFields: (keyof FormState)[] = [
      'equipmentScope', 'rangeRange', 'envRequirements', 'regRequirements', 
      'maintRequirements', 'safetyRequirements', 'elecSpecs', 'mechSpecs', 
      'physSpecs', 'relySpecs', 'installStandard', 'acceptanceDesc', 
      'acceptanceExtra', 'complianceDesc'
    ];

    textFields.forEach(field => {
      const val = data[field] as string;
      if (val && MIGRATION_MAP[val]) {
        (newData as any)[field] = MIGRATION_MAP[val];
        needsUpdate = true;
      } else if (field === 'installStandard' && val && val.includes('PLC以及人機程式修改')) {
        // 特別處理多行字串
        newData.installStandard = 'defaultInstallStd';
        needsUpdate = true;
      } else if (field === 'complianceDesc' && val && val.includes('工程設施驗收後保固一年')) {
        newData.complianceDesc = 'defaultCompliance';
        needsUpdate = true;
      }
    });

    // 檢查表格資料
    if (newData.tableData) {
      newData.tableData = newData.tableData.map(row => {
        let rowUpdated = false;
        const newRow = { ...row };
        if (MIGRATION_MAP[row.category]) { newRow.category = MIGRATION_MAP[row.category]; rowUpdated = true; }
        if (MIGRATION_MAP[row.item]) { newRow.item = MIGRATION_MAP[row.item]; rowUpdated = true; }
        if (rowUpdated) needsUpdate = true;
        return newRow;
      });
    }

    if (needsUpdate) {
      onChange(newData);
    }
  }, []); // 只在載入時執行一次
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
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
    const apiKey = localStorage.getItem('tuc_gemini_key') || '';

    for (let i = 0; i < targets.length; i += concurrency) {
      const chunk = targets.slice(i, i + concurrency);
      
      const chunkResults = await Promise.all(chunk.map(async (target: {category: string, key: keyof FormState, regKey: keyof FormState}) => {
        try {
          const res = await KP.getHistorySuggestions(
            target.category, 
            data.equipmentName, 
            data.requirementDesc, 
            data.matchThresholdHistory, 
            data.matchThresholdReg
          );

          // V16: 若非繁中，執行翻譯
          if (data.language !== 'zh-TW' && res.hints.length > 0 && apiKey) {
            // 更新狀態為翻譯中
            onChange({
              ...data,
              searchStatus: {
                ...data.searchStatus,
                [target.key as string]: 'translating',
                [target.regKey as string]: 'translating'
              }
            });
            
            const translated = await KP.translateHints(res.hints, data.language, apiKey);
            return { target, res: { ...res, hints: translated } };
          }

          return { target, res };
        } catch (err) {
          console.error(`Fetch/Translate failed for ${target.category}:`, err);
          return { target, res: { hints: [], status: 'ai_error' as const } };
        }
      }));

      const nextData = { ...currentData };
      chunkResults.forEach(({ target, res }: { target: any, res: any }) => {
        (nextData as any)[target.key] = res.hints.filter((h: AIHintSelection) => h.docType === 'Specific');
        (nextData as any)[target.regKey] = res.hints.filter((h: AIHintSelection) => h.docType !== 'Specific');
        nextData.searchStatus[target.key as string] = res.status === 'ai_error' ? 'ai_error' : 'success';
        nextData.searchStatus[target.regKey as string] = res.status === 'ai_error' ? 'ai_error' : 'success';
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
    { label: t('tabBasic', data.language), icon: <Info size={18} /> },
    { label: t('tabHardware', data.language), icon: <Settings size={18} /> },
    { label: t('tabConstruction', data.language), icon: <Hammer size={18} /> },
    { label: t('tabDrawings', data.language), icon: <Table size={18} /> },
    { label: t('tabSignOff', data.language), icon: <PenTool size={18} /> },
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
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--tuc-red)', margin: 0 }}>{t('sidebarTitle', data.language)}</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{t('sidebarSubtitle', data.language)}</p>
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
                  <span className="header-btn-text">{t('fileOptions', data.language)}</span>
                  <ChevronDown size={14} />
                </button>

                {isExportMenuOpen && (
                  <div className="dropdown-menu glass-panel">
                    <button className="dropdown-item" onClick={handleExportJSON}>
                      <Download size={16} /> {t('downloadJson', data.language)}
                    </button>
                    <button className="dropdown-item" onClick={() => { setIsExportMenuOpen(false); setIsDbImportModalOpen(true); }}>
                      <Database size={16} /> {t('importCloud', data.language)}
                    </button>
                    <label className="dropdown-item" style={{ cursor: 'pointer' }}>
                      <Upload size={16} /> {t('loadLocal', data.language)}
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
                <span className="header-btn-text">{t('reset', data.language)}</span>
              </button>
            </div>
          </header>

          <div className="form-content-wrap">
            {activeTab === 0 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={20} /> {t('sectionBasicHeader', data.language)}
                  </div>
                  
                  <button 
                    onClick={() => loadHistoryHints('all')}
                    disabled={isAnalyzing}
                    className="primary-button"
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, var(--tuc-red) 0%, #B91C1C 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      width: 'auto'
                    }}
                  >
                    <Repeat size={14} className={isAnalyzing ? 'animate-spin' : ''} /> 
                    {isAnalyzing ? t('aiGenerating', data.language) : t('regenerate', data.language)}
                  </button>
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="input-with-label">
                    <label><Building2 size={14} /> {t('deptLabel', data.language)}</label>
                    <input type="text" value={data.department} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('department', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                    <div className="input-with-label">
                      <label><User size={14} /> {t('applicantLabel', data.language)}</label>
                      <input type="text" value={data.requester} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('requester', e.target.value)} />
                    </div>
                    <div className="input-with-label">
                      <label><Hash size={14} /> {t('extLabel', data.language)}</label>
                      <input type="text" value={data.extension} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('extension', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="doc-section-box">
                  <h4 style={{ color: 'white', marginBottom: '1rem' }}>{t('docSection1', data.language)}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <SectionEditor 
                      label={t('equipName', data.language)} 
                      value={data.equipmentName} 
                      onChange={(v: string) => updateField('equipmentName', v)} 
                      isTextArea={false} 
                      addon={<CompactThreshold value={data.matchThresholdHistory} onChange={(v) => updateField('matchThresholdHistory', v)} label={t('aiHistory', data.language)} />}
                      language={data.language}
                    />
                    <SectionEditor 
                      label={t('model', data.language)} 
                      value={data.model} 
                      onChange={(v: string) => updateField('model', v)} 
                      isTextArea={false} 
                      language={data.language}
                    />
                  </div>
                  <div className="input-with-label">
                    <label>{t('category', data.language)}</label>
                    <select value={data.category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('category', e.target.value as any)} style={{ width: '100%' }}>
                      <option value="新增">{t('catNew', data.language)}</option>
                      <option value="修繕">{t('catRepair', data.language)}</option>
                      <option value="整改">{t('catRenovate', data.language)}</option>
                      <option value="優化">{t('catOptimize', data.language)}</option>
                      <option value="購置">{t('catPurchase', data.language)}</option>
                    </select>
                  </div>
                  <SectionEditor 
                    label={t('reqDesc', data.language)} 
                    value={data.requirementDesc} 
                    onChange={(v: string) => updateField('requirementDesc', v)} 
                    required 
                    addon={<CompactThreshold value={data.matchThresholdReg} onChange={(v) => updateField('matchThresholdReg', v)} label={t('aiReg', data.language)} icon={<Book size={10} />} />}
                    language={data.language}
                  />


                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <SectionEditor 
                    label={t('appearance', data.language)} 
                    value={data.appearance} 
                    onChange={(v: string) => updateField('appearance', v)} 
                    language={data.language}
                  />
                  <SectionEditor label={t('quantity', data.language)} value={data.quantityUnit} onChange={(v: string) => updateField('quantityUnit', v)} isTextArea={false} language={data.language} />
                  <SectionEditor label={t('scope', data.language)} value={data.equipmentScope} onChange={(v: string) => updateField('equipmentScope', v)} language={data.language} />
                  <SectionEditor 
                    label={t('rangeRange', data.language)} 
                    value={data.rangeRange} 
                    onChange={(v: string) => updateField('rangeRange', v)} 
                    language={data.language}
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
                      <Zap size={12} /> {t('aiAnalyzeRange', data.language)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>{t('tabHardware', data.language)}</h3>
                <div className="doc-section-box" style={{ marginBottom: '2rem' }}>
                  <h4 className="section-title"><Package size={16} /> {t('docSection6', data.language)}</h4>
                  <SectionEditor 
                     label={t('envReq', data.language)} 
                     value={data.envRequirements} 
                     onChange={(v: string) => updateField('envRequirements', v)} 
                     hints={data.envAIHints}
                     historyHints={data.envHistoryHints}
                     regHints={data.envRegHints}
                     searchStatus={data.searchStatus?.['envHistoryHints'] || 'none'}
                     onHintToggle={(id: string) => toggleHint('envAIHints', 'envRequirements', id)}
                     onHistoryHintToggle={(id: string) => toggleHint('envHistoryHints', 'envRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('envRegHints', 'envRequirements', id)}
                     language={data.language}
                  />
                  <SectionEditor 
                     label={t('regReq', data.language)} 
                     value={data.regRequirements} 
                     onChange={(v: string) => updateField('regRequirements', v)} 
                     hints={data.regAIHints}
                     historyHints={data.regHistoryHints}
                     regHints={data.regRegHints}
                     searchStatus={data.searchStatus?.['regHistoryHints'] || 'none'}
                     onHintToggle={(id: string) => toggleHint('regAIHints', 'regRequirements', id)}
                     onHistoryHintToggle={(id: string) => toggleHint('regHistoryHints', 'regRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('regRegHints', 'regRequirements', id)}
                     language={data.language}
                  />
                  <SectionEditor 
                     label={t('maintReq', data.language)} 
                     value={data.maintRequirements} 
                     onChange={(v: string) => updateField('maintRequirements', v)} 
                     historyHints={data.maintHistoryHints}
                     regHints={data.maintRegHints}
                     searchStatus={data.searchStatus?.['maintHistoryHints'] || 'none'}
                     onHistoryHintToggle={(id: string) => toggleHint('maintHistoryHints', 'maintRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('maintRegHints', 'maintRequirements', id)}
                     language={data.language}
                  />
                </div>

                <div className="doc-section-box" style={{ marginBottom: '2rem' }}>
                  <h4 className="section-title"><ShieldCheck size={16} /> {t('docSection7', data.language)}</h4>
                  <SectionEditor 
                     label={t('safetyContent', data.language)} 
                     value={data.safetyRequirements} 
                     onChange={(v: string) => updateField('safetyRequirements', v)} 
                     historyHints={data.safetyHistoryHints}
                     regHints={data.safetyRegHints}
                     searchStatus={data.safetyHistoryHints ? data.searchStatus['safetyHistoryHints'] : 'none'}
                     onHistoryHintToggle={(id: string) => toggleHint('safetyHistoryHints', 'safetyRequirements', id)}
                     onRegHintToggle={(id: string) => toggleHint('safetyRegHints', 'safetyRequirements', id)}
                     language={data.language}
                  />
                </div>

                <div className="doc-section-box">
                  <h4 className="section-title"><Zap size={16} /> {t('docSection8', data.language)}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <SectionEditor 
                       label={t('elecSpec', data.language)} 
                       value={data.elecSpecs} 
                       onChange={(v: string) => updateField('elecSpecs', v)} 
                       historyHints={data.elecHistoryHints}
                       regHints={data.elecRegHints}
                       searchStatus={data.searchStatus['elecHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('elecHistoryHints', 'elecSpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('elecRegHints', 'elecSpecs', id)}
                       language={data.language}
                    />
                    <SectionEditor 
                       label={t('mechSpec', data.language)} 
                       value={data.mechSpecs} 
                       onChange={(v: string) => updateField('mechSpecs', v)} 
                       historyHints={data.mechHistoryHints}
                       regHints={data.mechRegHints}
                       searchStatus={data.searchStatus['mechHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('mechHistoryHints', 'mechSpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('mechRegHints', 'mechSpecs', id)}
                       language={data.language}
                    />
                    <SectionEditor 
                       label={t('physSpec', data.language)} 
                       value={data.physSpecs} 
                       onChange={(v: string) => updateField('physSpecs', v)} 
                       historyHints={data.physHistoryHints}
                       regHints={data.physRegHints}
                       searchStatus={data.searchStatus['physHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('physHistoryHints', 'physSpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('physRegHints', 'physSpecs', id)}
                       language={data.language}
                    />
                    <SectionEditor 
                       label={t('relySpec', data.language)} 
                       value={data.relySpecs} 
                       onChange={(v: string) => updateField('relySpecs', v)} 
                       historyHints={data.relyHistoryHints}
                       regHints={data.relyRegHints}
                       searchStatus={data.searchStatus['relyHistoryHints']}
                       onHistoryHintToggle={(id: string) => toggleHint('relyHistoryHints', 'relySpecs', id)}
                       onRegHintToggle={(id: string) => toggleHint('relyRegHints', 'relySpecs', id)}
                       language={data.language}
                    />
                  </div>
                  <SectionEditor 
                    label={t('rangeRange', data.language)} 
                    value={data.rangeRange} 
                    onChange={(v: string) => updateField('rangeRange', v)}
                    historyHints={data.rangeHistoryHints}
                    regHints={data.rangeRegHints}
                    onHistoryHintToggle={(id: string) => toggleHint('rangeHistoryHints', 'rangeRange', id)}
                    onRegHintToggle={(id: string) => toggleHint('rangeRegHints', 'rangeRange', id)}
                    language={data.language}
                  />
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>{t('tabConstructionTitle', data.language)}</h3>
                <SectionEditor 
                   label={t('installStd', data.language)} 
                    value={data.installStandard} 
                    onChange={(v: string) => updateField('installStandard', v)} 
                    hints={data.installAIHints}
                    historyHints={data.installHistoryHints}
                    regHints={data.installRegHints}
                    searchStatus={data.searchStatus?.['installHistoryHints'] || 'none'}
                    onHintToggle={(id: string) => toggleHint('installAIHints', 'installStandard', id)}
                    onHistoryHintToggle={(id: string) => toggleHint('installHistoryHints', 'installStandard', id)}
                    onRegHintToggle={(id: string) => toggleHint('installRegHints', 'installStandard', id)}
                    language={data.language}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <SectionEditor label={t('finishDate', data.language)} value={data.deliveryDate} onChange={(v: string) => updateField('deliveryDate', v)} isTextArea={false} inputType="date" language={data.language} />
                  <SectionEditor label={t('workPeriodDays', data.language)} value={data.workPeriod} onChange={(v: string) => updateField('workPeriod', v)} isTextArea={false} language={data.language} />
                </div>
                <SectionEditor 
                  label={t('acceptanceDesc', data.language)} 
                  value={data.acceptanceDesc} 
                  onChange={(v: string) => updateField('acceptanceDesc', v)} 
                  hints={data.acceptanceAIHints}
                  historyHints={data.acceptanceHistoryHints}
                  regHints={data.acceptanceRegHints}
                  searchStatus={data.searchStatus?.['acceptanceHistoryHints'] || 'none'}
                  onHintToggle={(id: string) => toggleHint('acceptanceAIHints', 'acceptanceDesc', id)}
                  onHistoryHintToggle={(id: string) => toggleHint('acceptanceHistoryHints', 'acceptanceDesc', id)}
                  onRegHintToggle={(id: string) => toggleHint('acceptanceRegHints', 'acceptanceDesc', id)}
                  language={data.language}
                />
                <SectionEditor 
                   label={t('compliance', data.language)} 
                   value={data.complianceDesc} 
                   onChange={(v: string) => updateField('complianceDesc', v)} 
                   hints={data.complianceAIHints}
                   historyHints={data.complianceHistoryHints}
                   regHints={data.complianceRegHints}
                   searchStatus={data.searchStatus?.['complianceHistoryHints'] || 'none'}
                   onHintToggle={(id: string) => toggleHint('complianceAIHints', 'complianceDesc', id)}
                   onHistoryHintToggle={(id: string) => toggleHint('complianceHistoryHints', 'complianceDesc', id)}
                   onRegHintToggle={(id: string) => toggleHint('complianceRegHints', 'complianceDesc', id)}
                   language={data.language}
                />
              </div>
            )}

            {activeTab === 3 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>{t('tabDrawingsTitle', data.language)}</h3>
                <ImageUpload 
                  images={data.images} 
                  onChange={(imgs) => onChange({ ...data, images: imgs })}
                  language={data.language}
                />
                <div style={{ marginTop: '2.5rem' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem' }}>{t('tableAcceptance', data.language)}</h4>
                  <SpecTable 
                    data={data.tableData} 
                    onChange={(td) => onChange({ ...data, tableData: td })}
                    language={data.language}
                  />
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>{t('tabSignOffTitle', data.language)}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <SectionEditor label={t('requester', data.language)} value={data.applicantName} onChange={(v: string) => updateField('applicantName', v)} isTextArea={false} language={data.language} />
                  <SectionEditor label={t('manager', data.language)} value={data.deptHeadName} onChange={(v: string) => updateField('deptHeadName', v)} isTextArea={false} language={data.language} />
                </div>
                
                <div className="doc-section-box">
                  <h4 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>{t('signOffGrid', data.language)}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, border: '1px solid var(--border-color)' }}>
                    {data.signOffGrid.map((row: string[], ri: number) => row.map((cell: string, ci: number) => (
                       <div key={`${ri}-${ci}`} style={{ border: '0.5px solid var(--border-color)', minHeight: '100px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ height: '30px', background: isDropdownCell(ri, ci) ? 'rgba(230,0,18,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                          {isDropdownCell(ri, ci) ? t('deptCode', data.language) : t('signOff', data.language)}
                        </div>
                        {isDropdownCell(ri, ci) ? (
                          <select 
                            value={cell} 
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSignOff(ri, ci, e.target.value)} 
                            style={{ width: '100%', height: '70px', border: 'none', background: 'transparent', color: 'white', fontSize: '0.85rem', textAlign: 'center' }}
                          >
                            <option value="">{t('chooseDept', data.language)}</option>
                            {departments.map((d: string) => <option key={d} value={d}>{d}</option>)}
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

                {/* Footer Information Labels */}
                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ color: 'var(--tuc-red)', fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={16} />
                    {t('docBottomNote1', data.language)}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1.5rem', 
                    color: 'white', 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '0.75rem 1.25rem', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(255,255,255,0.08)' 
                  }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{t('drawings', data.language)}</span>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        onClick={() => updateField('needsDrawing', 'YES')}
                        className={data.needsDrawing === 'YES' ? 'primary-button' : 'ghost-button'}
                        style={{ padding: '0.4rem 1.5rem', fontSize: '0.85rem', minWidth: '80px', background: data.needsDrawing === 'YES' ? 'var(--tuc-red)' : 'transparent' }}
                      >
                        {t('yes', data.language)}
                      </button>
                      <button 
                        onClick={() => updateField('needsDrawing', 'NO')}
                        className={data.needsDrawing === 'NO' ? 'primary-button' : 'ghost-button'}
                        style={{ padding: '0.4rem 1.5rem', fontSize: '0.85rem', minWidth: '80px', background: data.needsDrawing === 'NO' ? 'var(--tuc-red)' : 'transparent' }}
                      >
                        {t('no', data.language)}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="doc-section-box" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(59, 130, 246, 0.05)', border: '2px dashed rgba(59, 130, 246, 0.2)', marginTop: '2rem' }}>
                  <h4 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('validationComplete', data.language)}</h4>
                  <p 
                    style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}
                    dangerouslySetInnerHTML={{ __html: t('syncDescription', data.language) }}
                  />
                  
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
                    {isSyncing ? t('syncing', data.language) : t('finalizeSync', data.language)}
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
              <ChevronLeft size={20} /> {t('prev', data.language)}
            </button>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('section', data.language)} {activeTab + 1} / {tabs.length}
            </div>
            {activeTab < tabs.length - 1 && (
              <button 
                onClick={() => setActiveTab(prev => prev + 1)} 
                className="primary-button"
                style={{ width: 'auto', padding: '0.6rem 2rem' }}
              >
                {t('next', data.language)} <ChevronRight size={20} />
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
        language={data.language}
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
