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
  const [debounceTimer, setDebounceTimer] = useState<any>(null);

  useEffect(() => {
    if (documents.length > 0 && language !== 'zh-TW') {
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        translateList();
      }, 500); // V27.21: 增加 Debounce 避免輸入時頻繁觸發 AI
      setDebounceTimer(timer);
    } else {
      setTranslatedDocs(documents);
    }
    return () => { if (debounceTimer) clearTimeout(debounceTimer); };
  }, [documents, language, searchQuery]); 

  const translateList = async () => {
    const apiKey = localStorage.getItem('tuc_gemini_key') || '';
    if (!apiKey || isTranslating) return;
    
    setIsTranslating(true);
    try {
      // V27.21: 修正翻譯過濾邏輯 - 先比對原始設備名稱
      const currentFiltered = documents.filter(d => 
        d.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.fileName || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      let itemsToTranslate = currentFiltered.slice(0, 30).map(d => ({
        id: d.docId,
        name: d.equipmentName
      }));

      if (itemsToTranslate.length === 0 && documents.length > 0) {
        itemsToTranslate = documents.slice(0, 30).map(d => ({
          id: d.docId,
          name: d.equipmentName
        }));
      }

      if (itemsToTranslate.length === 0) {
        setIsTranslating(false);
        return;
      }

      const translated = await translateCloudMetadata(itemsToTranslate, language, apiKey);
      
      // 採用「累計式」更新：保留既有已翻譯內容，並加入新的翻譯結果
      setTranslatedDocs(prev => {
        const updated = [...prev];
        translated.forEach(trans => {
          const idx = updated.findIndex(d => d.docId === trans.id);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], equipmentName: trans.name };
          } else {
            // 如果 prev 裡還沒有（例如初始狀態），則從 documents 找
            const doc = documents.find(d => d.docId === trans.id);
            if (doc) updated.push({ ...doc, equipmentName: trans.name });
          }
        });
        
        // 確保沒有在 prev 裡的原始文件也能出現在 translatedDocs（雖然是原文）
        documents.forEach(doc => {
          if (!updated.some(u => u.docId === doc.docId)) {
            updated.push(doc);
          }
        });

        return updated;
      });
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

      // V27.3: 排除純技術法令類檔案
      // 策略：取得所有擁有 Specific 條目的來源檔名，
      // 未出現在此集合內的檔案即視為「純 Standard/Global」，予以排除。
      const { data: specificEntries } = await supabase
        .from('tuc_history_knowledge')
        .select('source_file_name')
        .eq('metadata->>docType', 'Specific');

      // 建立「有設備規範條目」的檔名集合
      const specificFileNames = new Set<string>(
        (specificEntries || []).map((e: any) => e.source_file_name as string)
      );

      const { data, error } = await supabase
        .from('tuc_uploaded_files')
        .select('id, original_name, display_name, created_at, full_json_data, requester')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // V27.7: 驗證 full_json_data 是否包含有效的 FormState 欄位
      // 若只有 { summary, keywords } 等非 FormState 結構，視為無效，降級至 AI 組裝路徑
      const FORM_STATE_VALIDATION_KEYS = [
        'equipmentName', 'requirementDesc', 'appearance',
        'installStandard', 'acceptanceDesc', 'envRequirements', 'safetyRequirements'
      ];
      const isValidFormJson = (json: any): boolean => {
        if (!json || typeof json !== 'object') return false;
        return FORM_STATE_VALIDATION_KEYS.some(
          k => typeof json[k] === 'string' && json[k].trim().length > 0
        );
      };

      const mappedDocs = (data || [])
        .filter(item => {
          const isParsedAsRegOnly =
            specificEntries !== null &&
            specificFileNames.size > 0 &&
            !specificFileNames.has(item.original_name) &&
            item.full_json_data === null;
          return !isParsedAsRegOnly;
        })
        .map(item => ({
          docId: item.id,
          equipmentName: item.display_name || item.original_name || t('unnamedDoc', language),
          createdAt: item.created_at,
          hasJson: isValidFormJson(item.full_json_data), // V27.7: 嚴格驗證欄位，而非只判斷非 null
          fullJson: item.full_json_data,
          fileName: item.original_name,
          requester: item.requester
        }));

      setDocuments(mappedDocs);
      // V27.21: 立即初始化 translatedDocs 避免畫面被 Loader 鎖死
      setTranslatedDocs(mappedDocs);
    } catch (err) {
      console.error('Fetch docs failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (doc: any) => {
    if (doc.hasJson) {
      // 確保傳出的資料包含 docId (處理可能缺少的舊資料)
      // V27.2: await onSelect 確保 async 狀態更新（語系轉譯 + onChange）在關閉 Modal 前完成
      await onSelect({ ...doc.fullJson, docId: doc.docId });
      onClose();
    } else {
      // 執行反向組裝
      setProcessingId(doc.docId);
      try {
        const assembled = await assembleJsonFromExistingEntries(doc.docId, undefined, doc.fileName);
        if (assembled) {
          await onSelect(assembled);
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

  // V27.21: 支援雙語搜尋 (同時比對翻譯後名稱與原始檔案名稱/請求者)
  const filteredDocs = (language === 'zh-TW' ? documents : (translatedDocs.length > 0 ? translatedDocs : documents)).filter(d => 
    d.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.requester || '').toLowerCase().includes(searchQuery.toLowerCase())
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
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} />
              {t('loadingCloud', language)}
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
