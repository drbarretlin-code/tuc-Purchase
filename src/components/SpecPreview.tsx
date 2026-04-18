import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, FileJson, ZoomIn } from 'lucide-react';
import { exportToPDF, exportToWord } from '../logic/exporter';
import type { FormState } from '../types/form';
import { getFullSpecName, processAutoNumbering } from '../logic/specGenerator';

interface Props {
  data: FormState;
}

const SpecPreview: React.FC<Props> = ({ data }) => {
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<'auto' | number>('auto');
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        if (zoomMode === 'auto') {
          const containerWidth = containerRef.current.offsetWidth - 40; 
          const containerHeight = containerRef.current.offsetHeight - 40;
          const targetWidth = 210 * 3.78; 
          const targetHeight = 297 * 3.78;
          const scaleW = containerWidth / targetWidth;
          const scaleH = containerHeight / targetHeight;
          setScale(Math.min(scaleW, scaleH, 1));
        } else {
          setScale(zoomMode);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomMode, data]);

  useEffect(() => {
    if (previewRef.current) {
      const height = previewRef.current.scrollHeight;
      const calculatedTotal = Math.max(1, Math.ceil(height / 1050)); 
      setTotalPages(calculatedTotal);
    }
  }, [data, scale]);

  const hasImages = data.images.length > 0;
  const currentDate = new Date().toLocaleDateString('zh-TW');

  return (
    <div className="preview-section glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #preview-paper, #preview-paper * { visibility: visible; }
          #preview-paper { 
            position: static !important;
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
          }
          .no-print { display: none !important; }
          * { box-sizing: border-box !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText color="#E60012" size={24} />
          <h3 style={{ margin: 0 }}>正式預覽</h3>
          <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
            <ZoomIn size={14} />
            <select 
              value={zoomMode === 'auto' ? 'auto' : zoomMode} 
              onChange={(e) => setZoomMode(e.target.value === 'auto' ? 'auto' : parseFloat(e.target.value))}
              style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '0.75rem', outline: 'none' }}
            >
              <option value="auto">自適應</option>
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => exportToWord(data)} className="icon-btn">
            <FileJson size={18} /><span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>匯出 Word</span>
          </button>
          <button onClick={() => exportToPDF('preview-paper', data)} className="primary-button" style={{ padding: '0.4rem 1rem' }}>
            <Download size={16} /><span style={{ marginLeft: '4px' }}>匯出 PDF</span>
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
            width: '210mm', minHeight: '297mm', background: 'white', padding: '20mm', boxShadow: '0 0 20px rgba(0,0,0,0.5)', position: 'relative', color: '#000', fontSize: '11pt', lineBreak: 'anywhere'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2.5px solid black', paddingBottom: '0.8rem', marginBottom: '1.2rem', position: 'relative' }}>
              <h1 style={{ textAlign: 'center', margin: '0', fontSize: '20pt' }}>台燿科技股份有限公司</h1>
              <h2 style={{ textAlign: 'center', margin: '0 0 0.4rem', fontSize: '14pt', fontWeight: 'normal' }}>Taiwan Union Technology Corporation</h2>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <h3 style={{ margin: '0', fontSize: '16pt', fontWeight: 'bold' }}>請購驗收規範表</h3>
                <div style={{ position: 'absolute', right: 0, bottom: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: '9pt', color: '#666', marginBottom: '2px' }}>日期：{currentDate}</div>
                  <div style={{ fontSize: '11pt' }}>頁數：1 / {totalPages}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '10pt' }}>
              <div>申請單位：{data.department || 'NA'}</div>
              <div>申請人員：{data.requester || 'NA'} {data.extension ? `(分機: ${data.extension})` : ''}</div>
            </div>

            {/* Sections I - X */}
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
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap' }}>{data.rangeRange || 'NA'}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>六、 設計要求</h4>
              <div style={{ marginLeft: '1.2rem' }}>
                <div style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}><strong>1. 環保要求：</strong> {data.envRequirements}</div>
                <div style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}><strong>2. 法規要求：</strong> {data.regRequirements}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}><strong>3. 維護要求：</strong> {data.maintRequirements}</div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>七、 安全要求：</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap' }}>{data.safetyRequirements}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>八、 特性要求</h4>
              <div style={{ marginLeft: '1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '4px' }}>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>1. 電氣特性規格:</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.elecSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>2. 機構特性規格:</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.mechSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>3. 物理特性規格:</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.physSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>4. 信賴特性規格:</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.relySpecs}</div>
                </div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>九、 安裝程序要求：</h4>
              <div style={{ marginLeft: '1.2rem' }}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '10pt' }}>{processAutoNumbering(data.installStandard)}</div>
                <div style={{ margin: '8px 0' }}><strong>完工日期：</strong> {data.deliveryDate || 'NA'} | <strong>工期（天）：</strong> {data.workPeriod || 'NA'}</div>
                <strong>驗收：</strong>
                <div>{data.acceptanceDesc}</div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>十、 遵守事項：</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap', fontSize: '10pt' }}>{processAutoNumbering(data.complianceDesc)}</div>
            </div>

            {/* Conditional Sections XI & XII */}
            {hasImages && (
              <>
                <div className="doc-section" style={{ pageBreakBefore: 'always' }}>
                  <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>十一、 圖說</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '10px' }}>
                    {data.images.map(img => (
                      <div key={img.id} style={{ textAlign: 'center', border: '1px solid #eee', padding: '8px' }}>
                        <img src={img.url} style={{ width: '100%', height: '180px', objectFit: 'contain' }} />
                        <div style={{ fontSize: '9pt', marginTop: '4px' }}>{img.caption}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="doc-section">
                  <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>十二、 驗收要求</h4>
                  <table style={{ border: '1px solid black', width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '9pt' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ border: '1px solid black' }}>類別</th>
                        <th style={{ border: '1px solid black' }}>項目</th>
                        <th style={{ border: '1px solid black' }}>規格要求</th>
                        <th style={{ border: '1px solid black' }}>測試方法</th>
                        <th style={{ border: '1px solid black' }}>樣品數</th>
                        <th style={{ border: '1px solid black' }}>確認</th>
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
              </>
            )}

            {/*規格確認及會簽*/}
            <div className="doc-section" style={{ marginTop: '30px', pageBreakInside: 'avoid' }}>
              <h4 style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', marginBottom: '15px' }}>規格確認及會簽</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', width: '15%', background: '#f9f9f9' }}>申請人</td>
                    <td style={{ border: '1px solid black', padding: '8px', width: '35%' }}>{data.applicantName}</td>
                    <td style={{ border: '1px solid black', padding: '8px', width: '15%', background: '#f9f9f9' }}>申請單位主管</td>
                    <td style={{ border: '1px solid black', padding: '8px', width: '35%' }}>{data.deptHeadName}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ border: '1px solid black', padding: 0 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(3, 30px)' }}>
                        {data.signOffGrid.map((row, ri) => 
                          row.map((cell, ci) => (
                            <div key={`${ri}-${ci}`} style={{ border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt' }}>
                              {cell}
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '9pt', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '4px' }}>廠商確認</div>
                    </td>
                  </tr>
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
