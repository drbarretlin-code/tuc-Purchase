import React from 'react';
import { X, ShieldAlert, Info, Lightbulb } from 'lucide-react';
import type { DiagnosticResult } from '../lib/knowledgeParser';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostic: DiagnosticResult | null;
  fileName: string;
}

const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ isOpen, onClose, diagnostic, fileName }) => {
  if (!isOpen || !diagnostic) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="glass-panel modal-content" style={{ padding: '2rem', maxWidth: '500px', width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#EF4444' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>解析診斷報告</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>{fileName}</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn">
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 錯誤摘要 */}
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', color: '#EF4444', fontSize: '0.9rem', fontWeight: 'bold' }}>
              <Info size={16} /> 故障類型: {diagnostic.code}
            </div>
            <p style={{ margin: 0, fontSize: '1rem', color: '#ddd', lineHeight: 1.5 }}>
              {diagnostic.message}
            </p>
          </div>

          {/* 建議方案 */}
          {diagnostic.suggestion && (
            <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', color: '#10B981', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <Lightbulb size={16} /> 建議解決方案
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa', lineHeight: 1.6 }}>
                {diagnostic.suggestion}
              </p>
            </div>
          )}

          {/* 原始錯誤詳情 (摺疊) */}
          {diagnostic.rawError && (
            <details style={{ cursor: 'pointer' }}>
              <summary style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>查看原始技術日誌</summary>
              <pre style={{
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: '#666',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {diagnostic.rawError}
              </pre>
            </details>
          )}

          <div style={{ fontSize: '0.7rem', color: '#444', textAlign: 'right' }}>
            診斷時間: {new Date(diagnostic.timestamp).toLocaleString()}
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="primary-button" onClick={onClose} style={{ width: '100px' }}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticModal;
