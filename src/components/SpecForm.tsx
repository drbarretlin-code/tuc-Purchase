import React, { useState, useEffect } from 'react';
import type { FormState, 工程類別, AIHintSelection } from '../types/form';
import SectionEditor from './SectionEditor';
import ImageUpload from './ImageUpload';
import SpecTable from './SpecTable';
import tucKnowledge from '../data/tuc_knowledge.json';
import KnowledgeModal from './KnowledgeModal';
import { supabase } from '../lib/supabase';
import { 
  Info, Settings, Hammer, Table, 
  ChevronRight, ChevronLeft, User, Building2, Hash, PenTool,
  BookOpen, Download, Upload, FolderOpen, Loader2,
  Package, ShieldCheck, Zap, FileUp, Calendar
} from 'lucide-react';

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
}

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isKMOpen, setIsKMOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string, displayName: string}[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const departments = ['生產部', '工程部', '工安部', '設備部', '品保部', '研發部', 'PRD', '採購部'];
  const currentDate = new Date().toLocaleDateString('zh-TW');

  // 初始化 TUC 建議內容
  useEffect(() => {
    const newData = { ...data };
    let changed = false;

    const fieldsToHint = [
      { key: 'appearanceTUCHints', source: 'appearance' },
      { key: 'envTUCHints', source: 'envRequirements' },
      { key: 'regTUCHints', source: 'regRequirements' },
      { key: 'maintTUCHints', source: 'maintRequirements' },
      { key: 'safetyTUCHints', source: 'safetyRequirements' },
      { key: 'elecTUCHints', source: 'elecSpecs' },
      { key: 'mechTUCHints', source: 'mechSpecs' },
      { key: 'physTUCHints', source: 'physSpecs' },
      { key: 'relyTUCHints', source: 'relySpecs' },
      { key: 'rangeTUCHints', source: 'rangeRange' },
      { key: 'installTUCHints', source: 'installStandard' },
      { key: 'acceptanceTUCHints', source: 'acceptanceDesc' },
      { key: 'complianceTUCHints', source: 'complianceDesc' },
    ];

    fieldsToHint.forEach(({ key, source }) => {
      const fieldKey = key as keyof FormState;
      const hints = (data[fieldKey] as AIHintSelection[]) || [];
      if (hints.length === 0 && tucKnowledge.fieldHints[source as keyof typeof tucKnowledge.fieldHints]) {
        const sourceHints = tucKnowledge.fieldHints[source as keyof typeof tucKnowledge.fieldHints];
        (newData[fieldKey] as any) = sourceHints.map(h => ({ ...h, selected: false }));
        changed = true;
      }
    });

    if (changed) {
      onChange(newData);
    }
  }, []);

  const loadHistoryHints = async (tabIndex: number) => {
    const categoryMap: Record<number, {key: keyof FormState, category: string}[]> = {
      0: [{ key: 'appearanceHistoryHints', category: 'appearance' }],
      1: [
        { key: 'envHistoryHints', category: 'environmental' },
        { key: 'regHistoryHints', category: 'technical' },
        { key: 'maintHistoryHints', category: 'technical' },
        { key: 'safetyHistoryHints', category: 'safety' },
        { key: 'elecHistoryHints', category: 'technical' },
        { key: 'mechHistoryHints', category: 'technical' },
        { key: 'physHistoryHints', category: 'technical' },
        { key: 'relyHistoryHints', category: 'technical' },
        { key: 'rangeHistoryHints', category: 'technical' }
      ],
      2: [
        { key: 'installHistoryHints', category: 'installation' },
        { key: 'complianceHistoryHints', category: 'compliance' }
      ],
      3: [{ key: 'acceptanceHistoryHints', category: 'technical' }]
    };

    const targets = categoryMap[tabIndex];
    if (!targets) return;

    const { getHistorySuggestions } = await import('../lib/knowledgeParser');
    const newData = { ...data };
    let changed = false;

    for (const target of targets) {
      const currentHistory = data[target.key] as AIHintSelection[];
      if (currentHistory.length === 0) {
        const results = await getHistorySuggestions(target.category);
        if (results.length > 0) {
          (newData[target.key] as any) = results;
          changed = true;
        }
      }
    }

    if (changed) onChange(newData);
  };

  useEffect(() => {
    loadHistoryHints(activeTab);
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
    { label: '歷史檔案上傳與歸納', icon: <FolderOpen size={18} /> },
  ];

  const updateField = (field: keyof FormState, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleTUCHint = (field: keyof FormState, contentField: keyof FormState, hintId: string) => {
    const currentHints = data[field] as AIHintSelection[];
    const targetHint = currentHints.find(h => h.id === hintId);
    if (!targetHint) return;

    const newSelected = !targetHint.selected;
    const nextHints = currentHints.map(h => 
      h.id === hintId ? { ...h, selected: newSelected } : h
    );

    let nextContent = data[contentField] as string;
    if (newSelected) {
      // 導入：使用 trimEnd 確保精確換行且自成一段落 (不產生空行)
      const baseContent = nextContent.trimEnd();
      const separator = baseContent ? '\n' : '';
      nextContent = baseContent + separator + targetHint.content;
    } else {
      // 取消勾選：自動從主編輯區移除該段文字，並清理冗餘換行以防空行
      nextContent = nextContent.replace(targetHint.content, '');
      // 清理連續換行為單換行，並移除首尾空行
      nextContent = nextContent.split('\n').filter(line => line.trim()).join('\n').trim();
    }

    onChange({
      ...data,
      [field]: nextHints,
      [contentField]: nextContent
    });
  };

  const toggleHistoryHint = (field: keyof FormState, contentField: keyof FormState, hintId: string) => {
    const currentHints = data[field] as AIHintSelection[];
    const targetHint = currentHints.find(h => h.id === hintId);
    if (!targetHint) return;

    const newSelected = !targetHint.selected;
    const nextHints = currentHints.map(h => 
      h.id === hintId ? { ...h, selected: newSelected } : h
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
      [field]: nextHints,
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
    // 列 0,1,2 的第 1(0), 3(2), 5(4) 欄為單位選擇
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !supabase) return;

    setUploadingFile(true);
    const userApiKey = localStorage.getItem('tuc_gemini_key') || '';
    
    try {
      const newUploads: {name: string, url: string, displayName: string}[] = [];
      let totalAdded = 0;
      let totalSkipped = 0;

      for (const file of Array.from(files)) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('spec-files')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('spec-files')
          .getPublicUrl(fileName);

        // 生成顯示名稱：設備名稱_申請人員_原檔名
        const eqName = data.equipmentName || '未命名設備';
        const reqName = data.requester || '未知申請人';
        const displayName = `${eqName}_${reqName}_${file.name}`;

        newUploads.push({ name: file.name, url: publicUrl, displayName });
        
        const { processFileToKnowledge } = await import('../lib/knowledgeParser');
        const result = await processFileToKnowledge(file, userApiKey, data.equipmentName);
        totalAdded += result?.added || 0;
        totalSkipped += result?.skipped || 0;

        // 批次上傳時，每份檔案間隔 3 秒，確保 API 配額有足夠時間進行冷卻回充
        await new Promise(r => setTimeout(r, 3000));
      }

      // 更新列表並保留最近 5 個用於呈現
      setUploadedFiles(prev => {
        const combined = [...prev, ...newUploads];
        return combined.slice(-5);
      });

      alert(`檔案上傳並解析完成！\n成功歸納：${totalAdded} 條關鍵建議\n過濾重複：${totalSkipped} 條項目 (已跳過)`);
    } catch (err: any) {
      console.error(err);
      alert(`上傳或解析失敗: ${err.message || '未知錯誤'}`);
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="form-section glass-panel" style={{ height: isMobile ? '100%' : 'calc(100vh - 120px)', padding: 0, overflow: 'hidden' }}>
      <div className="form-layout">
        {/* 桌機版側邊欄導航 */}
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
                title={isSidebarCollapsed ? "展開目錄" : "收合目錄"}
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

        {/* 右側主內容區 */}
        <main className="form-main-container" style={{ flex: 1, overflowY: 'auto' }}>
          {/* 行動版章節切換選單 */}
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
          {/* 頂部工具列 */}
          <header className="form-header-toolbar" style={{ height: isMobile ? 'auto' : '60px', padding: isMobile ? '0.75rem' : '0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 'bold' }}>
              {tabs[activeTab].icon}
              {tabs[activeTab].label}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px' }}>
                <Calendar size={14} /> <span className="header-btn-text">日期：{currentDate}</span>
                {!isSidebarCollapsed && <span style={{ display: 'none' }} className="mobile-only-date">{currentDate}</span>}
              </div>
              <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }}></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="icon-btn" onClick={() => setIsKMOpen(true)} title="開啟 TUC 知識庫手冊" style={{ color: 'var(--tuc-red)' }}>
                  <BookOpen size={16} />
                </button>
                <label className="icon-btn" style={{ cursor: 'pointer' }} title="導入專案 (.json)">
                  <Upload size={16} /><input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
                </label>
                <button className="icon-btn" onClick={handleExportJSON} title="儲存專案 (.json)"><Download size={16} /></button>
              </div>
            </div>
          </header>

          {/* 編輯區域 */}
          <div className="form-content-wrap">
            {activeTab === 0 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={20} /> 基本資訊與請購項目
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="input-with-label">
                    <label><Building2 size={14} /> 申請單位</label>
                    <input type="text" value={data.department} onChange={(e) => updateField('department', e.target.value)} placeholder="記憶已啟用..." />
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

                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>一. 名稱 (請購細目)</h4>
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
                  <SectionEditor label="需求說明" value={data.requirementDesc} onChange={(v) => updateField('requirementDesc', v)} required />
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <SectionEditor 
                    label="二. 品相" 
                    value={data.appearance} 
                    onChange={(v) => updateField('appearance', v)} 
                    tucHints={data.appearanceTUCHints}
                    historyHints={data.appearanceHistoryHints}
                    onTUCHintToggle={(id) => toggleTUCHint('appearanceTUCHints', 'appearance', id)}
                    onHistoryHintToggle={(id) => toggleHistoryHint('appearanceHistoryHints', 'appearance', id)}
                  />
                  <SectionEditor label="三. 數量、單位" value={data.quantityUnit} onChange={(v) => updateField('quantityUnit', v)} isTextArea={false} />
                  <SectionEditor label="四. 工程適用範圍 (Scope)" value={data.equipmentName} onChange={(v) => updateField('equipmentName', v)} />
                  <SectionEditor 
                    label="五. 工程(或設備)適用區間 (Range)" 
                    value={data.rangeRange} 
                    onChange={(v) => updateField('rangeRange', v)} 
                    tucHints={data.rangeTUCHints}
                    historyHints={data.rangeHistoryHints}
                    onTUCHintToggle={(id) => toggleTUCHint('rangeTUCHints', 'rangeRange', id)}
                    onHistoryHintToggle={(id) => toggleHistoryHint('rangeHistoryHints', 'rangeRange', id)}
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
                     tucHints={data.envTUCHints}
                     historyHints={data.envHistoryHints}
                     onTUCHintToggle={(id) => toggleTUCHint('envTUCHints', 'envRequirements', id)}
                     onHistoryHintToggle={(id) => toggleHistoryHint('envHistoryHints', 'envRequirements', id)}
                  />
                  <SectionEditor 
                     label="2. 法規要求" 
                     value={data.regRequirements} 
                     onChange={(v) => updateField('regRequirements', v)} 
                     tucHints={data.regTUCHints}
                     historyHints={data.regHistoryHints}
                     onTUCHintToggle={(id) => toggleTUCHint('regTUCHints', 'regRequirements', id)}
                     onHistoryHintToggle={(id) => toggleHistoryHint('regHistoryHints', 'regRequirements', id)}
                  />
                  <SectionEditor 
                     label="3. 維護要求" 
                     value={data.maintRequirements} 
                     onChange={(v) => updateField('maintRequirements', v)} 
                     tucHints={data.maintTUCHints}
                     historyHints={data.maintHistoryHints}
                     onTUCHintToggle={(id) => toggleTUCHint('maintTUCHints', 'maintRequirements', id)}
                     onHistoryHintToggle={(id) => toggleHistoryHint('maintHistoryHints', 'maintRequirements', id)}
                  />
                </div>

                <div className="doc-section-box" style={{ marginBottom: '2rem' }}>
                  <h4 className="section-title"><ShieldCheck size={16} /> 七. 安全要求</h4>
                  <SectionEditor 
                     label="安全要求內容" 
                     value={data.safetyRequirements} 
                     onChange={(v) => updateField('safetyRequirements', v)} 
                     tucHints={data.safetyTUCHints}
                     historyHints={data.safetyHistoryHints}
                     onTUCHintToggle={(id) => toggleTUCHint('safetyTUCHints', 'safetyRequirements', id)}
                     onHistoryHintToggle={(id) => toggleHistoryHint('safetyHistoryHints', 'safetyRequirements', id)}
                  />
                </div>

                <div className="doc-section-box">
                  <h4 className="section-title"><Zap size={16} /> 八. 特性要求</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <SectionEditor 
                       label="1. 電氣特性規格" 
                       value={data.elecSpecs} 
                       onChange={(v) => updateField('elecSpecs', v)} 
                       tucHints={data.elecTUCHints}
                       historyHints={data.elecHistoryHints}
                       onTUCHintToggle={(id) => toggleTUCHint('elecTUCHints', 'elecSpecs', id)}
                       onHistoryHintToggle={(id) => toggleHistoryHint('elecHistoryHints', 'elecSpecs', id)}
                    />
                    <SectionEditor 
                       label="2. 機構特性規格" 
                       value={data.mechSpecs} 
                       onChange={(v) => updateField('mechSpecs', v)} 
                       tucHints={data.mechTUCHints}
                       historyHints={data.mechHistoryHints}
                       onTUCHintToggle={(id) => toggleTUCHint('mechTUCHints', 'mechSpecs', id)}
                       onHistoryHintToggle={(id) => toggleHistoryHint('mechHistoryHints', 'mechSpecs', id)}
                    />
                    <SectionEditor 
                       label="3. 物理特性規格" 
                       value={data.physSpecs} 
                       onChange={(v) => updateField('physSpecs', v)} 
                       placeholder="預設：依台燿規定"
                       tucHints={data.physTUCHints}
                       historyHints={data.physHistoryHints}
                       onTUCHintToggle={(id) => toggleTUCHint('physTUCHints', 'physSpecs', id)}
                       onHistoryHintToggle={(id) => toggleHistoryHint('physHistoryHints', 'physSpecs', id)}
                    />
                    <SectionEditor 
                       label="4. 信賴特性規格" 
                       value={data.relySpecs} 
                       onChange={(v) => updateField('relySpecs', v)} 
                       placeholder="預設：依台燿規定"
                       tucHints={data.relyTUCHints}
                       historyHints={data.relyHistoryHints}
                       onTUCHintToggle={(id) => toggleTUCHint('relyTUCHints', 'relySpecs', id)}
                       onHistoryHintToggle={(id) => toggleHistoryHint('relyHistoryHints', 'relySpecs', id)}
                    />
                  </div>
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
                   tucHints={data.installTUCHints}
                   historyHints={data.installHistoryHints}
                   onTUCHintToggle={(id) => toggleTUCHint('installTUCHints', 'installStandard', id)}
                   onHistoryHintToggle={(id) => toggleHistoryHint('installHistoryHints', 'installStandard', id)}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <SectionEditor label="完工日期" value={data.deliveryDate} onChange={(v) => updateField('deliveryDate', v)} isTextArea={false} inputType="date" />
                  <SectionEditor label="工期（天）" value={data.workPeriod} onChange={(v) => updateField('workPeriod', v)} isTextArea={false} />
                </div>
                {/* 驗收欄位移回此處 */}
                <SectionEditor 
                  label="驗收要求" 
                  value={data.acceptanceDesc} 
                  onChange={(v) => updateField('acceptanceDesc', v)} 
                  tucHints={data.acceptanceTUCHints}
                  historyHints={data.acceptanceHistoryHints}
                  onTUCHintToggle={(id) => toggleTUCHint('acceptanceTUCHints', 'acceptanceDesc', id)}
                  onHistoryHintToggle={(id) => toggleHistoryHint('acceptanceHistoryHints', 'acceptanceDesc', id)}
                />
                <SectionEditor 
                   label="十. 遵守事項" 
                   value={data.complianceDesc} 
                   onChange={(v) => updateField('complianceDesc', v)} 
                   tucHints={data.complianceTUCHints}
                   historyHints={data.complianceHistoryHints}
                   onTUCHintToggle={(id) => toggleTUCHint('complianceTUCHints', 'complianceDesc', id)}
                   onHistoryHintToggle={(id) => toggleHistoryHint('complianceHistoryHints', 'complianceDesc', id)}
                />
              </div>
            )}

            {activeTab === 3 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>十一. 圖說與十二. 表格</h3>
                <ImageUpload images={data.images} onChange={(imgs) => updateField('images', imgs)} />
                <div style={{ marginTop: '2.5rem' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem' }}>十二. 驗收要求</h4>
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
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>會簽矩陣</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                    {data.signOffGrid.map((row, ri) => row.map((cell, ci) => (
                      <div key={`${ri}-${ci}`} style={{ border: '1px solid var(--border-color)', minHeight: '45px', display: 'flex', alignItems: 'center', background: isDropdownCell(ri, ci) ? 'rgba(230,0,18,0.05)' : 'transparent' }}>
                        {isDropdownCell(ri, ci) ? (
                          <select 
                            value={cell} 
                            onChange={(e) => updateSignOff(ri, ci, e.target.value)} 
                            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', color: 'white', fontSize: '0.8rem', textAlign: 'center' }}
                          >
                            <option value="">單位</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            value={cell} 
                            onChange={(e) => updateSignOff(ri, ci, e.target.value)} 
                            style={{ width: '100%', height: '35px', border: 'none', background: 'transparent', color: 'white', textAlign: 'center', fontSize: '0.8rem' }} 
                          />
                        )}
                      </div>
                    )))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 5 && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FolderOpen size={20} /> 歷史檔案內容歸納
                </h3>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  {uploadingFile ? <Loader2 className="animate-spin" size={32} color="var(--tuc-red)" /> : (
                    <>
                      <FileUp size={48} color="#555" style={{ marginBottom: '1rem' }} />
                      <label className="primary-button" style={{ display: 'inline-flex', cursor: 'pointer', padding: '0.75rem 2rem' }}>
                        選取檔案上傳 <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                      <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>支援 PDF 或 Docx 格式</p>
                    </>
                  )}
                </div>
                
                <div style={{ marginTop: '2.5rem' }}>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'white' }}>{f.displayName}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>原始檔名: {f.name}</span>
                      </div>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#60A5FA', textDecoration: 'none', background: 'rgba(96,165,250,0.1)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>檢視檔案</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 底部導航按鈕 */}
          <footer className="form-footer-nav">
            <button 
              disabled={activeTab === 0} 
              onClick={() => setActiveTab(prev => prev - 1)} 
              className="ghost-button"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: activeTab === 0 ? 'rgba(255,255,255,0.2)' : 'white', cursor: activeTab === 0 ? 'default' : 'pointer' }}
            >
              <ChevronLeft size={20} /> 上一步
            </button>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              章節 {activeTab + 1} / {tabs.length}
            </div>
            <button 
              onClick={() => activeTab < tabs.length - 1 && setActiveTab(prev => prev + 1)} 
              className="primary-button"
              style={{ width: 'auto', padding: '0.6rem 2rem' }}
            >
              下一步 <ChevronRight size={20} />
            </button>
          </footer>
        </main>
      </div>

      <KnowledgeModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} />
    </div>
  );
};

export default SpecForm;
