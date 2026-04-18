import React from 'react';
import type { SpecData } from '../logic/specGenerator';
import { ClipboardCheck, FilePlus2 } from 'lucide-react';

interface Props {
  data: SpecData;
  onChange: (newData: SpecData) => void;
}

const SpecForm: React.FC<Props> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  return (
    <div className="form-section glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <FilePlus2 color="#E60012" size={28} />
        <h2 className="tuc-gradient-text">資訊蒐集</h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '-1rem' }}>
        請輸入工程細節，AI 將自動檢索相關法規與驗收重點。
      </p>

      <div className="main-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="input-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label>申請單位</label>
            <input type="text" name="department" value={data.department} onChange={handleChange} placeholder="例：工務部" />
          </div>
          <div className="input-group">
            <label>人員/分機</label>
            <input type="text" name="requester" value={data.requester} onChange={handleChange} placeholder="例：張三 / 1234" />
          </div>
        </div>

        <div className="input-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label>設備名稱</label>
            <input type="text" name="equipmentName" value={data.equipmentName} onChange={handleChange} placeholder="例：廢氣洗滌塔" />
          </div>
          <div className="input-group">
            <label>型別 (選填)</label>
            <input type="text" name="model" value={data.model} onChange={handleChange} placeholder="例：ABC-100" />
          </div>
        </div>

        <div className="input-group">
          <label>工程類別</label>
          <select name="category" value={data.category} onChange={handleChange}>
            <option value="新增">新增</option>
            <option value="修繕">修繕</option>
            <option value="整改">整改</option>
            <option value="優化">優化</option>
            <option value="購置">購置</option>
          </select>
        </div>

        <div className="input-group">
          <label>需求說明</label>
          <textarea 
            name="requirement" 
            value={data.requirement} 
            onChange={handleChange} 
            rows={5} 
            placeholder="請詳細描述工程需求與具體規格要求..."
          />
        </div>

        <button className="primary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <ClipboardCheck size={20} />
          生成驗收規範草案
        </button>
      </div>
    </div>
  );
};

export default SpecForm;
