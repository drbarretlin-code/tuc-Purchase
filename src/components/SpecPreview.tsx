import React, { useState, useEffect, useRef } from 'react';
import { Copy, FileText, Download, Check, FileJson } from 'lucide-react';
import { exportToPDF, exportToWord } from '../logic/exporter';
import type { FormState } from '../types/form';
import { getFullSpecName, processAutoNumbering } from '../logic/specGenerator';

interface Props {
  data: FormState;
}

const SpecPreview: React.FC<Props> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewRef.current) {
      const height = previewRef.current.scrollHeight;
      const calculatedTotal = Math.max(1, Math.ceil(height / 1050)); // A4 roughly 1050px at scale
      setTotalPages(calculatedTotal);
    }
  }, [data]);

  const handleCopy = () => {
    // 這裡可以使用 generateDraftMarkdown 來產生純文字
    // 但因為結構變複雜，暫略
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSelectedHints = (hints: any[]) => {
    const selected = hints.filter(h => h.selected);
    if (selected.length === 0) return null;
    return (
      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#F9FAFB', borderLeft: '3px solid #E60012', fontSize: '0.8rem' }}>
        <strong>AI 建議參考：</strong>
        {selected.map((h, i) => (
          <div key={i}>{h.content} <a href={h.link} target="_blank" rel="noreferrer" style={{ color: '#3B82F6' }}>[來源]</a></div>
        ))}
      </div>
    );
  };

  return (
    <div className="preview-section glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText color="#E60012" size={24} />
          <h3 style={{ margin: 0 }}>規範表預覽</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleCopy} className="icon-btn">{copied ? <Check size={18} color="#4ADE80" /> : <Copy size={18} />}</button>
          <button onClick={() => exportToWord('', 'TUC_Spec')} className="icon-btn"><FileJson size={18} /></button>
          <button onClick={() => exportToPDF('preview-paper', 'TUC_Spec')} className="primary-button" style={{ padding: '0.4rem 1rem' }}><Download size={16} /> 匯出 PDF</button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)', background: '#333', padding: '1rem', borderRadius: '8px' }}>
        <div id="preview-paper" ref={previewRef} className="preview-content" style={{ 
          width: '210mm', minHeight: '297mm', background: 'white', margin: '0 auto', padding: '20mm', boxShadow: '0 0 10px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' 
        }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid black', paddingBottom: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
            <h1 style={{ textAlign: 'center', margin: '0', fontSize: '18pt' }}>台燿科技股份有限公司</h1>
            <h2 style={{ textAlign: 'center', margin: '0 0 0.5rem', fontSize: '14pt', fontWeight: 'normal' }}>Taiwan Union Technology Corporation</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <h3 style={{ margin: '0', fontSize: '16pt' }}>請購驗收規範表</h3>
              <div style={{ fontSize: '10pt' }}>頁數：1 / {totalPages}</div>
            </div>
          </div>

          {/* Sections I - III */}
          <div className="doc-section">
            <h4>一、 名稱：<span className="doc-value">{getFullSpecName(data)}</span></h4>
            <div style={{ marginLeft: '1.5rem' }}>
              <strong>需求說明：</strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{data.requirementDesc || 'NA'}</div>
            </div>
          </div>

          <div className="doc-section">
            <h4>二、 品相：</h4>
            <div style={{ marginLeft: '1.5rem', whiteSpace: 'pre-wrap' }}>{data.appearance || 'NA'}</div>
          </div>

          <div className="doc-section">
            <h4>三、 數量、單位：<span className="doc-value">{data.quantityUnit || 'NA'}</span></h4>
          </div>

          {/* Sections IV - V */}
          <div className="doc-section">
            <h4>四、 工程適用範圍：<span className="doc-value">{data.equipmentName || 'NA'}</span></h4>
          </div>
          <div className="doc-section">
            <h4>五、 工程適用區間：<span className="doc-value">{data.equipmentName ? `${data.equipmentName} 所在位置周遭區域` : 'NA'}</span></h4>
          </div>

          {/* Section VI */}
          <div className="doc-section">
            <h4>六、 設計要求</h4>
            <div style={{ marginLeft: '1.5rem' }}>
              <p><strong>1. 環保要求：</strong> {data.envRequirements}</p>
              {renderSelectedHints(data.envAIHints)}
              <p><strong>2. 法規要求：</strong> {data.regRequirements}</p>
              {renderSelectedHints(data.regAIHints)}
              <p><strong>3. 維護要求：</strong> {data.maintRequirements}</p>
            </div>
          </div>

          {/* Section VII */}
          <div className="doc-section">
            <h4>七、 安全要求</h4>
            <div style={{ marginLeft: '1.5rem' }}>
              <p>{data.safetyRequirements}</p>
              {renderSelectedHints(data.safetyAIHints)}
            </div>
          </div>

          {/* Section VIII */}
          <div className="doc-section">
            <h4>八、 特性要求</h4>
            <table style={{ width: '100%', border: 'none', marginLeft: '1rem' }}>
              <tbody>
                <tr><td style={{ border: 'none', color: '#666' }}>1. 電氣特性規格:</td><td style={{ border: 'none' }}>{data.elecSpecs}</td></tr>
                <tr><td style={{ border: 'none', color: '#666' }}>2. 機構特性規格:</td><td style={{ border: 'none' }}>{data.mechSpecs}</td></tr>
                <tr><td style={{ border: 'none', color: '#666' }}>3. 物理特性要求:</td><td style={{ border: 'none' }}>{data.physSpecs}</td></tr>
                <tr><td style={{ border: 'none', color: '#666' }}>4. 信賴特性要求:</td><td style={{ border: 'none' }}>{data.relySpecs}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section IX */}
          <div className="doc-section">
            <h4>九、 安裝程序要求</h4>
            <div style={{ marginLeft: '1.5rem' }}>
              <strong>施工標準：</strong>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '10pt', marginBottom: '1rem' }}>
                {processAutoNumbering(data.installStandard)}
              </div>
              <p><strong>交期：</strong> {data.deliveryDate || 'NA'} | <strong>工期：</strong> {data.workPeriod || 'NA'}</p>
              <p><strong>驗收：</strong> {data.acceptanceDesc}</p>
              {renderSelectedHints(data.acceptanceAIHints)}
              <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic' }}>{data.acceptanceExtra}</div>
            </div>
          </div>

          {/* Section X */}
          <div className="doc-section">
            <h4>十、 遵守事項</h4>
            <div style={{ marginLeft: '1.5rem', whiteSpace: 'pre-wrap', fontSize: '10pt' }}>
              {processAutoNumbering(data.complianceDesc)}
            </div>
          </div>

          {/* Section XI */}
          {data.images.length > 0 && (
            <div className="doc-section">
              <h4>十一、 圖說</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {data.images.map(img => (
                  <div key={img.id} style={{ textAlign: 'center' }}>
                    <img src={img.url} style={{ width: '100%', height: '100px', objectFit: 'cover', border: '1px solid #ddd' }} />
                    <div style={{ fontSize: '8pt', marginTop: '4px' }}>{img.caption}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section XII */}
          <div className="doc-section">
            <h4>十二、 請購驗收要求</h4>
            <table style={{ border: '1px solid black', width: '100%' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}><th>類別</th><th>項目</th><th>規格要求</th><th>測試方法</th><th>樣品數</th><th>確認</th></tr>
              </thead>
              <tbody>
                {data.tableData.map((row, i) => (
                  <tr key={i}>
                    <td>{row.category || ' '}</td><td>{row.item || ' '}</td><td>{row.spec}</td><td>{row.method}</td><td>{row.samples}</td><td>{row.confirmation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecPreview;
