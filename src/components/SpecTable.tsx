import React from 'react';
import type { TableRowData } from '../types/form';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  data: TableRowData[];
  onChange: (data: TableRowData[]) => void;
}

const SpecTable: React.FC<Props> = ({ data, onChange }) => {
  const updateCell = (index: number, field: keyof TableRowData, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  const addRow = () => {
    onChange([...data, { category: '', item: '', spec: 'NA', method: 'NA', samples: 'NA', confirmation: 'NA' }]);
  };

  const removeRow = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="table-editor glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
            <th style={{ padding: '0.5rem', fontSize: '0.8rem' }}>類別</th>
            <th style={{ padding: '0.5rem', fontSize: '0.8rem' }}>項目</th>
            <th style={{ padding: '0.5rem', fontSize: '0.8rem' }}>規格要求</th>
            <th style={{ padding: '0.5rem', fontSize: '0.8rem' }}>測試方法</th>
            <th style={{ padding: '0.5rem', fontSize: '0.8rem' }}>樣品數</th>
            <th style={{ padding: '0.5rem', fontSize: '0.8rem' }}>確認</th>
            <th style={{ padding: '0.5rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td><input style={{ padding: '4px' }} value={row.category} onChange={(e) => updateCell(index, 'category', e.target.value)} /></td>
              <td><input style={{ padding: '4px' }} value={row.item} onChange={(e) => updateCell(index, 'item', e.target.value)} /></td>
              <td><input style={{ padding: '4px' }} value={row.spec} onChange={(e) => updateCell(index, 'spec', e.target.value)} /></td>
              <td><input style={{ padding: '4px' }} value={row.method} onChange={(e) => updateCell(index, 'method', e.target.value)} /></td>
              <td><input style={{ padding: '4px' }} value={row.samples} onChange={(e) => updateCell(index, 'samples', e.target.value)} /></td>
              <td><input style={{ padding: '4px' }} value={row.confirmation} onChange={(e) => updateCell(index, 'confirmation', e.target.value)} /></td>
              <td>
                <button onClick={() => removeRow(index)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button 
        onClick={addRow}
        style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Plus size={16} /> 新增列
      </button>
    </div>
  );
};

export default SpecTable;
