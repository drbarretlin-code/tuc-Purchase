import React from 'react';
import type { AIHintSelection } from '../types/form';
import { HelpCircle, CheckCircle2, Circle, Book, History, Calendar } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hints?: AIHintSelection[];
  historyHints?: AIHintSelection[];
  regHints?: AIHintSelection[];
  onHintToggle?: (id: string) => void;
  onHistoryHintToggle?: (id: string) => void;
  onRegHintToggle?: (id: string) => void;
  isTextArea?: boolean;
  required?: boolean;
  placeholder?: string;
  inputType?: string;
  searchStatus?: 'pending' | 'success' | 'no_key' | 'ai_error' | 'empty' | 'none';
}

const SectionEditor: React.FC<Props> = ({ 
  label, value, onChange, hints, historyHints, regHints, 
  onHintToggle, onHistoryHintToggle, onRegHintToggle, 
  isTextArea = true, required = false, placeholder, inputType = "text",
  searchStatus = 'none'
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


      {/* 2. 技術法令補充建議 (V11: 新增分類) */}
      {regHints && regHints.length > 0 && (
        <div className="reg-hints-box" style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem',
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px dashed rgba(59, 130, 246, 0.3)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#60A5FA' }}>
            <Book size={14} />
            <span>技術法令補充建議</span>
          </div>
          {regHints.length >= 2 ? (
            <select 
              value="" 
              onChange={(e) => e.target.value && onRegHintToggle?.(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '4px' }}
            >
              <option value="" disabled>點擊選擇法令建議...</option>
              {regHints.map(hint => (
                <option key={hint.id} value={hint.id}>
                  {hint.selected ? '✅ ' : ''}{hint.content.substring(0, 50)}...
                </option>
              ))}
            </select>
          ) : (
            regHints.map((hint) => (
              <div key={hint.id} onClick={() => onRegHintToggle?.(hint.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '4px' }} className="hint-item">
                {hint.selected ? <CheckCircle2 size={16} color="#60A5FA" /> : <Circle size={16} color="#4B5563" />}
                <div style={{ fontSize: '0.875rem' }}><p style={{ margin: 0 }}>{hint.content}</p></div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 搜尋狀態提示與導引 (V12 新增) */}
      {searchStatus !== 'none' && searchStatus !== 'success' && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem', 
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          fontSize: '0.85rem'
        }}>
          {searchStatus === 'pending' && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>🔍 AI 正併行檢索中 (佇列模式)...</p>}
          {searchStatus === 'no_key' && (
            <div style={{ color: '#FBBF24' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>⚠️ 未偵測到 API 金鑰</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>請至系統設定輸入 VITE_GEMINI_KEY 以啟用智慧語意分析與重排序功能。</p>
            </div>
          )}
          {searchStatus === 'ai_error' && (
            <div style={{ color: '#F87171' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>❌ AI 語意分析異常</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>可能是 API 配額已達上限或網路連線問題，系統目前無法提供高準確度建議。</p>
            </div>
          )}
          {searchStatus === 'empty' && (
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>ℹ️ 未發現符合門檻 (60%) 的智慧建議，請嘗試增加更多需求描述內容。</p>
          )}
        </div>
      )}

      {/* 1. TUC 歷史資料建議 */}
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
            <span>TUC 歷史資料建議</span>
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
