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
  Package, ShieldCheck, Zap, FileUp
} from 'lucide-react';

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
}

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isKMOpen, setIsKMOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string}[]>([]);

  const departments = ['生產部', '工程部', '工安部', '設備部', '品保部', '研發部', 'PRD', '採購部'];

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

  useEffect(() => {
    const formContainer = document.querySelector('.form-content-area');
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
    { label: '資產檔案', icon: <FolderOpen size={18} /> },
  ];

  const updateField = (field: keyof FormState, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleTUCHint = (field: keyof FormState, contentField: keyof FormState, hintId: string) => {
    const hints = (data[field] as AIHintSelection[]).map(h => 
      h.id === hintId ? { ...h, selected: !h.selected } : h
    );
    
    // 如果選中，自動加入主內容並取消標籤 (直接併入文字)
    const selectedHint = (data[field] as AIHintSelection[]).find(h => h.id === hintId);
    if (selectedHint && !selectedHint.selected) {
      const currentText = data[contentField] as string;
      const separator = currentText ? '\n' : '';
      updateField(contentField, currentText + separator + selectedHint.content);
    }
    
    updateField(field, hints);
  };

  const updateSignOff = (row: number, col: number, value: string) => {
    const newGrid = data.signOffGrid.map((r, ri) => 
      ri === row ? r.map((c, ci) => ci === col ? value : c) : r
    );
    updateField('signOffGrid', newGrid);
  };

  const isDropdownCell = (row: number, col: number) => {
    const targets = ['0-0', '0-2', '1-0', '1-2', '2-0', '2-2'];
    return targets.includes(`${row}-${col}`);
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
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    setUploadingFile(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('spec-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('spec-files')
        .getPublicUrl(fileName);

      setUploadedFiles(prev => [...prev, { name: file.name, url: publicUrl }]);
      alert('檔案上傳成功！');
    } catch (err) {
      console.error(err);
      alert('上傳失敗。');
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="form-section glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* 頁籤導覽列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', flexShrink: 0, paddingRight: '1rem' }}>
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(index)}
              style={{
                padding: '1rem 1.25rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === index ? '2px solid var(--tuc-red)' : '2px solid transparent',
                color: activeTab === index ? 'var(--tuc-red)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                fontSize: '0.9rem',
                fontWeight: activeTab === index ? '600' : '400'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 主要編輯區 - 全寬 */}
        <div className="form-content-area" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', scrollbarWidth: 'thin' }}>
          
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
                  onTUCHintToggle={(id) => toggleTUCHint('appearanceTUCHints', 'appearance', id)}
                />
                <SectionEditor label="三. 數量、單位" value={data.quantityUnit} onChange={(v) => updateField('quantityUnit', v)} isTextArea={false} />
                <SectionEditor label="四. 工程適用範圍 (Scope)" value={data.equipmentName} onChange={(v) => updateField('equipmentName', v)} />
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
                   onTUCHintToggle={(id) => toggleTUCHint('envTUCHints', 'envRequirements', id)}
                />
                <SectionEditor 
                   label="2. 法規要求" 
                   value={data.regRequirements} 
                   onChange={(v) => updateField('regRequirements', v)} 
                   tucHints={data.regTUCHints}
                   onTUCHintToggle={(id) => toggleTUCHint('regTUCHints', 'regRequirements', id)}
                />
                <SectionEditor 
                   label="3. 維護要求" 
                   value={data.maintRequirements} 
                   onChange={(v) => updateField('maintRequirements', v)} 
                   tucHints={data.maintTUCHints}
                   onTUCHintToggle={(id) => toggleTUCHint('maintTUCHints', 'maintRequirements', id)}
                />
              </div>

              <div className="doc-section-box" style={{ marginBottom: '2rem' }}>
                <h4 className="section-title"><ShieldCheck size={16} /> 七. 安全要求</h4>
                <SectionEditor 
                   label="安全要求內容" 
                   value={data.safetyRequirements} 
                   onChange={(v) => updateField('safetyRequirements', v)} 
                   tucHints={data.safetyTUCHints}
                   onTUCHintToggle={(id) => toggleTUCHint('safetyTUCHints', 'safetyRequirements', id)}
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
                     onTUCHintToggle={(id) => toggleTUCHint('elecTUCHints', 'elecSpecs', id)}
                  />
                  <SectionEditor 
                     label="2. 機構特性規格" 
                     value={data.mechSpecs} 
                     onChange={(v) => updateField('mechSpecs', v)} 
                     tucHints={data.mechTUCHints}
                     onTUCHintToggle={(id) => toggleTUCHint('mechTUCHints', 'mechSpecs', id)}
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
                 onTUCHintToggle={(id) => toggleTUCHint('installTUCHints', 'installStandard', id)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <SectionEditor label="完工日期" value={data.deliveryDate} onChange={(v) => updateField('deliveryDate', v)} isTextArea={false} inputType="date" />
                <SectionEditor label="工期（天）" value={data.workPeriod} onChange={(v) => updateField('workPeriod', v)} isTextArea={false} />
              </div>
              <SectionEditor 
                 label="十. 遵守事項" 
                 value={data.complianceDesc} 
                 onChange={(v) => updateField('complianceDesc', v)} 
                 tucHints={data.complianceTUCHints}
                 onTUCHintToggle={(id) => toggleTUCHint('complianceTUCHints', 'complianceDesc', id)}
              />
            </div>
          )}

          {activeTab === 3 && (
            <div className="tab-pane">
              <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>十一. 圖說與十二. 表格</h3>
              <ImageUpload images={data.images} onChange={(imgs) => updateField('images', imgs)} />
              <div style={{ marginTop: '2.5rem' }}>
                <SectionEditor 
                  label="十二. 驗收要求 (建議事項)" 
                  value={data.acceptanceDesc} 
                  onChange={(v) => updateField('acceptanceDesc', v)} 
                  tucHints={data.acceptanceTUCHints}
                  onTUCHintToggle={(id) => toggleTUCHint('acceptanceTUCHints', 'acceptanceDesc', id)}
                />
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
                <h4 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>會簽矩陣 (4 x 6)</h4>
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
                <FolderOpen size={20} /> 檔案管理中心
              </h3>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                {uploadingFile ? <Loader2 className="animate-spin" size={32} color="var(--tuc-red)" /> : (
                  <>
                    <FileUp size={48} color="#555" style={{ marginBottom: '1rem' }} />
                    <label className="primary-button" style={{ display: 'inline-flex', cursor: 'pointer', padding: '0.75rem 2rem' }}>
                      選取檔案上傳 <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </>
                )}
              </div>
              
              <div style={{ marginTop: '2.5rem' }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{f.name}</span>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#60A5FA', textDecoration: 'none', background: 'rgba(96,165,250,0.1)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>檢視檔案</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部導覽列 */}
      <div style={{ borderTop: '1px solid var(--border-color)', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button disabled={activeTab === 0} onClick={() => setActiveTab(prev => prev - 1)} className="ghost-button">
          <ChevronLeft size={20} /> 上一區塊
        </button>
        <button 
          onClick={() => activeTab < tabs.length - 1 && setActiveTab(prev => prev + 1)} 
          className="primary-button"
        >
          下一步 <ChevronRight size={20} />
        </button>
      </div>

      {/* 知識庫彈窗 */}
      <KnowledgeModal isOpen={isKMOpen} onClose={() => setIsKMOpen(false)} />
    </div>
  );
};

export default SpecForm;
