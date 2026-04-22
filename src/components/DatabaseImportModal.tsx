import React, { useState, useEffect } from 'react';
import { Database, X, Search, Loader2, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { assembleJsonFromExistingEntries, translateCloudMetadata } from '../lib/knowledgeParser';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';

interface DatabaseImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (data: any) => void;
  language: Language;
}

export const DatabaseImportModal: React.FC<DatabaseImportModalProps> = ({ isOpen, onClose, onSelect, language }) => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [translatedDocs, setTranslatedDocs] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (documents.length > 0 && language !== 'zh-TW') {
      setTranslatedDocs([]); // 先清空舊語系的翻譯，避免看到原文
      translateList();
    } else {
      setTranslatedDocs(documents);
    }
  }, [documents, language]);

  const translateList = async () => {
    const apiKey = localStorage.getItem('tuc_gemini_key') || '';
    if (!apiKey || isTranslating) return;
    
    setIsTranslating(true);
    try {
      // 翻譯前 50 筆以優化體驗 (覆蓋絕大多數常用紀錄)
      const itemsToTranslate = documents.slice(0, 50).map(d => ({
        id: d.docId,
        name: d.equipmentName
      }));
      const translated = await translateCloudMetadata(itemsToTranslate, language, apiKey);
      const newDocs = documents.map(d => {
        const trans = translated.find(t => t.id === d.docId);
        return trans ? { ...d, equipmentName: trans.name } : d;
      });
      setTranslatedDocs(newDocs);
    } catch (err) {
      console.error('Modal Translation Error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('tuc_uploaded_files')
        .select('id, original_name, display_name, created_at, full_json_data, requester')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedDocs = data?.map(item => ({
        docId: item.id,
        equipmentName: item.display_name || item.original_name || t('unnamedDoc', language),
        createdAt: item.created_at,
        hasJson: !!item.full_json_data,
        fullJson: item.full_json_data,
        fileName: item.original_name,
        requester: item.requester
      }));

      setDocuments(mappedDocs || []);
    } catch (err) {
      console.error('Fetch docs failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (doc: any) => {
    if (doc.hasJson) {
      // 確保傳出的資料包含 docId (處理可能缺少的舊資料)
      onSelect({ ...doc.fullJson, docId: doc.docId });
      onClose();
    } else {
      // 執行反向組裝
      setProcessingId(doc.docId);
      try {
        const assembled = await assembleJsonFromExistingEntries(doc.docId, undefined, doc.fileName);
        if (assembled) {
          onSelect(assembled);
          onClose();
        } else {
          alert(t('aiAssembleFail', language));
        }
      } catch (err: any) {
        alert(`${t('parseError', language)}: ${err.message || t('unknown', language)}`);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const filteredDocs = (language === 'zh-TW' ? documents : translatedDocs).filter(d => 
    d.equipmentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={e => e.stopPropagation()}
        style={{ width: '90%', maxWidth: '700px', padding: '2rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database className="tuc-gradient-text" size={24} />
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>{t('importCloudTitle', language)}</h2>
          </div>
          <button onClick={onClose} className="icon-btn" style={{ padding: '8px' }}><X size={20} /></button>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
          <input 
            type="text" 
            placeholder={t('searchEqPlaceholder', language)} 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '40px' }}
          />
        </div>

        <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading || (isTranslating && translatedDocs.length === 0) ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} />
              {isTranslating ? t('aiTranslatingContent', language) : t('loadingCloud', language)}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <AlertCircle style={{ margin: '0 auto 12px', opacity: 0.5 }} size={32} />
              {t('noCloudMatch', language)}
            </div>
          ) : (
            (searchQuery ? filteredDocs : translatedDocs).map(doc => (
              <div 
                key={doc.docId} 
                className="db-item-card"
                onClick={() => !processingId && handleSelect(doc)}
                style={{ 
                  opacity: processingId && processingId !== doc.docId ? 0.5 : 1,
                  position: 'relative'
                }}
              >
                <div className="db-item-info">
                  <h4>{doc.equipmentName}</h4>
                  <p>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {new Date(doc.createdAt).toLocaleString(language)}
                    {!doc.hasJson && !doc.equipmentName.includes(t('tabHardware', language)) && !doc.equipmentName.includes(t('regReq', language)) && (
                      <span style={{ marginLeft: '12px', color: '#F59E0B', fontWeight: 600 }}>{t('needAiAssemble', language)}</span>
                    )}
                  </p>
                </div>
                <div>
                  {processingId === doc.docId ? (
                    <Loader2 className="animate-spin" size={20} color="var(--tuc-red)" />
                  ) : (
                    <ChevronRight size={20} color="var(--text-secondary)" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {t('aiAssembleTip', language)}
        </div>
      </div>
    </div>
  );
};
