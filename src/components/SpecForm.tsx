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
  Square,
  ShieldAlert,
  Book,
  Loader2
} from 'lucide-react';
import { t } from '../lib/i18n';
import SectionEditor from './SectionEditor';
import SpecTable from './SpecTable';
import ImageUpload from './ImageUpload';
import * as KP from '../lib/knowledgeParser';
import type { FormState, AIHintSelection } from '../types/form';
import { INITIAL_FORM_STATE } from '../types/form';
import { DatabaseImportModal } from './DatabaseImportModal';

// ============================================================
// V27.8: 雲端載入時的智慧合併工具函式
// ============================================================

/** 字元 Bigram Jaccard 相似度（0-1），適用於中文技術文字比對 */
const bigramJaccard = (a: string, b: string): number => {
  const getBigrams = (s: string): Set<string> => {
    const cleaned = s.replace(/\s+/g, '');
    const set = new Set<string>();
    for (let i = 0; i < cleaned.length - 1; i++) {
      set.add(cleaned[i] + cleaned[i + 1]);
    }
    return set;
  };
  const aSet = getBigrams(a);
  const bSet = getBigrams(b);
  if (aSet.size === 0 && bSet.size === 0) return 1;
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let intersection = 0;
  for (const bigram of aSet) {
    if (bSet.has(bigram)) intersection++;
  }
  return intersection / (aSet.size + bSet.size - intersection);
};

/**
 * V27.8: 保留預設條文的智慧合併
 * - 對載入內容逐段與預設條文比對
 * - 相似度 ≥ threshold → 捨棄（已被預設涵蓋）
 * - 相似度 < threshold → 保留並附加於預設文字之後
 */
const smartMergePreservingDefault = (
  defaultKey: string,
  importedContent: string,
  threshold: number = 0.75
): string => {
  // 以 zh-TW 版本為基準進行比對（雲端儲存的資料多為繁體中文）
  const defaultText = t(defaultKey, 'zh-TW');

  // V27.8a: 回傳 defaultText（實際文字）而非 key，確保編輯區顯示完整系統預設條文
  if (!importedContent || importedContent.startsWith('default') || importedContent.trim() === defaultText.trim()) {
    return defaultText;
  }

  const defaultParagraphs = defaultText.split('\n').filter(p => p.trim());
  const importedParagraphs = importedContent.split('\n').filter(p => p.trim());

  // 對每段載入內容求與所有預設段落的最高相似度
  const newParagraphs = importedParagraphs.filter(importedPara => {
    if (!importedPara.trim()) return false;
    const maxSim = Math.max(...defaultParagraphs.map(dp => bigramJaccard(importedPara, dp)));
    return maxSim < threshold; // 相似度不到門殾→保留（為新內容）
  });

  if (newParagraphs.length === 0) {
    return defaultText; // 所有內容都被預設涵蓋，回傳完整預設條文
  }

  // 預設條文 + 差異內容附加其後
  return defaultText + '\n' + newParagraphs.join('\n');
};

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
  isSyncBlocked?: boolean;
}

const CompactThreshold: React.FC<{ 
  value: number, 
  onChange: (val: number) => void,
  label: string,
  icon?: React.ReactNode
}> = ({ value, onChange, label, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <div 
      ref={containerRef}
      className="compact-threshold-container"
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', marginLeft: '6px' }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          padding: '1px 6px', 
          background: isOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', 
          borderRadius: '6px',
          fontSize: '0.7rem',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.1)',
          color: value >= 0.6 ? '#10B981' : (value >= 0.3 ? '#F59E0B' : '#EF4444'),
          transition: 'all 0.2s',
          fontWeight: 'bold'
        }}
      >
        {icon || <Zap size={10} />}
        <span>{Math.round(value * 100)}%</span>
      </div>
      
      {isOpen && (
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
            style={{ width: '100%', accentColor: 'var(--tuc-red)', height: '4px', cursor: 'grab' }}
          />
        </div>
      )}
    </div>
  );
};

const SpecForm: React.FC<Props> = ({ data, onChange, isSyncBlocked = false }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [isDbImportModalOpen, setIsDbImportModalOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);
  const [isImportTranslating, setIsImportTranslating] = React.useState(false);

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
      'acceptanceExtra', 'complianceDesc', 'contractorNotice'
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

    // V20: 自動修補缺失的欄位
    if (newData.contractorNotice === undefined || newData.contractorNotice === null || newData.contractorNotice === '') {
      newData.contractorNotice = 'defaultContractorNotice';
      needsUpdate = true;
    }

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
  const abortedRef = React.useRef(false);

  const handleAbortAnalysis = () => {
    abortedRef.current = true;
    setIsAnalyzing(false);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const departments = ['生產部', '工程部', '工安部', '設備部', '品保部', '研發部', 'PRD', '採購部'];
  const deptKeyMap: Record<string, string> = {
    '生產部': 'dept_Production',
    '工程部': 'dept_Engineering',
    '工安部': 'dept_Safety',
    '設備部': 'dept_Equipment',
    '品保部': 'dept_Quality',
    '研發部': 'dept_RD',
    'PRD': 'dept_PRD',
    '採購部': 'dept_Purchasing'
  };

  const loadHistoryHints = async (mode: number | 'all') => {
    if (isAnalyzing) return;
    abortedRef.current = false;
    setIsAnalyzing(true);
    const categoryMap: Record<number, {key: keyof FormState, regKey: keyof FormState, category: string, contextKeywords: string[]}[]> = {
      0: [
        { key: 'appearanceHistoryHints', regKey: 'appearanceRegHints', category: 'appearance', contextKeywords: ['外觀', '材質', '顏色', '尺寸', 'Appearance', 'Material'] },
        { key: 'requirementDescHistoryHints', regKey: 'requirementDescRegHints', category: 'technical', contextKeywords: ['需求', '說明', '功能', 'Requirement', 'Description'] }
      ],
      1: [
        { key: 'envHistoryHints', regKey: 'envRegHints', category: 'environmental', contextKeywords: ['環保', '節能', '回收', 'RoHS', 'REACH', 'Environmental', 'Green'] },
        { key: 'regHistoryHints', regKey: 'regRegHints', category: 'technical', contextKeywords: ['法規', '法令', '合規', 'Regulation', 'Standard', 'Compliance'] },
        { key: 'maintHistoryHints', regKey: 'maintRegHints', category: 'technical', contextKeywords: ['維修', '保養', '保固', 'Maintenance', 'Service', 'Warranty'] },
        { key: 'safetyHistoryHints', regKey: 'safetyRegHints', category: 'safety', contextKeywords: ['安全', '防護', '緊急', '勞安', 'Safety', 'Protection', 'Emergency'] },
        { key: 'elecHistoryHints', regKey: 'elecRegHints', category: 'technical', contextKeywords: ['電力', '電氣', '控制', '電壓', 'Electrical', 'Power', 'Voltage'] },
        { key: 'mechHistoryHints', regKey: 'mechRegHints', category: 'technical', contextKeywords: ['機械', '機構', '結構', '尺寸', 'Mechanical', 'Structure'] },
        { key: 'physHistoryHints', regKey: 'physRegHints', category: 'technical', contextKeywords: ['物理', '重量', '材質', '硬度', 'Physical', 'Weight', 'Material'] },
        { key: 'relyHistoryHints', regKey: 'relyRegHints', category: 'technical', contextKeywords: ['信賴性', '壽命', '測試', 'Reliability', 'Testing', 'Lifespan'] },
        { key: 'rangeHistoryHints', regKey: 'rangeRegHints', category: 'technical', contextKeywords: ['範圍', '區間', '區域', 'Scope', 'Range', 'Area'] }
      ],
      2: [
        { key: 'installHistoryHints', regKey: 'installRegHints', category: 'installation', contextKeywords: ['安裝', '施工', '裝機', '配線', 'Installation', 'Construction'] },
        { key: 'complianceHistoryHints', regKey: 'complianceRegHints', category: 'compliance', contextKeywords: ['遵守', '規範', '政策', 'Compliance', 'Policy'] }
      ],
      3: [{ key: 'acceptanceHistoryHints', regKey: 'acceptanceRegHints', category: 'technical', contextKeywords: ['驗收', '測試', '標準', 'Acceptance', 'Testing', 'Verification'] }]
    };

    let targets: {key: keyof FormState, regKey: keyof FormState, category: string, contextKeywords: string[]}[] = [];
    if (mode === 'all') {
      targets = Object.values(categoryMap).flat();
    } else {
      targets = categoryMap[mode] || [];
    }
    
    if (targets.length === 0) {
      setIsAnalyzing(false);
      return;
    }

    const initialStatus = { ...data.searchStatus };
    targets.forEach((t: {key: keyof FormState, regKey: keyof FormState, category: string, contextKeywords: string[]}) => { 
      initialStatus[t.key as string] = 'pending';
      initialStatus[t.regKey as string] = 'pending';
    });
    onChange({ ...data, searchStatus: initialStatus });

    const apiKeys = KP.getGeminiKeyPool();

    try {
      // --- 中斷點 1: 開始翻譯前 ---
      if (abortedRef.current) return;

      // 1. One API call for expanding queries (or loaded from Local cache)
      const transStatus = { ...initialStatus };
      targets.forEach((t: {key: keyof FormState, regKey: keyof FormState, category: string, contextKeywords: string[]}) => { transStatus[t.key as string] = 'translating'; transStatus[t.regKey as string] = 'translating'; });
      onChange({...data, searchStatus: transStatus});
      
      const variants = await KP.translateSearchQueries(data.equipmentName, data.requirementDesc, apiKeys);

      // --- 中斷點 2: 翻譯完成後 ---
      if (abortedRef.current) return;

      // 2. Perform all Local Supabase Database queries concurrently
      const allResults = await Promise.all(targets.map(async (target: {key: keyof FormState, regKey: keyof FormState, category: string, contextKeywords: string[]}) => {
        try {
          const fieldReqVariants = [...variants.reqVariants];
          if (target.contextKeywords && target.contextKeywords.length > 0) {
            target.contextKeywords.forEach((kw: string) => {
              if (!fieldReqVariants.includes(kw)) {
                fieldReqVariants.push(kw);
              }
            });
            variants.reqVariants.forEach((rv: string) => {
              target.contextKeywords.slice(0, 2).forEach((kw: string) => {
                fieldReqVariants.push(`${rv} ${kw}`);
              });
            });
          }

          const res = await KP.getHistorySuggestions(
            target.category, 
            variants.eqVariants, 
            fieldReqVariants, 
            data.matchThresholdHistory, 
            data.matchThresholdReg
          );
          return { target, res };
        } catch (err) {
          return { target, res: { hints: [], status: 'ai_error' as const } };
        }
      }));

      // --- 中斷點 3: 資料庫查詢完成後 ---
      if (abortedRef.current) return;

      // 3. Collect ALL found hints for batched translation
      let allHintsToTranslate: AIHintSelection[] = [];
      allResults.forEach(r => { 
        allHintsToTranslate = allHintsToTranslate.concat(r.res.hints); 
      });

      // 4. One API call to translate everything back to UI language
      if (allHintsToTranslate.length > 0 && apiKeys) {
        const translatedAll = await KP.translateHints(allHintsToTranslate, data.language, apiKeys);
        
        // --- 中斷點 4: 翻譯條文完成後 ---
        if (abortedRef.current) return;

        let ptr = 0;
        allResults.forEach(r => {
          r.res.hints = translatedAll.slice(ptr, ptr + r.res.hints.length);
          ptr += r.res.hints.length;
        });
      }

      // 5. Commit to state (只在未中斷時執行)
      if (!abortedRef.current) {
        const nextData = { ...data, searchStatus: { ...data.searchStatus } };
        allResults.forEach(({ target, res }) => {
          (nextData as any)[target.key] = res.hints.filter((h: AIHintSelection) => h.docType === 'Specific');
          (nextData as any)[target.regKey] = res.hints.filter((h: AIHintSelection) => h.docType !== 'Specific');
          nextData.searchStatus[target.key as string] = res.status;
          nextData.searchStatus[target.regKey as string] = res.status;
        });
        onChange(nextData);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
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

  const cleanHintContent = (raw: string): string =>
    raw
      .split('\n')
      .filter(line => line.trim() !== '' && line.trim() !== '---')
      .join('\n')
      .trim();

  const toggleHint = (hintField: keyof FormState, contentField: keyof FormState, hintId: string) => {
    const currentHints = (data[hintField] as AIHintSelection[]) || [];
    const targetHint = currentHints.find(h => String(h.id) === String(hintId));
    if (!targetHint) return;

    const newSelected = !targetHint.selected;
    const nextHints = currentHints.map(h =>
      String(h.id) === String(hintId) ? { ...h, selected: newSelected } : h
    );

    let nextContent = (data[contentField] as string) || '';
    const hintText = cleanHintContent(targetHint.content);

    // V27.8: 若欄位目前儲存的是 i18n default key（以 'default' 開頭），視為空白處理
    // 避免 key 字串被拼入正文後無法被 v() 翻譯，顯示為 'defaultAccordingToTuc' 等
    const isDefaultKey = nextContent.startsWith('default');
    // 記錄此欄位的原始預設 key，供移除後還原
    const originalDefaultKey = (INITIAL_FORM_STATE[contentField] as string) || '';

    if (newSelected) {
      // 若目前為預設 key，起始內容視為空白，直接以 hintText 取代
      const baseContent = isDefaultKey ? '' : nextContent.trimEnd();
      const separator = baseContent ? '\n' : '';
      nextContent = baseContent + separator + hintText;
    } else {
      nextContent = nextContent.replace(hintText, '');
      nextContent = nextContent.replace(targetHint.content.trim(), '');
      nextContent = cleanHintContent(nextContent);
      // V27.8: 移除後若欄位清空，且此欄位本有 default key，則還原預設值
      if (!nextContent && originalDefaultKey.startsWith('default')) {
        nextContent = originalDefaultKey;
      }
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
    if (confirm(t('confirmReset', data.language))) {
      onChange(INITIAL_FORM_STATE);
      setSyncStatus({ type: 'success', message: t('resetSuccess', data.language) });
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
        // V20: 導入時與初始狀態合併，確保新欄位不會因舊 JSON 缺失而消失
        const mergedData = { ...INITIAL_FORM_STATE, ...importedData };
        onChange(mergedData);
        setIsExportMenuOpen(false);
      } catch (error) {
        alert(t('invalidJson', data.language));
      }
    };
    reader.readAsText(file);
  };

  const handleSyncToKnowledge = async () => {
    if (!data.equipmentName || !data.requirementDesc) {
      setSyncStatus({ type: 'error', message: t('syncErrorReq', data.language) });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });

    try {
      const result = await KP.syncFormDataToKnowledge(data);
      setSyncStatus({ 
        type: 'success', 
        message: t('syncSuccessBatch', data.language)
          .replace('{n}', result.count.toString())
          .replace('{id}', result.docId.substring(0,8))
      });
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: `${t('syncFail', data.language)} ${err.message}` });
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
                    onClick={() => isAnalyzing ? handleAbortAnalysis() : loadHistoryHints('all')}
                    className="primary-button"
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                      background: isAnalyzing
                        ? 'linear-gradient(135deg, #7F1D1D 0%, #450a0a 100%)'
                        : 'linear-gradient(135deg, var(--tuc-red) 0%, #B91C1C 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      width: 'auto',
                      border: isAnalyzing ? '1px solid rgba(239,68,68,0.4)' : undefined
                    }}
                  >
                    {isAnalyzing
                      ? <><Square size={12} fill="currentColor" /> {t('aiAbort', data.language)}</>  
                      : <><Repeat size={14} className={isAnalyzing ? 'animate-spin' : ''} /> {t('regenerate', data.language)}</>  
                    }
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
                    <SectionEditor 
                      label={t('equipName', data.language)} 
                      value={data.equipmentName} 
                      onChange={(v: string) => updateField('equipmentName', v)} 
                      isTextArea={false} 
                      addon={<CompactThreshold value={data.matchThresholdHistory} onChange={(v) => updateField('matchThresholdHistory', v)} label={t('aiHistory', data.language)} />}
                      language={data.language}
                    />
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
                <SectionEditor 
                   label={t('contractorNotice', data.language)} 
                   value={data.contractorNotice} 
                   onChange={(v: string) => updateField('contractorNotice', v)} 
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
                            {departments.map((d: string) => <option key={d} value={d}>{t(deptKeyMap[d], data.language)}</option>)}
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
                  
                  {!isSyncBlocked ? (
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
                  ) : (
                    <div style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '1.1rem', padding: '1rem' }}>
                      {/* 當資源滿載時自動隱藏按鈕，並顯示系統限制訊息 */}
                      ⚠️ {t('warningHighUsage', data.language)}
                    </div>
                  )}

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
        onSelect={async (rawImportedData: any) => {
          setIsImportTranslating(true);
          const apiKey = localStorage.getItem('tuc_gemini_key') || '';
          let importedData = rawImportedData;

          // V17.4: 自動內容轉譯 - 若語系不符，將整個規格內容送交 AI 轉譯
          if (data.language !== 'zh-TW' && apiKey) {
            try {
              importedData = await KP.translateFullSpec(rawImportedData, data.language, apiKey);
            } catch (err) {
              console.error('[AI Content Translation] Failed:', err);
            }
          }
          setIsImportTranslating(false);

          // V12.6: 深度防禦 - 確保所有欄位型別安全，防止物件/陣列被誤傳給 .startsWith() 導致黑屏
          const STRING_FIELDS = [
            'equipmentName', 'requirementDesc', 'appearance', 'quantityUnit',
            'equipmentScope', 'rangeRange', 'envRequirements', 'regRequirements',
            'maintRequirements', 'safetyRequirements', 'elecSpecs', 'mechSpecs',
            'physSpecs', 'relySpecs', 'installStandard', 'workPeriod',
            'acceptanceDesc', 'complianceDesc', 'department', 'requester',
            'extension', 'category', 'deliveryDate',
            'applicantName', 'deptHeadName', 'needsDrawing', 'docId'
          ];
          const formatValue = (val: any): string => {
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return val;
            if (Array.isArray(val)) {
              return val.map(v => formatValue(v)).filter(v => v && v.trim() !== '').join('\n');
            }
            if (typeof val === 'object') {
              return Object.entries(val)
                .map(([k, v]) => {
                  const vStr = formatValue(v);
                  if (!vStr || vStr.trim() === '') return '';
                  // 如果 Key 是 camelCase (如 testCriteria) 或者是單純的索引，只保留 Value
                  const isTechnicalKey = /^[a-z]+[A-Z]/.test(k) || /^\d+$/.test(k) || k.length > 20;
                  return isTechnicalKey ? vStr : `${k}: ${vStr}`;
                })
                .filter(Boolean)
                .join('\n');
            }
            return String(val);
          };

          const cleanImported = Object.entries(importedData).reduce((acc: any, [key, value]) => {
            if (STRING_FIELDS.includes(key)) {
              acc[key] = formatValue(value);
            } else {
              acc[key] = value;
            }
            return acc;
          }, {});

          // V27.8: 對「安裝標準」與「遵守事項」執行智慧合併
          // 保留預設條文，載入內容與預設相似度 < 75% 的段落才附加于後
          const SMART_MERGE_FIELDS: { field: string; defaultKey: string }[] = [
            { field: 'installStandard', defaultKey: 'defaultInstallStd' },
            { field: 'complianceDesc',  defaultKey: 'defaultCompliance'  },
          ];
          SMART_MERGE_FIELDS.forEach(({ field, defaultKey }) => {
            const importedValue = cleanImported[field];
            if (typeof importedValue === 'string') {
              cleanImported[field] = smartMergePreservingDefault(defaultKey, importedValue, 0.75);
            } else {
              // 沒有載入內容，保留預設 key
              cleanImported[field] = defaultKey;
            }
          });

          const merged: FormState = {
            ...INITIAL_FORM_STATE,
            // V27.7: 從 INITIAL_FORM_STATE 開始，先保留使用者設定（語系、部門、門檻），
            // 再以雲端資料全量覆蓋表單欄位，避免舊有欄位殘留干擾
            language: data.language,
            department: data.department,
            matchThresholdHistory: data.matchThresholdHistory,
            matchThresholdReg: data.matchThresholdReg,
            ...cleanImported,
            searchStatus: {}
          };
          onChange(merged);
        }}
        language={data.language}
      />

      {isImportTranslating && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto 1rem', color: 'var(--tuc-red)' }} />
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>{t('aiTranslatingContent', data.language)}</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>{t('aiTranslatingHint', data.language)}</p>
          </div>
        </div>
      )}

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

export default React.memo(SpecForm);
