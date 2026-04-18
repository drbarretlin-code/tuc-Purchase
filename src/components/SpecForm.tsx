import React, { useState, useEffect } from 'react';
import type { FormState, 工程類別 } from '../types/form';
import SectionEditor from './SectionEditor';
import ImageUpload from './ImageUpload';
import SpecTable from './SpecTable';
import tucKnowledge from '../data/tuc_knowledge.json';
import { supabase } from '../lib/supabase';
import { 
  Info, Settings, HardHat, Hammer, Table, 
  ChevronRight, ChevronLeft, User, Building2, Hash, PenTool,
  BookOpen, Download, Upload, ExternalLink, Search, FileUp, FolderOpen, Loader2
} from 'lucide-react';

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
}

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string}[]>([]);

  const departments = ['生產部', '工程部', '工安部', '設備部', '品保部', '研發部', 'PRD', '採購部'];

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
      alert('上傳失敗，請確認 Supabase Storage 已建立 "spec-files" Bucket 並設定為 Public。');
    } finally {
      setUploadingFile(false);
    }
  };

  const filteredKnowledge = tucKnowledge.filter(item => 
    item.title.includes(searchTerm) || 
    item.keywords.some(k => k.includes(searchTerm)) ||
    item.category.includes(searchTerm)
  );

  return (
    <div className="form-section glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', flexShrink: 0, paddingRight: '1rem' }}>
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(index)}
              style={{
                padding: '1rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === index ? '2px solid var(--tuc-red)' : '2px solid transparent',
                color: activeTab === index ? 'var(--tuc-red)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <label className="icon-btn" style={{ cursor: 'pointer' }} title="導入專案 (.json)">
            <Upload size={16} /><input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
          </label>
          <button className="icon-btn" onClick={handleExportJSON} title="儲存專案 (.json)"><Download size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="form-content-area" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem 1.5rem 0' }}>
          {activeTab === 0 && (
            <div className="tab-pane">
              <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>基本與請購項目</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="input-with-label">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={14} /> 申請單位</label>
                  <input type="text" value={data.department} onChange={(e) => updateField('department', e.target.value)} placeholder="記憶已啟用..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div className="input-with-label">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} /> 申請人員</label>
                    <input type="text" value={data.requester} onChange={(e) => updateField('requester', e.target.value)} placeholder="姓名" />
                  </div>
                  <div className="input-with-label">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Hash size={14} /> 分機</label>
                    <input type="text" value={data.extension} onChange={(e) => updateField('extension', e.target.value)} placeholder="####" />
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', border: 'none' }}>
                  <HardHat size={18} /> 請購細目
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <SectionEditor label="設備名稱" value={data.equipmentName} onChange={(v) => updateField('equipmentName', v)} isTextArea={false} />
                  <SectionEditor label="型別 (選填)" value={data.model} onChange={(v) => updateField('model', v)} isTextArea={false} />
                </div>
                <div className="input-with-label">
                  <label>工程類別</label>
                  <select value={data.category} onChange={(e) => updateField('category', e.target.value as 工程類別)}>
                    {['新增', '修繕', '整改', '優化', '購置'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <SectionEditor label="需求說明 (必填)" value={data.requirementDesc} onChange={(v) => updateField('requirementDesc', v)} required />
                <SectionEditor label="二. 品相" value={data.appearance} onChange={(v) => updateField('appearance', v)} />
                <SectionEditor label="三. 數量、單位" value={data.quantityUnit} onChange={(v) => updateField('quantityUnit', v)} isTextArea={false} />
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="tab-pane">
              <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>六. 設計要求</h3>
              <SectionEditor label="1. 環保要求" value={data.envRequirements} onChange={(v) => updateField('envRequirements', v)} />
              <SectionEditor label="2. 法規要求" value={data.regRequirements} onChange={(v) => updateField('regRequirements', v)} />
              <SectionEditor label="3. 維護要求" value={data.maintRequirements} onChange={(v) => updateField('maintRequirements', v)} />
              <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>七. 安全要求</h3>
              <SectionEditor label="安全要求說明" value={data.safetyRequirements} onChange={(v) => updateField('safetyRequirements', v)} />
              <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>八. 特性要求</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <SectionEditor label="1. 電氣特性規格" value={data.elecSpecs} onChange={(v) => updateField('elecSpecs', v)} />
                <SectionEditor label="2. 機構特性規格" value={data.mechSpecs} onChange={(v) => updateField('mechSpecs', v)} />
                <SectionEditor label="自定義項目1 (名稱)" value={data.customSpec1Name} onChange={v => updateField('customSpec1Name', v)} isTextArea={false} />
                <SectionEditor label="自定義項目1 (要求)" value={data.customSpec1Value} onChange={v => updateField('customSpec1Value', v)} isTextArea={false} />
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="tab-pane">
              <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>九. 安裝與交期</h3>
              <SectionEditor label="施工標準" value={data.installStandard} onChange={(v) => updateField('installStandard', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <SectionEditor label="完工日期" value={data.deliveryDate} onChange={(v) => updateField('deliveryDate', v)} isTextArea={false} inputType="date" />
                <SectionEditor label="工期（天）" value={data.workPeriod} onChange={(v) => updateField('workPeriod', v)} isTextArea={false} />
              </div>
              <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>十. 遵守事項</h3>
              <SectionEditor label="遵守事項" value={data.complianceDesc} onChange={(v) => updateField('complianceDesc', v)} />
            </div>
          )}

          {activeTab === 3 && (
            <div className="tab-pane">
              <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>十一. 圖說與十二. 表格</h3>
              <ImageUpload images={data.images} onChange={(imgs) => updateField('images', imgs)} />
              <div style={{ marginTop: '2rem' }}>
                <SpecTable data={data.tableData} onChange={(td) => updateField('tableData', td)} />
              </div>
            </div>
          )}

          {activeTab === 4 && (
            <div className="tab-pane">
              <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>規格確認及會簽</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <SectionEditor label="申請人" value={data.applicantName} onChange={v => updateField('applicantName', v)} isTextArea={false} />
                <SectionEditor label="主管" value={data.deptHeadName} onChange={v => updateField('deptHeadName', v)} isTextArea={false} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                {data.signOffGrid.map((row, ri) => row.map((cell, ci) => (
                  <div key={`${ri}-${ci}`} style={{ border: '1px solid var(--border-color)', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                    {isDropdownCell(ri, ci) ? (
                      <select value={cell} onChange={(e) => updateSignOff(ri, ci, e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', color: 'white', fontSize: '0.8rem' }}>
                        <option value="">選取單位</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={cell} onChange={(e) => updateSignOff(ri, ci, e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', color: 'white', textAlign: 'center', fontSize: '0.8rem' }} />
                    )}
                  </div>
                )))}
              </div>
            </div>
          )}

          {activeTab === 5 && (
            <div className="tab-pane">
              <h3 style={{ marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={20} /> 檔案管理中心
              </h3>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                {uploadingFile ? <Loader2 className="animate-spin" size={32} color="var(--tuc-red)" /> : (
                  <>
                    <FileUp size={40} style={{ marginBottom: '1rem' }} />
                    <label className="primary-button" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                      上傳參考手冊 <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </>
                )}
              </div>
              <div style={{ marginTop: '2rem' }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{f.name}</span>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ color: '#60A5FA' }}>查看</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="kms-sidebar" style={{ width: '280px', borderLeft: '1px solid var(--border-color)', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--tuc-red)' }}>
            <BookOpen size={18} /> 知識庫建議
          </div>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <input type="text" placeholder="關鍵字搜尋..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.8rem' }} />
            <Search size={14} style={{ position: 'absolute', right: '10px', top: '8px' }} />
          </div>
          {filteredKnowledge.map((item, idx) => (
            <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--tuc-red)' }}>{item.category}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{item.title}</div>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#60A5FA', textDecoration: 'none' }}>查閱原文 <ExternalLink size={8} /></a>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <button disabled={activeTab === 0} onClick={() => setActiveTab(prev => prev - 1)} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={20} /> 上一區塊
        </button>
        <button onClick={() => activeTab < tabs.length - 1 && setActiveTab(prev => prev + 1)} style={{ background: 'var(--tuc-red)', color: 'white', border: 'none', padding: '0.5rem 2rem', borderRadius: '6px' }}>
          下一步 <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default SpecForm;
