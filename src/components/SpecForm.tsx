import React, { useState, useEffect } from 'react';
import type { FormState, 工程類別, AIHintSelection } from '../types/form';
import SectionEditor from './SectionEditor';
import ImageUpload from './ImageUpload';
import SpecTable from './SpecTable';
import { 
  Info, Settings, Hammer, Table, 
  ChevronRight, ChevronLeft, User, Building2, Hash, PenTool,
  Download, Upload,
  Package, ShieldCheck, Zap, Calendar
} from 'lucide-react';
import * as KP from '../lib/knowledgeParser';

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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const departments = ['生產部', '工程部', '工安部', '設備部', '品保部', '研發部', 'PRD', '採購部'];
  const currentDate = new Date().toLocaleDateString('zh-TW');

  /**
   * 載入建議 (V11: 支援雙重建議分類)
   */
  const loadHistoryHints = async (tabIndex: number) => {
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

    const targets = categoryMap[tabIndex];
    if (!targets) return;

    const newData = { ...data };
    let changed = false;

    // 分流儲存區
    const historyUpdates: Record<string, AIHintSelection[]> = {};
    const regUpdates: Record<string, AIHintSelection[]> = {};

    for (const target of targets) {
      const results = await KP.getHistorySuggestions(target.category, data.equipmentName, data.requirementDesc);
      
      const historyList = results.filter(r => r.docType === 'Specific');
      const regList = results.filter(r => r.docType === 'Standard' || r.docType === 'Global');

      historyUpdates[target.key as string] = historyList;
      regUpdates[target.regKey as string] = regList;
    }

    // 批量對比並更新
    Object.keys(historyUpdates).forEach(key => {
      if (JSON.stringify(data[key as keyof FormState]) !== JSON.stringify(historyUpdates[key])) {
        newData[key as keyof FormState] = historyUpdates[key] as any;
        changed = true;
      }
    });

    Object.keys(regUpdates).forEach(key => {
      if (JSON.stringify(data[key as keyof FormState]) !== JSON.stringify(regUpdates[key])) {
        newData[key as keyof FormState] = regUpdates[key] as any;
        changed = true;
      }
    });

    if (changed) onChange(newData);
  };

  useEffect(() => {
    loadHistoryHints(activeTab);
    const formContainer = document.querySelector('.form-content-wrap');
    if (formContainer) {
      formContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // V11: 使用者停止輸入 0.8s 後觸發 AI 重排序與檢索
  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistoryHints(activeTab);
    }, 800);
    return () => clearTimeout(timer);
  }, [data.equipmentName, data.requirementDesc]);

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

  /**
   * 切換建議選取狀態並同步至文字欄位
   */
  const toggleHint = (hintField: keyof FormState, contentField: keyof FormState, hintId: string) => {
    const currentHints = data[hintField] as AIHintSelection[];
    const targetHint = currentHints.find(h => String(h.id) === String(hintId));
    if (!targetHint) return;

    const newSelected = !targetHint.selected;
    const nextHints = currentHints.map(h => 
      String(h.id) === String(hintId) ? { ...h, selected: newSelected } : h
    );

    let nextContent = data[contentField] as string;
    if (newSelected) {
      const baseContent = nextContent.trimEnd();
      const separator = baseContent ? '\n' : '';
      nextContent = baseContent + separator + targetHint.content;
    } else {
      nextContent = nextContent.replace(targetHint.content, '');
      nextContent = nextContent.split('\n').filter(line => line.trim()).join('\n').trim();
    }

    onChange({
      ...data,
      [hintField]: nextHints,
      [contentField]: nextContent
    });
  };

  const updateSignOff = (row: number, col: number, value: string) => {
    const newGrid = data.signOffGrid.map((r, ri) => 
      ri === row ? r.map((c, ci) => ci === col ? value : c) : r
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

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        onChange(importedData);
      } catch (error) {
        alert('無效的 JSON 檔案');
      }
    };
    reader.readAsText(file);
  };

  /**
   * 執行完稿同步
   */
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
            {tabs.map((tab, index) => (
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
                onChange={(e) => setActiveTab(parseInt(e.target.value))}
              >
                {tabs.map((tab, index) => (
                  <option key={tab.label} value={index}>
                    第 {index + 1} 部分：{tab.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <header className="form-header-toolbar" style={{ height: isMobile ? 'auto' : '60px', padding: isMobile ? '0.75rem' : '0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 'bold' }}>
              {tabs[activeTab].icon}
              {tabs[activeTab].label}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px' }}>
                <Calendar size={14} /> <span>日期：{currentDate}</span>
              </div>
              <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }}></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label className="icon-btn" style={{ cursor: 'pointer' }} title="導入專案">
                  <Upload size={16} /><input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
                </label>
                <button className="icon-btn" onClick={handleExportJSON} title="儲存專案"><Download size={16} /></button>
              </div>
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
                    <input type="text" value={data.department} onChange={(e) => updateField('department', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                    <div className="input-with-label">
                      <label><User size={14} /> 申請人員</label>
                      <input type="text" value={data.requester} onChange={(e) => updateField('requester', e.target.value)} />
                    </div>
                    <div className="input-with-label">
                      <label><Hash size={14} /> 分機</label>
                      <input type="text" value={data.extension} onChange={(e) => updateField('extension', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="doc-section-box">
                  <h4 style={{ color: 'white', marginBottom: '1rem' }}>一. 名稱 (請購細目)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <SectionEditor label="設備名稱" value={data.equipmentName} onChange={(v) => updateField('equipmentName', v)} isTextArea={false} />
                    <SectionEditor label="型別" value={data.model} onChange={(v) => updateField('model', v)} isTextArea={false} />
                  </div>
                  <div className="input-with-label">
                    <label>工程類別</label>
                    <select value={data.category} onChange={(e) => updateField('category', e.target.value as 工程類別)} style={{ width: '100%' }}>
                      {['新增', '修繕', '整改', '優化', '購置'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <SectionEditor 
                    label="需求說明" 
                    value={data.requirementDesc} 
                    onChange={(v) => updateField('requirementDesc', v)} 
                    required 
                    placeholder="描述技術關鍵字（如：配電、安全、環保、防爆、化學品、特殊作業等）"
                    historyHints={data.requirementDescHistoryHints}
                    regHints={data.requirementDescRegHints}
                    onHistoryHintToggle={(id) => toggleHint('requirementDescHistoryHints', 'requirementDesc', id)}
                    onRegHintToggle={(id) => toggleHint('requirementDescRegHints', 'requirementDesc', id)}
                  />
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <SectionEditor 
                    label="二. 品相" 
                    value={data.appearance} 
                    onChange={(v) => updateField('appearance', v)} 
                    historyHints={data.appearanceHistoryHints}
                    regHints={data.appearanceRegHints}
                    onHistoryHintToggle={(id) => toggleHint('appearanceHistoryHints', 'appearance', id)}
                    onRegHintToggle={(id) => toggleHint('appearanceRegHints', 'appearance', id)}
                  />
                  <SectionEditor label="三. 數量、單位" value={data.quantityUnit} onChange={(v) => updateField('quantityUnit', v)} isTextArea={false} />
                  <SectionEditor label="四. 工程適用範圍 (Scope)" value={data.equipmentName} onChange={(v) => updateField('equipmentName', v)} />
                  <SectionEditor 
                    label="五. 工程(或設備)適用區間 (Range)" 
                    value={data.rangeRange} 
                    onChange={(v) => updateField('rangeRange', v)} 
                    historyHints={data.rangeHistoryHints}
                    regHints={data.rangeRegHints}
                    onHistoryHintToggle={(id) => toggleHint('rangeHistoryHints', 'rangeRange', id)}
                    onRegHintToggle={(id) => toggleHint('rangeRegHints', 'rangeRange', id)}
                  />
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
                     onChange={(v) => updateField('envRequirements', v)} 
                     historyHints={data.envHistoryHints}
                     regHints={data.envRegHints}
                     onHistoryHintToggle={(id) => toggleHint('envHistoryHints', 'envRequirements', id)}
                     onRegHintToggle={(id) => toggleHint('envRegHints', 'envRequirements', id)}
                  />
                  <SectionEditor 
                     label="2. 法規要求" 
                     value={data.regRequirements} 
                     onChange={(v) => updateField('regRequirements', v)} 
                     historyHints={data.regHistoryHints}
                     regHints={data.regRegHints}
                     onHistoryHintToggle={(id) => toggleHint('regHistoryHints', 'regRequirements', id)}
                     onRegHintToggle={(id) => toggleHint('regRegHints', 'regRequirements', id)}
                  />
                  <SectionEditor 
                     label="3. 維護要求" 
                     value={data.maintRequirements} 
                     onChange={(v) => updateField('maintRequirements', v)} 
                     historyHints={data.maintHistoryHints}
                     regHints={data.maintRegHints}
                     onHistoryHintToggle={(id) => toggleHint('maintHistoryHints', 'maintRequirements', id)}
                     onRegHintToggle={(id) => toggleHint('maintRegHints', 'maintRequirements', id)}
                  />
                </div>

                <div className="doc-section-box" style={{ marginBottom: '2rem' }}>
                  <h4 className="section-title"><ShieldCheck size={16} /> 七. 安全要求</h4>
                  <SectionEditor 
                     label="安全要求內容" 
                     value={data.safetyRequirements} 
                     onChange={(v) => updateField('safetyRequirements', v)} 
                     historyHints={data.safetyHistoryHints}
                     regHints={data.safetyRegHints}
                     onHistoryHintToggle={(id) => toggleHint('safetyHistoryHints', 'safetyRequirements', id)}
                     onRegHintToggle={(id) => toggleHint('safetyRegHints', 'safetyRequirements', id)}
                  />
                </div>

                <div className="doc-section-box">
                  <h4 className="section-title"><Zap size={16} /> 八. 特性要求</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <SectionEditor 
                       label="1. 電氣特性規格" 
                       value={data.elecSpecs} 
                       onChange={(v) => updateField('elecSpecs', v)} 
                       historyHints={data.elecHistoryHints}
                       regHints={data.elecRegHints}
                       onHistoryHintToggle={(id) => toggleHint('elecHistoryHints', 'elecSpecs', id)}
                       onRegHintToggle={(id) => toggleHint('elecRegHints', 'elecSpecs', id)}
                    />
                    <SectionEditor 
                       label="2. 機構特性規格" 
                       value={data.mechSpecs} 
                       onChange={(v) => updateField('mechSpecs', v)} 
                       historyHints={data.mechHistoryHints}
                       regHints={data.mechRegHints}
                       onHistoryHintToggle={(id) => toggleHint('mechHistoryHints', 'mechSpecs', id)}
                       onRegHintToggle={(id) => toggleHint('mechRegHints', 'mechSpecs', id)}
                    />
                    <SectionEditor 
                       label="3. 物理特性規格" 
                       value={data.physSpecs} 
                       onChange={(v) => updateField('physSpecs', v)} 
                       historyHints={data.physHistoryHints}
                       regHints={data.physRegHints}
                       onHistoryHintToggle={(id) => toggleHint('physHistoryHints', 'physSpecs', id)}
                       onRegHintToggle={(id) => toggleHint('physRegHints', 'physSpecs', id)}
                    />
                    <SectionEditor 
                       label="4. 信賴特性規格" 
                       value={data.relySpecs} 
                       onChange={(v) => updateField('relySpecs', v)} 
                       historyHints={data.relyHistoryHints}
                       regHints={data.relyRegHints}
                       onHistoryHintToggle={(id) => toggleHint('relyHistoryHints', 'relySpecs', id)}
                       onRegHintToggle={(id) => toggleHint('relyRegHints', 'relySpecs', id)}
                    />
                  </div>
                  <SectionEditor 
                    label="適用區間 (Range)" 
                    value={data.rangeRange} 
                    onChange={v => updateField('rangeRange', v)}
                    historyHints={data.rangeHistoryHints}
                    regHints={data.rangeRegHints}
                    onHistoryHintToggle={(id) => toggleHint('rangeHistoryHints', 'rangeRange', id)}
                    onRegHintToggle={(id) => toggleHint('rangeRegHints', 'rangeRange', id)}
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
                   onChange={(v) => updateField('installStandard', v)} 
                   historyHints={data.installHistoryHints}
                   regHints={data.installRegHints}
                   onHistoryHintToggle={(id) => toggleHint('installHistoryHints', 'installStandard', id)}
                   onRegHintToggle={(id) => toggleHint('installRegHints', 'installStandard', id)}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <SectionEditor label="完工日期" value={data.deliveryDate} onChange={(v) => updateField('deliveryDate', v)} isTextArea={false} inputType="date" />
                  <SectionEditor label="工期（天）" value={data.workPeriod} onChange={(v) => updateField('workPeriod', v)} isTextArea={false} />
                </div>
                <SectionEditor 
                  label="驗收要求" 
                  value={data.acceptanceDesc} 
                  onChange={(v) => updateField('acceptanceDesc', v)} 
                  historyHints={data.acceptanceHistoryHints}
                  regHints={data.acceptanceRegHints}
                  onHistoryHintToggle={(id) => toggleHint('acceptanceHistoryHints', 'acceptanceDesc', id)}
                  onRegHintToggle={(id) => toggleHint('acceptanceRegHints', 'acceptanceDesc', id)}
                />
                <SectionEditor 
                   label="十. 遵守事項" 
                   value={data.complianceDesc} 
                   onChange={(v) => updateField('complianceDesc', v)} 
                   historyHints={data.complianceHistoryHints}
                   regHints={data.complianceRegHints}
                   onHistoryHintToggle={(id) => toggleHint('complianceHistoryHints', 'complianceDesc', id)}
                   onRegHintToggle={(id) => toggleHint('complianceRegHints', 'complianceDesc', id)}
                />
              </div>
            )}

            {activeTab === 3 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>十一. 圖說與十二. 表格</h3>
                <ImageUpload images={data.images} onChange={(imgs) => updateField('images', imgs)} />
                <div style={{ marginTop: '2.5rem' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem' }}>十二. 驗收要求細目</h4>
                  <SpecTable data={data.tableData} onChange={(td) => updateField('tableData', td)} />
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>規格確認及會簽</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <SectionEditor label="申請人" value={data.applicantName} onChange={v => updateField('applicantName', v)} isTextArea={false} />
                  <SectionEditor label="單位主管" value={data.deptHeadName} onChange={v => updateField('deptHeadName', v)} isTextArea={false} />
                </div>
                
                <div className="doc-section-box">
                  <h4 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>會簽矩陣</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, border: '1px solid var(--border-color)' }}>
                    {data.signOffGrid.map((row, ri) => row.map((cell, ci) => (
                      <div key={`${ri}-${ci}`} style={{ border: '0.5px solid var(--border-color)', minHeight: '100px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ height: '30px', background: isDropdownCell(ri, ci) ? 'rgba(230,0,18,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                          {isDropdownCell(ri, ci) ? '單位代號' : '核決簽署'}
                        </div>
                        {isDropdownCell(ri, ci) ? (
                          <select 
                            value={cell} 
                            onChange={(e) => updateSignOff(ri, ci, e.target.value)} 
                            style={{ width: '100%', height: '70px', border: 'none', background: 'transparent', color: 'white', fontSize: '0.85rem', textAlign: 'center' }}
                          >
                            <option value="">選擇單位</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : (
                          <textarea 
                            value={cell} 
                            onChange={(e) => updateSignOff(ri, ci, e.target.value)}
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
    </div>
  );
};

export default SpecForm;
