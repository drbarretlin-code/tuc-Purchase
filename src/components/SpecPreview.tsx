import { t, Language } from '../lib/i18n';
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
  const currentDate = new Date().toLocaleDateString(data.language === 'en-US' ? 'en-US' : (data.language === 'th-TH' ? 'th-TH' : (data.language === 'zh-CN' ? 'zh-CN' : 'zh-TW')));

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
          <h3 style={{ margin: 0 }}>{t('docOfficialPreview', data.language)}</h3>
          <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
            <ZoomIn size={14} />
            <select 
              value={zoomMode === 'auto' ? 'auto' : zoomMode} 
              onChange={(e) => setZoomMode(e.target.value === 'auto' ? 'auto' : parseFloat(e.target.value))}
              style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '0.75rem', outline: 'none' }}
            >
              <option value="auto">{t('docAutoFit', data.language)}</option>
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => exportToWord(data, data.language)} className="icon-btn">
            <FileJson size={18} /><span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>{t('docExportWord', data.language)}</span>
          </button>
          <button onClick={() => exportToPDF('preview-paper', data)} className="primary-button" style={{ padding: '0.4rem 1rem' }}>
            <Download size={16} /><span style={{ marginLeft: '4px' }}>{t('docExportPdf', data.language)}</span>
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
              <h1 style={{ textAlign: 'center', margin: '0', fontSize: '20pt' }}>{t('docCompanyName', data.language)}</h1>
              <h2 style={{ textAlign: 'center', margin: '0 0 0.4rem', fontSize: '14pt', fontWeight: 'normal' }}>{t('docCompanyEnglish', data.language)}</h2>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <h3 style={{ margin: '0', fontSize: '16pt', fontWeight: 'bold' }}>{t('docTitle', data.language)}</h3>
                <div style={{ position: 'absolute', right: 0, bottom: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: '9pt', color: '#666', marginBottom: '2px' }}>{t('docDate', data.language)}{currentDate}</div>
                  <div style={{ fontSize: '11pt' }}>{t('docPage', data.language)}1 / {totalPages}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '10pt' }}>
              <div>{t('docDept', data.language)}{data.department || 'NA'}</div>
              <div>{t('docRequester', data.language)}{data.requester || 'NA'} {data.extension ? `(${t('docExtension', data.language)}: ${data.extension})` : ''}</div>
            </div>

            {/* Sections I - X */}
            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection1', data.language)}<span style={{ fontWeight: 'normal' }}>{getFullSpecName(data)}</span></h4>
              <div style={{ marginLeft: '1.2rem', marginTop: '4px' }}>
                <strong>{t('reqDesc', data.language)}：</strong>
                <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{data.requirementDesc || 'NA'}</div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection2', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap', color: '#333' }}>{data.appearance || 'NA'}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection3', data.language)}<span style={{ fontWeight: 'normal' }}>{data.quantityUnit || 'NA'}</span></h4>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection4', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem' }}>{data.equipmentName || 'NA'}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection5', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap' }}>{data.rangeRange || 'NA'}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection6', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem' }}>
                <div style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}><strong>{t('docSub6_1', data.language)}</strong> {data.envRequirements}</div>
                <div style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}><strong>{t('docSub6_2', data.language)}</strong> {data.regRequirements}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}><strong>{t('docSub6_3', data.language)}</strong> {data.maintRequirements}</div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection7', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap' }}>{data.safetyRequirements}</div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection8', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '4px' }}>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>{t('docSub8_1', data.language)}</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.elecSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>{t('docSub8_2', data.language)}</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.mechSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>{t('docSub8_3', data.language)}</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.physSpecs}</div>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
                  <span style={{ color: '#666', fontSize: '9pt' }}>{t('docSub8_4', data.language)}</span>
                  <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{data.relySpecs}</div>
                </div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection9', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem' }}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '10pt' }}>{processAutoNumbering(data.installStandard)}</div>
                <div style={{ margin: '8px 0' }}><strong>{t('docSub9_date', data.language)}</strong> {data.deliveryDate || 'NA'} | <strong>{t('docSub9_period', data.language)}</strong> {data.workPeriod || 'NA'}</div>
                <strong>{t('docSub9_acceptance', data.language)}</strong>
                <div style={{ whiteSpace: 'pre-wrap' }}>{data.acceptanceDesc}</div>
              </div>
            </div>

            <div className="doc-section">
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection10', data.language)}</h4>
              <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap', fontSize: '10pt' }}>{processAutoNumbering(data.complianceDesc)}</div>
            </div>

            {/* Conditional Sections XI & XII */}
            {hasImages && (
              <>
                <div className="doc-section" style={{ pageBreakBefore: 'always' }}>
                  <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection11', data.language)}</h4>
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
                  <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{t('docSection12', data.language)}</h4>
                  <table style={{ border: '1px solid black', width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '9pt' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ border: '1px solid black' }}>{t('docTblCat', data.language)}</th>
                        <th style={{ border: '1px solid black' }}>{t('docTblItem', data.language)}</th>
                        <th style={{ border: '1px solid black' }}>{t('docTblSpec', data.language)}</th>
                        <th style={{ border: '1px solid black' }}>{t('docTblMethod', data.language)}</th>
                        <th style={{ border: '1px solid black' }}>{t('docTblCount', data.language)}</th>
                        <th style={{ border: '1px solid black' }}>{t('docTblConfirm', data.language)}</th>
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
              <h4 style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', marginBottom: '15px' }}>{t('docSignTitle', data.language)}</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', width: '15%', background: '#f9f9f9' }}>{t('docSignApplicant', data.language)}</td>
                    <td style={{ border: '1px solid black', padding: '8px', width: '35%' }}>{data.applicantName}</td>
                    <td style={{ border: '1px solid black', padding: '8px', width: '15%', background: '#f9f9f9' }}>{t('docSignDeptHead', data.language)}</td>
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
                      <div style={{ fontWeight: 'bold', fontSize: '9pt', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '4px' }}>{t('docSignVendor', data.language)}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="doc-section" style={{ marginTop: '20px', pageBreakInside: 'avoid' }}>
              <div style={{ color: '#E60012', fontSize: '9pt', marginBottom: '8px', fontWeight: 'bold' }}>
                {t('docBottomNote1', data.language)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '10pt' }}>
                <span>{t('docBottomNote2', data.language)}</span>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', border: '1px solid black', borderRadius: '50%', background: data.needsDrawing === 'YES' ? 'black' : 'transparent', display: 'inline-block' }} /> {t('yes', data.language)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', border: '1px solid black', borderRadius: '50%', background: data.needsDrawing === 'NO' ? 'black' : 'transparent', display: 'inline-block' }} /> {t('no', data.language)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecPreview;
