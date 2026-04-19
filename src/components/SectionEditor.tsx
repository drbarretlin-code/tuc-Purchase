import React from 'react';
import type { AIHintSelection } from '../types/form';
import { HelpCircle, CheckCircle2, Circle, Book, History, Calendar, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hints?: AIHintSelection[];
  tucHints?: AIHintSelection[];
  historyHints?: AIHintSelection[];
  onHintToggle?: (id: string) => void;
  onTUCHintToggle?: (id: string) => void;
  onHistoryHintToggle?: (id: string) => void;
  isTextArea?: boolean;
  required?: boolean;
  placeholder?: string;
  inputType?: string;
  isLoading?: boolean;
}

const SectionEditor: React.FC<Props> = ({ 
  label, value, onChange, hints, tucHints, historyHints, onHintToggle, onTUCHintToggle, onHistoryHintToggle, 
  isTextArea = true, required = false, placeholder, inputType = "text", isLoading = false
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
        <div style={{ position: 'relative' }}>
          <input
            type={inputType}
            style={{ width: '100%', paddingRight: inputType === 'date' ? '40px' : '10px' }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `請輸入${label}...`}
          />
          {inputType === 'date' && (
            <div 
              onClick={(e) => {
                const input = e.currentTarget.previousSibling as HTMLInputElement;
                if (input && typeof (input as any).showPicker === 'function') {
                  (input as any).showPicker();
                } else if (input) {
                  input.focus();
                }
              }}
              style={{ 
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Calendar size={16} />
            </div>
          )}
        </div>
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
          
          {tucHints.length >= 2 ? (
            <select 
              value="" 
              onChange={(e) => {
                if (e.target.value) onTUCHintToggle?.(e.target.value);
              }}
              style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '4px' }}
            >
              <option value="" disabled>點擊選擇建議以導入...</option>
              {tucHints.map(hint => (
                <option key={hint.id} value={hint.id}>
                  {hint.selected ? '✅ ' : ''}{hint.content.substring(0, 50)}...
                </option>
              ))}
            </select>
          ) : (
            tucHints.map((hint) => (
              <div 
                key={hint.id} 
                style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                className="hint-item"
              >
                <div onClick={() => onTUCHintToggle?.(hint.id)} style={{ cursor: 'pointer', display: 'flex', gap: '0.75rem', flex: 1 }}>
                  {hint.selected ? <CheckCircle2 size={16} color="#60A5FA" /> : <Circle size={16} color="#4B5563" />}
                  <div style={{ fontSize: '0.875rem' }}>
                    <p style={{ margin: 0 }}>{hint.content}</p>
                  </div>
                </div>
                {hint.link && (
                  <a href={hint.link} target="_blank" rel="noreferrer" style={{ color: '#60A5FA', opacity: 0.8 }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))
          )}
          {isLoading && <div style={{ textAlign: 'center', marginTop: '4px' }}><Loader2 size={12} className="animate-spin" color="#60A5FA" /></div>}
        </div>
      )}

      {/* 歷史檔案參考 (RAG) */}
      {historyHints && historyHints.length > 0 && (
        <div className="history-hints-box" style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem',
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px dashed rgba(16, 185, 129, 0.3)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#10B981' }}>
            <History size={14} />
            <span>TUC 歷史參考 (來自上傳檔案)</span>
          </div>

          {historyHints.length >= 2 ? (
            <select 
              value="" 
              onChange={(e) => {
                if (e.target.value) onHistoryHintToggle?.(e.target.value);
              }}
              style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px' }}
            >
              <option value="" disabled>點擊選擇歷史條文以導入...</option>
              {historyHints.map(hint => (
                <option key={hint.id} value={hint.id}>
                  {hint.selected ? '✅ ' : ''}[來源:{ (hint as any).source || '未知' }] {hint.content.substring(0, 50)}...
                </option>
              ))}
            </select>
          ) : (
            historyHints.map((hint) => (
              <div 
                key={hint.id} 
                onClick={() => onHistoryHintToggle?.(hint.id)}
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
                {hint.selected ? <CheckCircle2 size={16} color="#10B981" /> : <Circle size={16} color="#4B5563" />}
                <div style={{ fontSize: '0.875rem' }}>
                  <p style={{ margin: 0 }}>{hint.content}</p>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>來源: {(hint as any).source || '未知'}</span>
                </div>
              </div>
            ))
          )}
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
          {hints.length >= 2 ? (
            <select 
              value="" 
              onChange={(e) => {
                if (e.target.value) onHintToggle?.(e.target.value);
              }}
              style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(230, 0, 18, 0.2)', borderRadius: '4px' }}
            >
              <option value="" disabled>點擊選擇建議以導入...</option>
              {hints.map(hint => (
                <option key={hint.id} value={hint.id}>
                  {hint.selected ? '✅ ' : ''}{hint.content.substring(0, 50)}...
                </option>
              ))}
            </select>
          ) : (
            hints.map((hint) => (
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
                {hint.selected ? <CheckCircle2 size={16} color="#E60012" /> : <Circle size={16} color="#4B5563" />}
                <div style={{ fontSize: '0.875rem' }}>
                  <p style={{ margin: 0 }}>{hint.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
