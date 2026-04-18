import React, { useState, useEffect, useRef } from 'react';
import { Copy, FileText, Download, FileJson } from 'lucide-react';
import { exportToPDF, exportToWord } from '../logic/exporter';
import type { FormState } from '../types/form';
import { getFullSpecName, processAutoNumbering } from '../logic/specGenerator';

interface Props {
  data: FormState;
}

const SpecPreview: React.FC<Props> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 處理縮放邏輯
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 40; 
        const containerHeight = containerRef.current.offsetHeight - 40;
        const targetWidth = 210 * 3.78; 
        const targetHeight = 297 * 3.78;
        
        const scaleW = containerWidth / targetWidth;
        const scaleH = containerHeight / targetHeight;
        const finalScale = Math.min(scaleW, scaleH, 1); 
        setScale(finalScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 處理頁數邏輯
  useEffect(() => {
    if (previewRef.current) {
      const height = previewRef.current.scrollHeight;
      const calculatedTotal = Math.max(1, Math.ceil(height / 1050)); 
      setTotalPages(calculatedTotal);
    }
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSelectedHints = (hints: any[]) => {
    const selected = hints.filter(h => h.selected);
    if (selected.length === 0) return null;
    return (
      <div style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
        {selected.map((h, i) => (
          <div key={i}>{h.content}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="preview-section glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText color="#E60012" size={24} />
          <h3 style={{ margin: 0 }}>正式預覽</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleCopy} className="icon-btn" title="複製資料 JSON">
            <Copy size={18} />
            <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>{copied ? '已複製' : '複製'}</span>
          </button>
          <button onClick={() => exportToWord(data, 'TUC_Spec')} className="icon-btn" title="匯出 Microsoft Word">
            <FileJson size={18} />
            <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>匯出 Word</span>
          </button>
          <button onClick={() => exportToPDF('preview-paper', 'TUC_Spec')} className="primary-button" style={{ padding: '0.4rem 1rem' }}>
            <Download size={16} />
            <span style={{ marginLeft: '4px' }}>匯出 PDF</span>
          </button>
        </div>
      </div>

      <div ref={containerRef} style={{ 
        flex: 1, 
        overflow: 'auto', 
        background: '#333', 
        padding: '1rem', 
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center'
      }}>
        <div className="preview-zoom-container" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
          <div id="preview-paper" ref={previewRef} className="preview-content" style={{ 
            width: '210mm', minHeight: '297mm', background: 'white', padding: '15mm 20mm', boxShadow: '0 0 20px rgba(0,0,0,0.5)', position: 'relative', color: '#000', fontSize: '11pt', lineBreak: 'anywhere'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2.5px solid black', paddingBottom: '0.8rem', marginBottom: '1.2rem', position: 'relative' }}>
              <h1 style={{ textAlign: 'center', margin: '0', fontSize: '20pt' }}>台燿科技股份有限公司</h1>
              <h2 style={{ textAlign: 'center', margin: '0 0 0.4rem', fontSize: '14pt', fontWeight: 'normal' }}>Taiwan Union Technology Corporation</h2>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <h3 style={{ margin: '0', fontSize: '16pt', fontWeight: 'bold' }}>請購驗收規範表</h3>
                <div style={{ position: 'absolute', right: 0, bottom: 0, fontSize: '11pt' }}>頁數：1 / {totalPages}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '10pt' }}>
              <div>申請單位：{data.department || 'NA'}</div>
              <div>申請人員：{data.requester || 'NA'} {data.extension ? `(分機: ${data.extension})` : ''}</div>
            </div>

            {/* Sections I - III */}
            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>一、 名稱：<span style={{ fontWeight: 'normal' }}>{getFullSpecName(data)}</span></h4>
              <div style={{ marginLeft: '1.2rem', marginTop: '4px' }}>
                <strong>需求說明：</strong>
                <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{data.requirementDesc || 'NA'}</div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>二、 品相：</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap', color: '#333' }}>{data.appearance || 'NA'}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>三、 數量、單位：<span style={{ fontWeight: 'normal' }}>{data.quantityUnit || 'NA'}</span></h4>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>四、 工程(或設備)適用範圍(Scope)：</h4>
              <div style={{ marginLeft: '1.2rem' }}>{data.equipmentName || 'NA'}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>五、 工程(或設備)適用區間(Range)：</h4>
              <div style={{ marginLeft: '1.2rem' }}>{data.equipmentName ? `${data.equipmentName} 所在位置周遭區域` : 'NA'}</div>
            </div>

            {/* Section VI */}
            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>六、 設計要求</h4>
              <div style={{ marginLeft: '1.2rem' }}>
                <div style={{ marginBottom: '4px' }}><strong>1. 環保要求：</strong> {data.envRequirements}</div>
                <div style={{ paddingLeft: '2rem' }}>{renderSelectedHints(data.envAIHints)}</div>
                
                <div style={{ margin: '4px 0' }}><strong>2. 法規要求：</strong> {data.regRequirements}</div>
                <div style={{ paddingLeft: '2rem' }}>{renderSelectedHints(data.regAIHints)}</div>
                
                <div><strong>3. 維護要求：</strong> {data.maintRequirements}</div>
              </div>
            </div>

            {/* Section VII */}
            <div className="doc-section" style={{ pageBreakInside: 'avoid' }}>
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>七、 安全要求：</h4>
              <div style={{ marginLeft: '1.2rem' }}>
                <div>{data.safetyRequirements}</div>
                {renderSelectedHints(data.safetyAIHints)}
              </div>
            </div>

            {/* Section VIII */}
            <div className="doc-section" style={{ pageBreakInside: 'avoid' }}>
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>八、 特性要求</h4>
              <div style={{ marginLeft: '1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '4px' }}>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: '2px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>1. 電氣特性規格:</span>
                  <div style={{ wordBreak: 'break-all' }}>{data.elecSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: '2px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>2. 機構特性規格:</span>
                  <div style={{ wordBreak: 'break-all' }}>{data.mechSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: '2px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>3. 物理特性要求:</span>
                  <div style={{ wordBreak: 'break-all' }}>{data.physSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: '2px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>4. 信賴特性要求:</span>
                  <div style={{ wordBreak: 'break-all' }}>{data.relySpecs}</div>
                </div>
                {data.customSpec1Name && (
                  <div style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: '2px' }}>
                    <span style={{ color: '#666', fontSize: '9pt' }}>{data.customSpec1Name}:</span>
                    <div style={{ wordBreak: 'break-all' }}>{data.customSpec1Value}</div>
                  </div>
                )}
                {data.customSpec2Name && (
                  <div style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: '2px' }}>
                    <span style={{ color: '#666', fontSize: '9pt' }}>{data.customSpec2Name}:</span>
                    <div style={{ wordBreak: 'break-all' }}>{data.customSpec2Value}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Section IX */}
            <div className="doc-section" style={{ pageBreakInside: 'avoid' }}>
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>九、 安裝程序要求(施工標準、交期、工期)：</h4>
              <div style={{ marginLeft: '1.2rem' }}>
                <strong>施工標準：</strong>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '10pt', padding: '4px 0' }}>
                  {processAutoNumbering(data.installStandard)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '8px 0' }}>
                  <div><strong>完工日期：</strong> {data.deliveryDate || 'NA'}</div>
                  <div><strong>工期（天）：</strong> {data.workPeriod || 'NA'}</div>
                </div>
                <strong>驗收：</strong>
                <div style={{ marginTop: '2px' }}>{data.acceptanceDesc}</div>
                {renderSelectedHints(data.acceptanceAIHints)}
                <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic', marginTop: '4px' }}>{data.acceptanceExtra}</div>
              </div>
            </div>

            {/* Section X */}
            <div className="doc-section" style={{ pageBreakInside: 'avoid' }}>
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>十、 遵守事項：</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap', fontSize: '10pt', marginTop: '4px' }}>
                {processAutoNumbering(data.complianceDesc)}
              </div>
            </div>

            {/* Section XI */}
            {data.images.length > 0 && (
              <div className="doc-section" style={{ pageBreakBefore: 'auto' }}>
                <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>十一、 圖說</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '10px' }}>
                  {data.images.map(img => (
                    <div key={img.id} style={{ textAlign: 'center', border: '1px solid #eee', padding: '8px', borderRadius: '4px' }}>
                      <img src={img.url} style={{ width: '100%', height: '180px', objectFit: 'contain', background: '#fcfcfc' }} />
                      <div style={{ fontSize: '9pt', marginTop: '8px', fontWeight: 'bold', color: '#444' }}>{img.caption}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section XII */}
            <div className="doc-section" style={{ pageBreakInside: 'avoid' }}>
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>十二、 請購驗收要求</h4>
              <table style={{ border: '1px solid black', width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ border: '1px solid black', width: '15%' }}>類別</th>
                    <th style={{ border: '1px solid black', width: '20%' }}>項目</th>
                    <th style={{ border: '1px solid black' }}>規格要求</th>
                    <th style={{ border: '1px solid black', width: '15%' }}>測試方法</th>
                    <th style={{ border: '1px solid black', width: '10%' }}>樣品數</th>
                    <th style={{ border: '1px solid black', width: '10%' }}>確認</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tableData.map((row, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid black', textAlign: 'center' }}>{row.category}</td>
                      <td style={{ border: '1px solid black' }}>{row.item}</td>
                      <td style={{ border: '1px solid black' }}>{row.spec}</td>
                      <td style={{ border: '1px solid black' }}>{row.method}</td>
                      <td style={{ border: '1px solid black', textAlign: 'center' }}>{row.samples}</td>
                      <td style={{ border: '1px solid black', textAlign: 'center' }}>{row.confirmation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecPreview;
