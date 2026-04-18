import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, FileText, Download, Check, FileJson } from 'lucide-react';
import { exportToPDF, exportToWord } from '../logic/exporter';

interface Props {
  markdown: string;
}

const SpecPreview: React.FC<Props> = ({ markdown }) => {
  const [copied, setCopied] = useState(false);
  const [pages, setPages] = useState({ current: 1, total: 1 });
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      const calculatedTotal = Math.max(1, Math.ceil(height / 1123)); // 估算 A4 高度
      setPages(prev => ({ ...prev, total: calculatedTotal }));
    }
  }, [markdown]);

  return (
    <div className="preview-section glass-panel">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        padding: '0.5rem 1rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText color="#E60012" size={24} />
          <h3 style={{ margin: 0 }}>規範表預覽 </h3>
          <span style={{ 
            fontSize: '0.75rem', 
            background: 'rgba(255,255,255,0.1)', 
            padding: '2px 8px', 
            borderRadius: '12px',
            marginLeft: '8px'
          }}>
            頁數：{pages.current} / {pages.total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleCopy}
            title="複製 Markdown"
            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
          >
            {copied ? <Check size={18} color="#4ADE80" /> : <Copy size={18} />}
          </button>
          <button 
            onClick={() => exportToWord(markdown, 'TUC_Specification')}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-color)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <FileJson size={16} />
            Word
          </button>
          <button 
            onClick={() => exportToPDF('preview-paper', 'TUC_Specification')}
            style={{ 
              background: 'var(--tuc-red)', 
              border: 'none',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <Download size={16} />
            PDF 匯出
          </button>
        </div>
      </div>

      <div style={{ 
        maxHeight: 'calc(100vh - 200px)', 
        overflowY: 'auto',
        borderRadius: '8px',
        padding: '1rem',
        background: '#1a1a1c'
      }}>
        <div id="preview-paper" ref={contentRef} className="preview-content">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default SpecPreview;
