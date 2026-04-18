import React, { useState } from 'react';
import { X, Search, ExternalLink, BookOpen, ShieldAlert } from 'lucide-react';
import tucKnowledge from '../data/tuc_knowledge.json';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const KnowledgeModel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen) return null;

  const filteredRegs = tucKnowledge.regulations.filter(r => 
    r.title.includes(searchTerm) || 
    r.keywords.some(k => k.includes(searchTerm)) ||
    r.category.includes(searchTerm)
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="glass-panel" style={{ 
        width: '90vw', 
        height: '85vh', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '2rem',
        maxWidth: '1200px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={28} color="var(--tuc-red)" />
            <div>
              <h2 style={{ margin: 0 }}>台燿技術法規知識庫</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>提供全國法規、PCCES施工規範與 TUC 內部技術標準檢索</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn">
            <X size={24} />
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <input 
            type="text" 
            placeholder="搜尋關鍵字（例如：職安、節能、PCCES、空調...）" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1.2rem 3.5rem 1.2rem 1.5rem', 
              fontSize: '1.1rem', 
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color)'
            }}
          />
          <Search size={22} style={{ position: 'absolute', right: '20px', top: '18px', color: '#666' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredRegs.map((reg, idx) => (
              <div key={idx} className="knowledge-card" style={{ 
                padding: '1.5rem', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                border: '1px solid rgba(230,0,18,0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    background: 'var(--tuc-red)', 
                    color: 'white', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>{reg.category}</span>
                </div>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#f0f0f0' }}>{reg.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#999', lineHeight: '1.5', flex: 1 }}>{reg.summary}</p>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {reg.keywords.slice(0, 3).map(k => <span key={k} style={{ fontSize: '0.65rem', color: '#555' }}>#{k}</span>)}
                  </div>
                  <a href={reg.url} target="_blank" rel="noreferrer" style={{ 
                    color: '#60A5FA', 
                    fontSize: '0.8rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}>
                    查閱原文 <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
          {filteredRegs.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '5rem', color: '#555' }}>
              <ShieldAlert size={48} style={{ marginBottom: '1rem' }} />
              <p>未找到相關法規或標準，建議嘗試更簡短的關鍵字。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeModel;
