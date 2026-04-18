import React, { useState } from 'react';
import type { FormState, 工程類別 } from '../types/form';
import SectionEditor from './SectionEditor';
import ImageUpload from './ImageUpload';
import SpecTable from './SpecTable';
import { 
  Info, Settings, HardHat, Hammer, Table, 
  ChevronRight, ChevronLeft, Send 
} from 'lucide-react';

interface Props {
  data: FormState;
  onChange: (newData: FormState) => void;
}

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: '基本資訊', icon: <Info size={18} /> },
    { label: '技術規格', icon: <Settings size={18} /> },
    { label: '施工作業', icon: <Hammer size={18} /> },
    { label: '圖說表格', icon: <Table size={18} /> },
  ];

  const updateField = (field: keyof FormState, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleHint = (section: 'env' | 'reg' | 'safety' | 'acceptance', id: string) => {
    const fieldMap: Record<string, keyof FormState> = {
      env: 'envAIHints',
      reg: 'regAIHints',
      safety: 'safetyAIHints',
      acceptance: 'acceptanceAIHints'
    };
    const field = fieldMap[section];
    const hints = [...(data[field] as any[])];
    const index = hints.findIndex(h => h.id === id);
    if (index !== -1) {
      hints[index] = { ...hints[index], selected: !hints[index].selected };
      updateField(field, hints);
    }
  };

  return (
    <div className="form-section glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Tab Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
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
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {activeTab === 0 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>基本與請購項目</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <SectionEditor label="申請單位" value={data.department} onChange={(v) => updateField('department', v)} isTextArea={false} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <SectionEditor label="申請人員" value={data.requester} onChange={(v) => updateField('requester', v)} isTextArea={false} />
                <SectionEditor label="分機" value={data.extension} onChange={(v) => updateField('extension', v)} isTextArea={false} />
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HardHat size={16} /> 請購項目</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <SectionEditor label="設備名稱" value={data.equipmentName} onChange={(v) => updateField('equipmentName', v)} isTextArea={false} />
                <SectionEditor label="型別 (選填)" value={data.model} onChange={(v) => updateField('model', v)} isTextArea={false} />
              </div>
              <div className="input-group">
                <label>工程類別</label>
                <select value={data.category} onChange={(e) => updateField('category', e.target.value as 工程類別)}>
                  {['新增', '修繕', '整改', '優化', '購置'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <SectionEditor label="一. 名稱 (由系統自動結合)" value={`${data.equipmentName}${data.model ? ` ${data.model}` : ''} (${data.category})`} onChange={() => {}} isTextArea={false} />
              <SectionEditor label="需求說明 (必填)" value={data.requirementDesc} onChange={(v) => updateField('requirementDesc', v)} required />
              <SectionEditor label="二. 品相 (顏色、尺寸、重量、材質、表面處理)" value={data.appearance} onChange={(v) => updateField('appearance', v)} />
              <SectionEditor label="三. 數量、單位" value={data.quantityUnit} onChange={(v) => updateField('quantityUnit', v)} isTextArea={false} />
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>六. 設計要求</h3>
            <SectionEditor label="1. 環保要求" value={data.envRequirements} onChange={(v) => updateField('envRequirements', v)} hints={data.envAIHints} onHintToggle={(id) => toggleHint('env', id)} />
            <SectionEditor label="2. 法規要求" value={data.regRequirements} onChange={(v) => updateField('regRequirements', v)} hints={data.regAIHints} onHintToggle={(id) => toggleHint('reg', id)} />
            <SectionEditor label="3. 維護要求" value={data.maintRequirements} onChange={(v) => updateField('maintRequirements', v)} />
            
            <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>七. 安全要求</h3>
            <SectionEditor label="安全要求說明" value={data.safetyRequirements} onChange={(v) => updateField('safetyRequirements', v)} hints={data.safetyAIHints} onHintToggle={(id) => toggleHint('safety', id)} />

            <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>八. 特性要求</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <SectionEditor label="1. 電氣特性規格" value={data.elecSpecs} onChange={(v) => updateField('elecSpecs', v)} />
              <SectionEditor label="2. 機構特性規格" value={data.mechSpecs} onChange={(v) => updateField('mechSpecs', v)} />
              <SectionEditor label="3. 物理特性要求" value={data.physSpecs} onChange={(v) => updateField('physSpecs', v)} />
              <SectionEditor label="4. 信賴特性要求" value={data.relySpecs} onChange={(v) => updateField('relySpecs', v)} />
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>九. 安裝程序要求</h3>
            <SectionEditor label="施工標準 (自動編號)" value={data.installStandard} onChange={(v) => updateField('installStandard', v)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <SectionEditor label="交期" value={data.deliveryDate} onChange={(v) => updateField('deliveryDate', v)} isTextArea={false} />
              <SectionEditor label="工期" value={data.workPeriod} onChange={(v) => updateField('workPeriod', v)} isTextArea={false} />
            </div>
            <SectionEditor label="驗收說明" value={data.acceptanceDesc} onChange={(v) => updateField('acceptanceDesc', v)} hints={data.acceptanceAIHints} onHintToggle={(id) => toggleHint('acceptance', id)} />
            <SectionEditor label="驗收補充說明" value={data.acceptanceExtra} onChange={(v) => updateField('acceptanceExtra', v)} />

            <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>十. 遵守事項</h3>
            <SectionEditor label="遵守事項 (自動編號)" value={data.complianceDesc} onChange={(v) => updateField('complianceDesc', v)} />
          </div>
        )}

        {activeTab === 3 && (
          <div className="tab-pane">
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>十一. 圖說 (限 6 張)</h3>
            <ImageUpload images={data.images} onChange={(imgs) => updateField('images', imgs)} />
            
            <h3 style={{ margin: '2rem 0 1.5rem', color: 'white' }}>十二. 驗收要求表格</h3>
            <SpecTable data={data.tableData} onChange={(td) => updateField('tableData', td)} />
          </div>
        )}
      </div>

      {/* Tab Footer Navigation */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
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
          <button 
            className="primary-button" 
            style={{ padding: '0.5rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            預覽完成 <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SpecForm;
