import React, { useState, useEffect } from 'react';
import { X, Book, ExternalLink, Loader2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose, language }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchManual();
    }
  }, [isOpen, language]);

  const fetchManual = async () => {
    setLoading(true);
    try {
      // 根據語言載入對應的 md 檔案
      const response = await fetch(`/manuals/${language}.md`);
      if (!response.ok) throw new Error('Manual not found');
      const text = await response.text();
      setContent(text);
    } catch (err) {
      console.error('Failed to load manual:', err);
      setContent('Failed to load manual content.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
      h1 { color: #000; border-bottom: 2px solid #FF3B30; padding-bottom: 10px; }
      h2 { color: #FF9500; margin-top: 30px; }
      h3 { color: #444; margin-top: 20px; }
      p { margin-bottom: 15px; }
      ul { padding-left: 20px; margin-bottom: 20px; }
      li { margin-bottom: 8px; }
      code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; color: #FF3B30; }
      hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
      blockquote { border-left: 4px solid #FF3B30; padding-left: 20px; margin: 20px 0; color: #666; font-style: italic; }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    `;

    // 這裡我們需要渲染 Markdown 為 HTML，簡單起見，我們借用一個隱藏的 div 或直接用 markdown-body 的內容
    const contentHtml = document.querySelector('.manual-content')?.innerHTML || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${t('userManual', language)}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="manual-content">
            ${contentHtml}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="glass-panel" style={{ 
        width: '90vw', 
        maxWidth: '900px', 
        height: '85vh', 
        display: 'flex', 
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '1.5rem 2rem', 
          borderBottom: '1px solid var(--border-color)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)', 
              padding: '8px', 
              borderRadius: '10px',
              boxShadow: '0 4px 15px rgba(255, 59, 48, 0.3)'
            }}>
              <Book size={24} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{t('userManual', language)}</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>V17.6 System Documentation</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={handlePrint} 
              className="icon-btn" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}
              title={t('exportPdf', language)}
            >
              <Download size={20} />
              <span style={{ fontSize: '0.85rem' }}>{t('exportPdf', language)}</span>
            </button>
            <button onClick={onClose} className="icon-btn">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '2rem 3rem',
          lineHeight: 1.6
        }} className="markdown-body">
          {loading ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={40} style={{ marginBottom: '1rem' }} />
              <p>{t('loadingCloud', language)}...</p>
            </div>
          ) : (
            <div className="manual-content">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1rem 2rem', 
          borderTop: '1px solid var(--border-color)', 
          display: 'flex', 
          justifyContent: 'flex-end',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--tuc-red)', 
              fontSize: '0.9rem', 
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            <ExternalLink size={16} />
            Apply Gemini API Key
          </a>
        </div>
      </div>

      <style>{`
        .manual-content h1 { color: white; border-bottom: 2px solid var(--tuc-red); padding-bottom: 0.5rem; margin-top: 0; }
        .manual-content h2 { color: #FF9500; margin-top: 2rem; display: flex; alignItems: center; gap: 8px; }
        .manual-content h2::before { content: "•"; color: var(--tuc-red); font-size: 1.5rem; }
        .manual-content h3 { color: #eee; margin-top: 1.5rem; }
        .manual-content p { color: #ccc; margin-bottom: 1rem; }
        .manual-content ul { padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .manual-content li { margin-bottom: 0.5rem; color: #bbb; }
        .manual-content code { background: rgba(255,255,255,0.1); padding: 2px 6px; borderRadius: 4px; color: #FF3B30; }
        .manual-content hr { border: none; border-top: 1px solid var(--border-color); margin: 2rem 0; }
        .manual-content blockquote { border-left: 4px solid var(--tuc-red); padding-left: 1rem; margin: 1.5rem 0; color: #999; font-style: italic; }
      `}</style>
    </div>
  );
};

export default ManualModal;
