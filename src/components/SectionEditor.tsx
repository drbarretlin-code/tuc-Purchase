import React from 'react';
import type { AIHintSelection } from '../types/form';
import { HelpCircle, CheckCircle2, Circle, Book } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hints?: AIHintSelection[];
  tucHints?: AIHintSelection[];
  onHintToggle?: (id: string) => void;
  onTUCHintToggle?: (id: string) => void;
  isTextArea?: boolean;
  required?: boolean;
  placeholder?: string;
  inputType?: string;
}

const SectionEditor: React.FC<Props> = ({ 
  label, value, onChange, hints, tucHints, onHintToggle, onTUCHintToggle, isTextArea = true, required = false, placeholder, inputType = "text"
}) => {
  return (
    <div className="section-editor" style={{ marginBottom: '1.5rem' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '0.9rem', 
        fontWeight: '600', 
        marginBottom: '0.5rem',
        color: 'var(--text-secondary)'
      }}>
        {label} {required && <span style={{ color: 'var(--tuc-red)' }}>*</span>}
      </label>
      
      {isTextArea ? (
        <textarea
          style={{ width: '100%', minHeight: '100px' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `請輸入${label}...`}
        />
      ) : (
        <input
          type={inputType}
          style={{ width: '100%' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `請輸入${label}...`}
        />
      )}

      {/* TUC 建議新增 (優先顯示) */}
      {tucHints && tucHints.length > 0 && (
        <div className="tuc-hints-box" style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem',
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px dashed rgba(59, 130, 246, 0.3)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#60A5FA' }}>
            <Book size={14} />
            <span>TUC 知識庫建議 (勾選導入)</span>
          </div>
          {tucHints.map((hint) => (
            <div 
              key={hint.id} 
              onClick={() => onTUCHintToggle?.(hint.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.75rem', 
                padding: '0.5rem',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              className="hint-item"
            >
              {hint.selected ? <CheckCircle2 size={16} color="#60A5FA" /> : <Circle size={16} color="#4B5563" />}
              <div style={{ fontSize: '0.875rem' }}>
                <p style={{ margin: 0 }}>{hint.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI 建議補充 */}
      {hints && hints.length > 0 && (
        <div className="ai-hints-box" style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem',
          background: 'rgba(230, 0, 18, 0.05)',
          border: '1px dashed rgba(230, 0, 18, 0.2)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--tuc-red)' }}>
            <HelpCircle size={14} />
            <span>AI 建議補充</span>
          </div>
          {hints.map((hint) => (
            <div 
              key={hint.id} 
              onClick={() => onHintToggle?.(hint.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.75rem', 
                padding: '0.5rem',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              className="hint-item"
            >
              {hint.selected ? <CheckCircle2 size={16} color="#4ADE80" /> : <Circle size={16} color="#4B5563" />}
              <div style={{ fontSize: '0.875rem' }}>
                <p style={{ margin: 0 }}>{hint.content}</p>
                {hint.link && (
                  <a 
                    href={hint.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: '0.75rem', color: '#60A5FA', textDecoration: 'none' }}
                  >
                    [參考連結]
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
