import React, { useState, useEffect, useRef } from 'react';
import { FileText, ZoomIn, FileJson, Download, Loader2 } from 'lucide-react';
import { t } from '../lib/i18n';
import type { FormState } from '../types/form';
import { exportToWord, exportToPDF } from '../logic/exporter';
import { getFullSpecName, processAutoNumbering } from '../logic/specGenerator';

interface PaperProps {
  data: FormState;
  totalPages?: number;
  previewRef?: React.RefObject<HTMLDivElement | null>;
  id?: string;
}

const PaperContent: React.FC<PaperProps> = ({ data, totalPages, previewRef, id }) => {
  const hasImages = data.images.length > 0;
  const currentDate = new Date().toLocaleDateString(data.language === 'en-US' ? 'en-US' : (data.language === 'th-TH' ? 'th-TH' : (data.language === 'zh-CN' ? 'zh-CN' : 'zh-TW')));
  const renderBilingualText = (val: string | null | undefined, isAutoNumber = false) => {
    if (!val) return 'NA';
    if (val.startsWith('default')) {
      const mainText = t(val, data.language);
      const processedMain = isAutoNumber ? processAutoNumbering(mainText) : mainText;
      
      if (data.language === 'th-TH') {
        const zhText = t(val, 'zh-TW');
        const processedZh = isAutoNumber ? processAutoNumbering(zhText) : zhText;
        return (
          <>
            <span>{processedMain}</span>
            <div style={{ color: '#666', fontSize: '0.9em', marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid #ddd' }}>
              {processedZh}
            </div>
          </>
        );
      }
      return processedMain;
    }
    return isAutoNumber ? processAutoNumbering(val) : val;
  };

  const renderBilingualLabel = (key: string) => {
    if (data.language === 'th-TH') {
      return (
        <span style={{ display: 'inline-block' }}>
          <span>{t(key, data.language)}</span>
          <br />
          <span style={{ color: '#666', fontSize: '0.85em', fontWeight: 'normal' }}>
            {t(key, 'zh-TW')}
          </span>
        </span>
      );
    }
    return t(key, data.language);
  };
  return (
    <div id={id} ref={previewRef} className="preview-content" style={{ 
      width: '210mm', minHeight: '297mm', background: 'white', padding: '15mm 20mm', boxShadow: '0 0 20px rgba(0,0,0,0.5)', position: 'relative', color: '#000', fontSize: '11pt', lineBreak: 'anywhere'
    }}>

      {/* Header */}
      <div style={{ borderBottom: '2.5px solid black', paddingBottom: '0.8rem', marginBottom: '1.2rem', position: 'relative' }}>
        <h1 style={{ textAlign: 'center', margin: '0', fontSize: '20pt' }}>
          {data.language === 'th-TH' ? 'Taiwan Union Technology (THAILAND) CO., LTD.' : t('docCompanyName', data.language)}
        </h1>
        {data.language !== 'th-TH' && (
          <h2 style={{ textAlign: 'center', margin: '0 0 0.4rem', fontSize: '14pt', fontWeight: 'normal' }}>
            {t('docCompanyEnglish', data.language)}
          </h2>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <h3 style={{ margin: '0', fontSize: '16pt', fontWeight: 'bold' }}>{t('docTitle', data.language)}</h3>
        </div>

        {/* 日期與頁碼容器 - 使用絕對定位固定在右側 */}
        <div style={{ position: 'absolute', right: 0, bottom: '0.8rem', textAlign: 'right' }}>
          <div style={{ fontSize: '9pt', color: '#666', marginBottom: '2px' }}>{t('docDate', data.language)}{currentDate}</div>
          <div style={{ fontSize: '11pt' }}>{t('docPage', data.language)}1 / {totalPages || 1}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '10pt' }}>
        <div>{renderBilingualLabel('docDept')}: {data.department || 'NA'}</div>
        <div>{renderBilingualLabel('docRequester')}: {data.requester || 'NA'} {data.extension ? `(${t('docExtension', data.language)}: ${data.extension})` : ''}</div>
      </div>

      {/* Sections I - X */}
      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection1')} <span style={{ fontWeight: 'normal' }}>{getFullSpecName(data)}</span></h4>
        <div style={{ marginLeft: '1.2rem', marginTop: '4px' }}>
          <strong>{renderBilingualLabel('reqDesc')}：</strong>
          <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{data.requirementDesc || 'NA'}</div>
        </div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection2')}</h4>
        <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap', color: '#333' }}>{renderBilingualText(data.appearance)}</div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection3')} <span style={{ fontWeight: 'normal' }}>{renderBilingualText(data.quantityUnit)}</span></h4>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection4')}</h4>
        <div style={{ marginLeft: '1.2rem' }}>{renderBilingualText(data.equipmentName)}</div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection5')}</h4>
        <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap' }}>{renderBilingualText(data.rangeRange)}</div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection6')}</h4>
        <div style={{ marginLeft: '1.2rem' }}>
          <div style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}><strong>{renderBilingualLabel('docSub6_1')}</strong> {renderBilingualText(data.envRequirements)}</div>
          <div style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}><strong>{renderBilingualLabel('docSub6_2')}</strong> {renderBilingualText(data.regRequirements)}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}><strong>{renderBilingualLabel('docSub6_3')}</strong> {renderBilingualText(data.maintRequirements)}</div>
        </div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection7')}</h4>
        <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap' }}>{renderBilingualText(data.safetyRequirements)}</div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection8')}</h4>
        <div style={{ marginLeft: '1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '4px' }}>
          <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
            <span style={{ color: '#666', fontSize: '9pt' }}>{renderBilingualLabel('docSub8_1')}</span>
            <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{renderBilingualText(data.elecSpecs)}</div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
            <span style={{ color: '#666', fontSize: '9pt' }}>{renderBilingualLabel('docSub8_2')}</span>
            <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{renderBilingualText(data.mechSpecs)}</div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
            <span style={{ color: '#666', fontSize: '9pt' }}>{renderBilingualLabel('docSub8_3')}</span>
            <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{renderBilingualText(data.physSpecs)}</div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '4px 8px' }}>
            <span style={{ color: '#666', fontSize: '9pt' }}>{renderBilingualLabel('docSub8_4')}</span>
            <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{renderBilingualText(data.relySpecs)}</div>
          </div>
        </div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection9')}</h4>
        <div style={{ marginLeft: '1.2rem' }}>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '10pt' }}>{renderBilingualText(data.installStandard, true)}</div>
          <div style={{ margin: '8px 0' }}><strong>{renderBilingualLabel('docSub9_date')}</strong> {data.deliveryDate || 'NA'} | <strong>{renderBilingualLabel('docSub9_period')}</strong> {data.workPeriod || 'NA'}</div>
          <strong>{renderBilingualLabel('docSub9_acceptance')}</strong>
          <div style={{ whiteSpace: 'pre-wrap' }}>{renderBilingualText(data.acceptanceDesc)}</div>
        </div>
      </div>

      <div className="doc-section">
        <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection10')}</h4>
        <div style={{ marginLeft: '1.2rem', whiteSpace: 'pre-wrap', fontSize: '10pt' }}>{renderBilingualText(data.complianceDesc, true)}</div>
      </div>

      {/* Conditional Sections XI & XII */}
      {hasImages && (
        <>
          <div className="doc-section" style={{ pageBreakBefore: 'always' }}>
            <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection11')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '10px' }}>
              {data.images.map(img => (
                <div key={img.id} style={{ textAlign: 'center', border: '1px solid #eee', padding: '8px' }}>
                  <img src={img.url} style={{ width: '100%', height: '180px', objectFit: 'contain' }} alt="" />
                  <div style={{ fontSize: '9pt', marginTop: '4px' }}>{img.caption}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="doc-section">
            <h4 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{renderBilingualLabel('docSection12')}</h4>
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
                    <td style={{ border: '1px solid black', textAlign: 'center' }}>{renderBilingualText(row.category)}</td>
                    <td style={{ border: '1px solid black' }}>{renderBilingualText(row.item)}</td>
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

      {/* 廠商注意事項 - A4 直向整頁 */}
      <div className="doc-section" style={{ pageBreakBefore: 'always', marginTop: '1.5rem' }}>
        <h4 style={{ fontSize: '14pt', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '1.2rem' }}>
          {t('contractorNotice', data.language)}
        </h4>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '10pt', lineHeight: '1.6', color: '#000' }}>
          {renderBilingualText(data.contractorNotice)}
        </div>
      </div>
    </div>
  );
};

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
          if (containerWidth <= 0 || containerHeight <= 0) return; // V19.9: 防止高度塌陷導致比例為 0
          const scaleW = containerWidth / targetWidth;
          const scaleH = containerHeight / targetHeight;
          setScale(Math.max(0.1, Math.min(scaleW, scaleH, 1)));
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

  const [isTranslating, setIsTranslating] = useState(false);
  const [exportLang, setExportLang] = useState(data.language);
  const [translatedData, setTranslatedData] = useState<FormState | null>(null);

  useEffect(() => {
    setExportLang(data.language);
  }, [data.language]);

  const handleExportPdf = async () => {
    if (exportLang === data.language) {
      exportToPDF(data);
      return;
    }

    // 啟動即時轉譯
    setIsTranslating(true);
    try {
      const apiKey = localStorage.getItem('tuc_gemini_key') || '';
      const { translateFullSpec } = await import('../lib/knowledgeParser');
      const translated = await translateFullSpec(data, exportLang, apiKey);
      
      // 確保轉譯後的資料帶有正確的語系標記
      const finalData = { ...translated, language: exportLang };
      
      // 設定臨時資料供隱藏渲染
      setTranslatedData(finalData);
      
      // 等待 React 渲染完成
      setTimeout(() => {
        exportToPDF(finalData);
        setTranslatedData(null);
        setIsTranslating(false);
      }, 500);

      setIsTranslating(false);
    } catch (err) {
      console.error('Export translation failed:', err);
      alert('Translation failed. Exporting original version.');
      exportToPDF(data);
      setIsTranslating(false);
    }
  };

  return (
    <div className="preview-section glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {isTranslating && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.7)', zIndex: 1000, 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <Loader2 size={40} className="spin" color="#60A5FA" style={{ marginBottom: '1rem' }} />
          <div style={{ color: '#60A5FA', fontWeight: 'bold' }}>{t('translating', data.language)}</div>
        </div>
      )}

      {/* 隱藏的列印專用語系渲染區 */}
      {translatedData && (
        <div className="translated-print-wrapper" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PaperContent data={translatedData} id="translated-paper" />
        </div>
      )}

      <style>{`
          @page {
            size: A4;
            margin: 15mm !important; /* 標準 A4 邊距，確保多頁穩定性 */
          }
          @media print {
            /* 強力隱藏瀏覽器標籤 (V19.8: 透過偽元素與內容抑制) */
            html, body {
              overflow: hidden !important; /* 防止產生額外的捲軸與標籤空間 */
              height: auto !important;
            }
            .doc-section {
              margin-bottom: 25px !important;
              page-break-inside: avoid !important;
            }
            /* 隱藏瀏覽器預設的網址、日期、標題 */
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            body * { visibility: hidden; }
            
            /* 核心：將列印容器移回正常流 */
            .translated-print-wrapper {
              position: static !important;
              left: 0 !important;
              top: 0 !important;
              visibility: visible !important;
              display: ${translatedData ? 'block' : 'none'} !important;
            }

            #translated-paper {
              position: static !important;
              width: 100% !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            #translated-paper, #translated-paper * {
              visibility: visible !important;
            }
            
            #preview-paper { 
              position: static !important;
              width: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              display: ${translatedData ? 'none' : 'block'} !important;
            }
            #preview-paper, #preview-paper * {
              visibility: visible !important;
            }
            .no-print { display: none !important; }
            * { 
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
            }
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.7rem', color: '#888' }}>{t('exportPdf', data.language)}:</span>
            <select 
              value={exportLang}
              onChange={(e) => setExportLang(e.target.value as any)}
              style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="zh-TW">繁體中文</option>
              <option value="en-US">English</option>
              <option value="zh-CN">简体中文</option>
              <option value="th-TH">ภาษาไทย</option>
            </select>
          </div>
          <button onClick={() => exportToWord(data, data.language)} className="icon-btn">
            <FileJson size={18} /><span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>{t('docExportWord', data.language)}</span>
          </button>
          <button 
            onClick={handleExportPdf} 
            className="primary-button" 
            style={{ padding: '0.4rem 1rem' }}
            disabled={isTranslating}
          >
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
          <PaperContent data={data} totalPages={totalPages} previewRef={previewRef} id="preview-paper" />
        </div>
      </div>
    </div>
  );
};

export default SpecPreview;
