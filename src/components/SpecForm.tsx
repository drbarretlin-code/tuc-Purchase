import React, { useState, useEffect } from 'react';
import type { FormState, 工程類別 } from '../types/form';
import SectionEditor from './SectionEditor';
import ImageUpload from './ImageUpload';
import SpecTable from './SpecTable';
import { 
  Info, Settings, HardHat, Hammer, Table, 
  ChevronRight, ChevronLeft, User, Building2, Hash, PenTool
} from 'lucide-react';

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
}

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);

  const departments = ['生產部', '工程部', '工安部', '設備部', '品保部', '研發部', 'PRD', '採購部'];

  // 當分頁切換時，自動置頂
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
    // 1-1, 1-3, 2-1, 2-3, 3-1, 3-3 (0-indexed: 0-0, 0-2, 1-0, 1-2, 2-0, 2-2)
    const targets = ['0-0', '0-2', '1-0', '1-2', '2-0', '2-2'];
    return targets.includes(`${row}-${col}`);
  };

  return (
    <div className="form-section glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Tab Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto', flexShrink: 0 }}>
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
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="form-content-area" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {activeTab === 0 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>基本與請購項目</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="input-with-label">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={14} /> 申請單位</label>
                <input 
                  type="text" 
                  value={data.department} 
                  onChange={(e) => updateField('department', e.target.value)} 
                  placeholder="請輸入申請單位全銜..." 
                  style={{ width: '100%', padding: '0.8rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div className="input-with-label">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} /> 申請人員</label>
                  <input 
                    type="text" 
                    value={data.requester} 
                    onChange={(e) => updateField('requester', e.target.value)} 
                    placeholder="姓名" 
                    style={{ width: '100%', padding: '0.8rem' }}
                  />
                </div>
                <div className="input-with-label">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Hash size={14} /> 分機</label>
                  <input 
                    type="text" 
                    value={data.extension} 
                    onChange={(e) => updateField('extension', e.target.value)} 
                    placeholder="####" 
                    style={{ width: '100%', padding: '0.8rem' }}
                  />
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
              <div style={{ padding: '0.5rem 1rem', background: 'rgba(230,0,18,0.1)', borderLeft: '3px solid var(--tuc-red)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                名稱預覽：<strong>{data.equipmentName}{data.model ? ` ${data.model}` : ''} ({data.category})</strong>
              </div>
              <SectionEditor label="一. 名稱" value={`${data.equipmentName}${data.model ? ` ${data.model}` : ''} (${data.category})`} onChange={() => {}} isTextArea={false} />
              <SectionEditor label="需求說明 (必填)" value={data.requirementDesc} onChange={(v) => updateField('requirementDesc', v)} required />
              <SectionEditor label="二. 品相 (顏色、尺寸、重量、材質、表面處理)" value={data.appearance} onChange={(v) => updateField('appearance', v)} />
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
              <SectionEditor label="3. 物理特性要求" value={data.physSpecs} onChange={(v) => updateField('physSpecs', v)} />
              <SectionEditor label="4. 信賴特性要求" value={data.relySpecs} onChange={(v) => updateField('relySpecs', v)} />
              
              <SectionEditor label="自定義項目1 (名稱)" value={data.customSpec1Name} onChange={v => updateField('customSpec1Name', v)} isTextArea={false} placeholder="例：最大荷重" />
              <SectionEditor label="自定義項目1 (要求)" value={data.customSpec1Value} onChange={v => updateField('customSpec1Value', v)} isTextArea={false} placeholder="請輸入數值/要求" />
              
              <SectionEditor label="自定義項目2 (名稱)" value={data.customSpec2Name} onChange={v => updateField('customSpec2Name', v)} isTextArea={false} placeholder="例：運作噪音" />
              <SectionEditor label="自定義項目2 (要求)" value={data.customSpec2Value} onChange={v => updateField('customSpec2Value', v)} isTextArea={false} placeholder="請輸入數值/要求" />
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>九. 安裝程序要求</h3>
            <SectionEditor label="施工標準 (自動編號)" value={data.installStandard} onChange={(v) => updateField('installStandard', v)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <SectionEditor label="完工日期" value={data.deliveryDate} onChange={(v) => updateField('deliveryDate', v)} isTextArea={false} inputType="date" />
              <SectionEditor label="工期（天）" value={data.workPeriod} onChange={(v) => updateField('workPeriod', v)} isTextArea={false} placeholder="請輸入總工期日數" />
            </div>
            <SectionEditor label="驗收說明" value={data.acceptanceDesc} onChange={(v) => updateField('acceptanceDesc', v)} />
            <SectionEditor label="驗收補充說明" value={data.acceptanceExtra} onChange={(v) => updateField('acceptanceExtra', v)} />

            <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>十. 遵守事項</h3>
            <SectionEditor label="遵守事項 (自動編號)" value={data.complianceDesc} onChange={(v) => updateField('complianceDesc', v)} />
          </div>
        )}

        {activeTab === 3 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>十一. 圖說 (限 2x3 共 6 張)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>※ 注意：若未上傳任何圖片，預覽與匯出將自動隱藏「十一. 圖說」與「十二. 驗收表格」。</p>
            <ImageUpload images={data.images} onChange={(imgs) => updateField('images', imgs)} />
            
            <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>十二. 驗收要求表格</h3>
            <SpecTable data={data.tableData} onChange={(td) => updateField('tableData', td)} />
          </div>
        )}

        {activeTab === 4 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>規格確認及會簽</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <SectionEditor label="申請人" value={data.applicantName} onChange={v => updateField('applicantName', v)} isTextArea={false} />
              <SectionEditor label="申請單位主管" value={data.deptHeadName} onChange={v => updateField('deptHeadName', v)} isTextArea={false} />
            </div>
            
            <div className="sign-off-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--tuc-red)' }}>聯合會簽區</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                {data.signOffGrid.map((row, ri) => 
                  row.map((cell, ci) => (
                    <div key={`${ri}-${ci}`} style={{ border: '1px solid var(--border-color)', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }}>
                      {isDropdownCell(ri, ci) ? (
                        <select 
                          value={cell} 
                          onChange={(e) => updateSignOff(ri, ci, e.target.value)}
                          style={{ width: '100%', border: 'none', background: 'transparent', color: 'white', fontSize: '0.8rem', padding: '4px' }}
                        >
                          <option value="">選取單位</option>
                          {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          value={cell} 
                          onChange={(e) => updateSignOff(ri, ci, e.target.value)}
                          placeholder="簽核區"
                          style={{ width: '100%', border: 'none', background: 'transparent', color: 'white', fontSize: '0.75rem', textAlign: 'center' }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Footer Navigation */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <button 
          disabled={activeTab === 0}
          onClick={() => setActiveTab(prev => prev - 1)}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 0 ? '#4B5563' : 'white', 
            cursor: activeTab === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' 
          }}
        >
          <ChevronLeft size={20} /> 上一區塊
        </button>
        
        {activeTab < tabs.length - 1 ? (
          <button 
            onClick={() => setActiveTab(prev => prev + 1)}
            style={{ 
              background: 'var(--tuc-red)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', 
              borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' 
            }}
          >
            下一步 <ChevronRight size={18} />
          </button>
        ) : (
          <div style={{ width: '100px' }} />
        )}
      </div>
    </div>
  );
};

export default SpecForm;
