import { useState, useEffect } from 'react';
import type { FormState } from './types/form';
import { INITIAL_FORM_STATE } from './types/form';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import { ShieldAlert, Settings, X, PenTool, BookOpen, Eye, EyeOff, Trash2, Download, Lock, Save, Database, CloudUpload, Sparkles, Zap, Loader2, Check, Minimize2, Maximize2, Repeat } from 'lucide-react';
import { supabase } from './lib/supabase';
import * as KP from './lib/knowledgeParser';
import UploadWizardModal from './components/UploadModal';
import { t } from './lib/i18n';
import type { Language } from './lib/i18n';

function App() {
  const [data, setData] = useState<FormState>(() => {
    const savedProfile = localStorage.getItem('tuc_user_profile');
    const initialState = { ...INITIAL_FORM_STATE };
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      initialState.department = profile.department || '';
      initialState.requester = profile.requester || '';
      initialState.extension = profile.extension || '';
      initialState.applicantName = profile.requester || '';
    }
    return initialState;
  });


  useEffect(() => {
    const profile = {
      department: data.department,
      requester: data.requester,
      extension: data.extension
    };
    localStorage.setItem('tuc_user_profile', JSON.stringify(profile));
  }, [data.department, data.requester, data.extension]);

  useEffect(() => {
    // V16: 持久化語系選擇
    localStorage.setItem('tuc_ui_lang', data.language);
    document.documentElement.lang = data.language;
  }, [data.language]);

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('tuc_gemini_key') || '');
  const [showConfig, setShowConfig] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isResizing, setIsResizing] = useState(false);
  const [splitPercentage, setSplitPercentage] = useState(45); // 編輯區佔比
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  // V7.1: 補解析與進度條狀態
  const [isReparsing, setIsReparsing] = useState(false);
  const [reparseProgress, setReparseProgress] = useState(0);
  const [reparseTotal, setReparseTotal] = useState(0);
  const [reparseIndex, setReparseIndex] = useState(0);
  const [reparseCurrentFile, setReparseCurrentFile] = useState('');

  const [mobileAppTab, setMobileAppTab] = useState<'edit' | 'preview'>('edit');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // V6.1 雲端查閱器狀態 (僅保留歷史檔案)
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [showCloudInspector, setShowCloudInspector] = useState(false);
  const [isReparseMinimized, setIsReparseMinimized] = useState(false);
  const [isCloudAuthed, setIsCloudAuthed] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('tuc_admin_password') || '000000');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isChangePasswordMode, setIsChangePasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [searchQuery] = useState('');
  
  // V10.3: 批次刪除狀態
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  // V9.0: 行內標籤編輯狀態
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [tempTags, setTempTags] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !showPreview || isMobile) return;
      const newPercentage = (e.clientX / window.innerWidth) * 100;
      if (newPercentage > 20 && newPercentage < 80) {
        setSplitPercentage(newPercentage);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('unselectable');
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('unselectable');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, showPreview, isMobile]);

  const handleSaveConfig = () => {
    const cleanKey = tempKey.trim();
    setApiKey(cleanKey);
    setTempKey(cleanKey);
    localStorage.setItem('tuc_gemini_key', cleanKey);
    setShowConfig(false);
  };

  const fetchCloudFiles = async () => {
    console.log('[Debug] 正在嘗試獲取雲端歷史檔案...', { supabaseInitialized: !!supabase });
    if (!supabase) return;
    
    try {
      // 1. 獲取檔案清單 (優先使用 is_parsed 標籤)
      const { data: list, error: fileError } = await supabase
        .from('tuc_uploaded_files')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fileError) throw fileError;

      // 2. 優化統計：分次或分頁獲取條目數 (預防 1000 筆限制)
      // 若資料量極大，此處僅作為視覺參考，核心邏輯應依賴 is_parsed
      const { data: knowledgeStats, error: countError } = await supabase
        .from('tuc_history_knowledge')
        .select('source_file_name')
        .limit(5000); // 擴大抓取上限至 5000 條做簡易統計
      
      if (countError) console.error('無法統計解析條目:', countError);

      const countMap: Record<string, number> = {};
      knowledgeStats?.forEach(item => {
        const name = item.source_file_name;
        countMap[name] = (countMap[name] || 0) + 1;
      });

      // 3. 合併資料 (V8.10: 權威化 is_parsed 標籤，解決狀態回滾問題)
      const enrichedList = (list || []).map(f => {
        // 優先讀取資料庫顯式標記，再看背景統計
        const dbIsParsed = f.is_parsed === true;
        const countFromStats = countMap[f.original_name] || 0;
        
        return {
          ...f,
          knowledgeCount: countFromStats,
          // 只要資料庫標記為 true，或統計大於 0，且不允許被舊資料覆寫為 false (若本地目前已是 true)
          is_parsed: dbIsParsed || (countFromStats > 0)
        };
      });

      console.log(`[Debug] 查詢成功，找到 ${enrichedList.length} 筆紀錄。`);
      setCloudFiles(enrichedList);
    } catch (err: any) {
      console.error('[Debug] fetchCloudFiles 捕捉到異常:', err.message);
      alert('無法取得檔案紀錄: ' + err.message);
    }
  };

  const handleOpenInspector = () => {
    setSelectedFileIds([]); // 開啟時重置選擇
    if (isCloudAuthed) {
      fetchCloudFiles();
      setShowCloudInspector(true);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handleVerifyPassword = () => {
    if (inputPassword === adminPassword) {
      setIsCloudAuthed(true);
      setShowPasswordPrompt(false);
      setInputPassword('');
      fetchCloudFiles();
      setShowCloudInspector(true);
    } else {
      alert('密碼錯誤，請重新輸入。');
      setInputPassword('');
    }
  };

  const handleChangePassword = () => {
    if (!/^\d{6,}$/.test(newPassword)) {
      setPasswordError('密碼必須為至少 6 位數字');
      return;
    }
    setAdminPassword(newPassword);
    localStorage.setItem('tuc_admin_password', newPassword);
    alert('密碼變更成功！請使用新密碼登入。');
    setIsChangePasswordMode(false);
    setNewPassword('');
    setPasswordError('');
  };

  const handleDeleteFile = async (id: string) => {
    if (!supabase || !confirm('確定要永久刪除此上傳紀錄嗎？')) return;
    try {
      const { error } = await supabase.from('tuc_uploaded_files').delete().eq('id', id);
      if (error) throw error;
      setCloudFiles(prev => prev.filter(f => f.id !== id));
      setSelectedFileIds(prev => prev.filter(x => x !== id));
      alert('刪除成功');
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleToggleSelectFile = (id: string) => {
    setSelectedFileIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiles = (select: boolean) => {
    if (select) {
      const allIds = filteredFiles.map(f => f.id);
      setSelectedFileIds(allIds);
    } else {
      setSelectedFileIds([]);
    }
  };

  const handleBatchDeleteFiles = async () => {
    if (!supabase || selectedFileIds.length === 0) return;
    if (!confirm(`確定要永久刪除這 ${selectedFileIds.length} 筆上傳紀錄（包含關聯解析資料）嗎？\n此操作無法復原。`)) return;

    try {
      const filesToDelete = cloudFiles.filter(f => selectedFileIds.includes(f.id));
      const pathsToDelete = filesToDelete.map(f => f.storage_path);
      const namesToDelete = Array.from(new Set(filesToDelete.map(f => f.original_name)));

      // 1. 清理關聯知識庫 (以檔名為準)
      for (const name of namesToDelete) {
        await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', name);
      }
      // 2. 清理 Storage 實體
      await supabase.storage.from('spec-files').remove(pathsToDelete);
      // 3. 清理資料庫紀錄
      const { error } = await supabase.from('tuc_uploaded_files').delete().in('id', selectedFileIds);
      
      if (error) throw error;

      setCloudFiles(prev => prev.filter(f => !selectedFileIds.includes(f.id)));
      setSelectedFileIds([]);
      alert(`已成功刪除 ${selectedFileIds.length} 筆紀錄`);
    } catch (err: any) {
      console.error('批次刪除失敗:', err);
      alert('批次刪除失敗: ' + err.message);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!supabase || !confirm('系統將自動掃描資料庫中「檔名相同」的重複項，僅保留最新的一筆紀錄。\n此操作將同步清理實體檔案與解析紀錄，確定執行嗎？')) return;
    
    try {
      // 1. 獲取所有紀錄
      const { data: allFiles, error: fetchError } = await supabase
        .from('tuc_uploaded_files')
        .select('id, original_name, equipment_name, created_at, storage_path')
        .order('created_at', { ascending: false });
 
      if (fetchError || !allFiles) throw fetchError;
 
      // 2. 演算法辨識重複項 (保留每組的第一筆，即最新的)
      const seen = new Set<string>();
      const toDelete: { id: string, path: string, name: string }[] = [];
 
      allFiles.forEach(bit => {
        // V8.7: 改為僅以檔名作為去重基準 (寬鬆判斷)
        const key = bit.original_name;
        if (seen.has(key)) {
          toDelete.push({ id: bit.id, path: bit.storage_path, name: bit.original_name });
        } else {
          seen.add(key);
        }
      });

      if (toDelete.length === 0) {
        alert('目前資料庫非常整潔，未偵測到任何重複檔案。');
        return;
      }

      // 3. 執行批次清理
      const idsToRemove = toDelete.map(d => d.id);
      const pathsToRemove = toDelete.map(d => d.path);
      const namesToRemove = Array.from(new Set(toDelete.map(d => d.name)));

      // 清理關聯知識庫 (以檔名為準)
      for (const name of namesToRemove) {
        await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', name);
      }
      // 清理 Storage 實體
      await supabase.storage.from('spec-files').remove(pathsToRemove);
      // 清理資料庫紀錄
      await supabase.from('tuc_uploaded_files').delete().in('id', idsToRemove);

      alert(`清理完成！已移除 ${toDelete.length} 筆重複紀錄。`);
      fetchCloudFiles();
    } catch (err: any) {
      console.error('清理失敗:', err);
      alert('清理過程發生錯誤: ' + err.message);
    }
  };

  const handleUpdateTags = async (fileId: string, tagsString: string) => {
    if (!supabase) return;
    try {
      // 處理輸入：逗號分隔、去重、去頭尾空白
      const tagArray = tagsString
        .split(/[，,]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      const uniqueTags = Array.from(new Set(tagArray));

      const { error } = await supabase
        .from('tuc_uploaded_files')
        .update({ equipment_tags: uniqueTags })
        .eq('id', fileId);

      if (error) throw error;

      // 本地同步優化
      setCloudFiles(prev => prev.map(f => {
        if (f.id === fileId) return { ...f, equipment_tags: uniqueTags };
        return f;
      }));
      setEditingFileId(null);
    } catch (err: any) {
      alert('標籤更新失敗: ' + err.message);
    }
  };

  const handleAutofixLabels = async () => {
    if (!supabase || !confirm('系統將分析全課檔案內容，自動辨別並校準正確的「設備標籤」。\n這將修正如「大明剪床」被誤植至 RTO 等錯誤關聯，確定執行嗎？')) return;
    if (!supabase) {
      alert('資料庫尚未就緒，請檢查連線。');
      return;
    }

    // V9.7: 診斷診斷日誌 - 檢查欄位狀態
    console.log('[校準診斷] 目前 CloudFiles 前三筆狀態:', cloudFiles.slice(0, 3).map(f => ({
      name: f.original_name,
      is_calibrated: f.is_calibrated,
      type: typeof f.is_calibrated
    })));

    // V9.7: 強化跳過機制 - 嚴謹判定 !== true (包含 false, undefined, null)
    const targets = cloudFiles.filter(f => f.is_calibrated !== true);
    
    console.log(`[校準啟動] 待處理總數: ${targets.length} / 全部總數: ${cloudFiles.length}`);

    if (targets.length === 0) {
      alert('所有檔案皆已完成 AI 標籤校準，無須重複執行。');
      return;
    }

    const userApiKey = localStorage.getItem('tuc_gemini_key') || '';
    setIsReparsing(true);

    try {
      const totalCount = targets.length;
      setReparseTotal(totalCount);

      for (let i = 0; i < totalCount; i++) {
        const fileRecord = targets[i];
        setReparseIndex(i + 1);
        setReparseProgress(Math.round(((i + 1) / totalCount) * 100));
        setReparseCurrentFile(fileRecord.original_name);

        let currentDetectedLabel = fileRecord.equipment_name;

        try {
          const resp = await fetch(fileRecord.public_url);
          const blob = await resp.blob();
          const fileObj = new File([blob], fileRecord.original_name, { type: blob.type });

          const result = await KP.processFileToKnowledge(fileObj, userApiKey, fileRecord.equipment_name, fileRecord.id);
          currentDetectedLabel = result?.detectedEquipment || fileRecord.equipment_name;

          const newDisplayName = `${fileRecord.original_name} (${currentDetectedLabel})`;
          const updateData: any = { 
            is_calibrated: true,
            equipment_name: currentDetectedLabel, 
            equipment_tags: [currentDetectedLabel],
            display_name: newDisplayName 
          };

          const { error: updateError } = await supabase.from('tuc_uploaded_files')
            .update(updateData)
            .eq('id', fileRecord.id);

          if (updateError) {
            console.error('更新標籤失敗:', updateError);
            throw new Error(`更新資料庫失敗: ${updateError.message}`);
          }

          if (currentDetectedLabel !== fileRecord.equipment_name) {
            const { data: entries } = await supabase
              .from('tuc_history_knowledge')
              .select('id, metadata')
              .eq('source_file_name', fileRecord.original_name);
            
            if (entries) {
              for (const entry of entries) {
                const newMetadata = { ...entry.metadata, equipment_name: currentDetectedLabel };
                await supabase.from('tuc_history_knowledge').update({ metadata: newMetadata }).eq('id', entry.id);
              }
            }
          }
        } catch (e: any) {
          console.error(`[Batch] 檔案 ${fileRecord.original_name} 校準失敗:`, e);
          // V13.7: 改為 continue，避免單一檔案配額耗盡或錯誤導致整批中斷
          continue; 
        }

        setCloudFiles(prev => prev.map(f => {
          if (f.id === fileRecord.id) {
            return { 
              ...f, 
              is_calibrated: true,
              equipment_name: currentDetectedLabel,
              equipment_tags: [currentDetectedLabel] 
            }; 
          }
          return f;
        }));

        await new Promise(r => setTimeout(r, 100));
        if (i < totalCount - 1) await new Promise(r => setTimeout(r, 6000));
      }

      // V9.7: 增加寫入緩衝時間
      console.log('[校準完成] 正在等待資料庫同步...');
      await new Promise(r => setTimeout(r, 2000));
      await fetchCloudFiles();
      alert('AI 標籤校準任務已完成！');
    } catch (err: any) {
      console.error('校準出錯:', err);
      alert('校準過程出錯: ' + err.message);
    } finally {
      setIsReparsing(false);
      setReparseProgress(0);
      setReparseTotal(0);
      setReparseIndex(0);
      setReparseCurrentFile('');
    }
  };

  const handleReparseAll = async () => {
    if (!supabase) {
      alert('資料庫尚未就緒，請檢查連線後再試。');
      return;
    }
    const targets = cloudFiles.filter(f => !f.is_parsed);
    
    if (targets.length === 0) {
      alert('所有檔案都已經解析完成，無須補解析。');
      return;
    }

    if (!confirm(`偵測到 ${targets.length} 筆檔案尚未解析或無條目紀錄，確定要一鍵自動補解析嗎？\n(解析過程將消耗 AI 配額，請勿關閉視窗)`)) return;

    setIsReparsing(true);
    setReparseProgress(0);
    setReparseTotal(targets.length);
    setReparseIndex(0);
    const userApiKey = localStorage.getItem('tuc_gemini_key') || '';

    try {
      const totalCount = targets.length;
      for (let i = 0; i < totalCount; i++) {
        const fileRecord = targets[i];
        setReparseIndex(i + 1);
        setReparseProgress(Math.round(((i + 1) / totalCount) * 100)); // 前置計算百分比
        setReparseCurrentFile(fileRecord.original_name);
        
        try {
          // 1. 下載雲端檔案
          const response = await fetch(fileRecord.public_url);
          const blob = await response.blob();
          const fileObj = new File([blob], fileRecord.original_name, { type: blob.type });

          // 2. 驅動 AI 解析引擎
          const parseResult = await KP.processFileToKnowledge(fileObj, userApiKey, fileRecord.equipment_name, fileRecord.id);
          const newAdded = parseResult?.added || 0;
          const currentDetectedLabel = parseResult?.detectedEquipment || fileRecord.equipment_name;
          
          // V12: 補解析時同步進行「標籤校準」
          const newDisplayName = `${fileRecord.original_name} (${currentDetectedLabel})`;
          const updateData: any = { 
            is_parsed: true, 
            is_calibrated: true, // 同步進行校準
            parsed_at: new Date().toISOString(),
            equipment_name: currentDetectedLabel,
            equipment_tags: [currentDetectedLabel],
            display_name: newDisplayName
          };

          const { error: updateError } = await supabase.from('tuc_uploaded_files')
            .update(updateData)
            .eq('id', fileRecord.id);

          if (updateError) {
            console.error('更新解析與校準狀態失敗:', updateError);
            throw new Error(`無法將檔案標記為已解析/校準。(${updateError.message})`);
          }

          // 同步更新知識庫內的 metadata (標籤校準核心)
          if (currentDetectedLabel !== fileRecord.equipment_name) {
            const { data: entries } = await supabase
              .from('tuc_history_knowledge')
              .select('id, metadata')
              .eq('source_file_name', fileRecord.original_name);
            
            if (entries) {
              for (const entry of entries) {
                const newMetadata = { ...entry.metadata, equipment_name: currentDetectedLabel };
                await supabase.from('tuc_history_knowledge').update({ metadata: newMetadata }).eq('id', entry.id);
              }
            }
          }

          // V8.6: 精準刷新列表狀態 (純本地使用 ID)
          setCloudFiles(prev => prev.map(f => {
            if (f.id === fileRecord.id) {
              return { 
                ...f, 
                knowledgeCount: ((f as any).knowledgeCount || 0) + newAdded, 
                is_parsed: true,
                is_calibrated: true,
                equipment_name: currentDetectedLabel,
                equipment_tags: [currentDetectedLabel]
              };
            }
            return f;
          }));

          // 渲染緩衝
          await new Promise(r => setTimeout(r, 100));
        } catch (fileErr: any) {
          console.error(`[Batch] 檔案 ${fileRecord.original_name} 解析/校準失敗:`, fileErr);
          // V13.7: 改為 continue，避免單一檔案配額耗盡或格式錯誤導致整批中斷
          continue; 
        }

        // 為了避免頻控，間隔 6 秒
        if (i < totalCount - 1) await new Promise(r => setTimeout(r, 6000));
      }

      await new Promise(r => setTimeout(r, 1000));
      await fetchCloudFiles(); 
      alert('批次補解析與 AI 標籤校準任務已完成！');
    } catch (err: any) {
      alert('批次處理出錯: ' + err.message);
    } finally {
      setIsReparsing(false);
      setReparseProgress(0);
      setReparseTotal(0);
      setReparseIndex(0);
      setReparseCurrentFile('');
    }
  };
  const handleExportAll = (format: 'csv') => {
    const list = cloudFiles;
    const content = "ID,原檔名,設備名稱,申請人,日期\n" + list.map(f => `"${f.id}","${f.original_name}","${f.equipment_name}","${f.requester}","${new Date(f.created_at).toLocaleString()}"`).join("\n");
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cloud_Files_Export_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteApiKey = () => {
    if (confirm('確定要刪除 API Key 嗎？')) {
      setTempKey('');
      setApiKey('');
      localStorage.removeItem('tuc_gemini_key');
    }
  };

  const filteredFiles = cloudFiles.filter(f => 
    (f.display_name || '').includes(searchQuery) ||
    (f.equipment_name || '').includes(searchQuery) ||
    (f.requester || '').includes(searchQuery)
  );

  return (
    <div className="app-container" style={{ padding: isMobile ? '0.5rem' : '1rem', maxWidth: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.5rem' : '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontWeight: '900',
            color: 'var(--tuc-red)',
            fontSize: isMobile ? '1.2rem' : '1.5rem',
            lineHeight: 1
          }}>
            TUC
          </div>
          <div>
            {!isMobile && <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {t('systemSubtitle', data.language)} v6.1
            </p>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* V16: 語系選擇器 */}
          <div className="lang-selector-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', borderRadius: '6px', padding: '2px 8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#888', marginRight: '6px' }}>{t('languageLabel', data.language)}</span>
            <select 
              value={data.language} 
              onChange={(e) => setData({ ...data, language: e.target.value as Language })}
              className="lang-select"
            >
              <option value="zh-TW">🇹🇼 繁體中文</option>
              <option value="zh-CN">🇨🇳 简体中文</option>
              <option value="en-US">🇺🇸 English</option>
              <option value="th-TH">🇹🇭 ภาษาไทย</option>
            </select>
          </div>

          {!isMobile && (
            <button 
              onClick={() => setShowPreview(!showPreview)} 
              className="icon-btn" 
              style={{ 
                padding: '0.5rem 1rem', 
                background: showPreview ? 'rgba(255,255,255,0.05)' : 'var(--tuc-red)',
                borderColor: showPreview ? '#333' : 'var(--tuc-red)',
                color: 'white'
              }}
            >
               {showPreview ? <span className="header-btn-text">{t('hidePreview', data.language)}</span> : <span className="header-btn-text">{t('showPreview', data.language)}</span>}
            </button>
          )}

          <button onClick={() => setShowConfig(true)} className="icon-btn">
            <Settings size={isMobile ? 18 : 20} />
          </button>
        </div>
      </header>

      <main className="main-grid" style={{ 
        gridTemplateColumns: isMobile ? '100%' : (showPreview ? `${splitPercentage}% 6px 1fr` : '1fr 0px 0px'), 
        gap: 0,
        flex: 1, 
        overflow: 'hidden',
        paddingBottom: isMobile ? '70px' : '0'
      }}>
        {(!isMobile || mobileAppTab === 'edit') && (
          <div style={{ minWidth: 0, height: '100%', overflow: 'hidden' }}>
            <SpecForm data={data} onChange={setData} />
          </div>
        )}

        {!isMobile && showPreview && (
          <div 
            className={`layout-resizer ${isResizing ? 'active' : ''}`} 
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {(!isMobile || mobileAppTab === 'preview') && (
          <div style={{ 
            minWidth: 0,
            height: '100%',
            opacity: (!isMobile && !showPreview) ? 0 : 1, 
            pointerEvents: (!isMobile && !showPreview) ? 'none' : 'auto',
            transition: (isResizing || isMobile) ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'auto',
            background: isMobile ? 'white' : 'transparent',
            position: 'relative'
          }}>
            {/* V7.0: 資料庫管理入口遷移至此 */}
            {!isMobile && showPreview && (
              <div style={{ position: 'sticky', top: 0, right: 0, zIndex: 10, padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={16} /> {t('officialPreview', data.language)}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setShowUploadWizard(true)} 
                    className="icon-btn" 
                    title={t('wizardTitle', data.language)}
                    style={{ color: '#60A5FA', border: '1px solid rgba(96,165,250,0.3)', padding: '4px 8px' }}
                  >
                    <CloudUpload size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>{t('import', data.language)}</span>
                  </button>
                  <button 
                    onClick={handleOpenInspector} 
                    className="icon-btn" 
                    title={t('history', data.language)}
                    style={{ color: 'var(--tuc-red)', border: '1px solid rgba(230,0,18,0.3)', padding: '4px 8px' }}
                  >
                    <Database size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>{t('history', data.language)}</span>
                  </button>
                </div>
              </div>
            )}
            <SpecPreview data={data} />
          </div>
        )}
      </main>

      {isMobile && (
        <nav className="bottom-nav">
          <button 
            className={`nav-tab ${mobileAppTab === 'edit' ? 'active' : ''}`}
            onClick={() => setMobileAppTab('edit')}
          >
            <PenTool size={22} />
            {t('editTab', data.language)}
          </button>
          <button 
            className={`nav-tab ${mobileAppTab === 'preview' ? 'active' : ''}`}
            onClick={() => setMobileAppTab('preview')}
          >
            <BookOpen size={22} />
            {t('previewTab', data.language)}
          </button>
        </nav>
      )}

      {showConfig && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={24} color="var(--tuc-red)" /> {t('settings', data.language)}
              </h2>
              <button onClick={() => setShowConfig(false)} className="icon-btn">
                <X size={24} />
              </button>
            </div>
            
            <div className="input-with-label">
              <label>{t('apiKeyLabel', data.language)}</label>
              <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  value={(!showApiKey && tempKey) ? tempKey.substring(0, 8) + "****************" : tempKey} 
                  onChange={(e) => {
                    const val = e.target.value;
                    // 如果目前是遮蔽狀態且有變動，則視為重新輸入
                    if (!showApiKey && val.includes('*')) return;
                    setTempKey(val);
                  }}
                  placeholder={t('apiKeyPlaceholder', data.language)}
                  style={{ 
                    flex: 1,
                    borderColor: (tempKey && (!tempKey.startsWith('AIza') || tempKey.length < 30)) ? '#EF4444' : 'var(--border-color)'
                  }}
                />
                <button 
                  onClick={() => setShowApiKey(!showApiKey)} 
                  className="icon-btn" 
                  style={{ padding: '0 8px' }}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />} 
                </button>
                <button 
                  onClick={handleDeleteApiKey} 
                  className="icon-btn" 
                  style={{ padding: '0 8px', color: '#EF4444' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <button className="primary-button" onClick={handleSaveConfig} style={{ width: '100%', padding: '0.8rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <Save size={18} /> {t('save', data.language)}
            </button>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '350px', textAlign: 'center' }}>
            <Lock size={40} color="var(--tuc-red)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 1rem', color: 'white' }}>{isChangePasswordMode ? t('changeAdminPwd', data.language) : t('adminAuth', data.language)}</h3>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1.5rem' }}>
              {isChangePasswordMode ? t('newPwdHint', data.language) : t('enterPwdHint', data.language)}
            </p>
            
            {isChangePasswordMode ? (
              <>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                  placeholder={t('newPwdPlaceholder', data.language)}
                  autoFocus
                  style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'center', borderColor: passwordError ? '#EF4444' : 'var(--border-color)' }}
                />
                {passwordError && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginBottom: '1rem' }}>{passwordError}</p>}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="ghost-button" onClick={() => { setIsChangePasswordMode(false); setPasswordError(''); }} style={{ flex: 1 }}>{t('cancel', data.language)}</button>
                  <button className="primary-button" onClick={handleChangePassword} style={{ flex: 2 }}>{t('saveNewPwd', data.language)}</button>
                </div>
              </>
            ) : (
              <>
                <input 
                  type="password" 
                  value={inputPassword} 
                  onChange={(e) => setInputPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  placeholder={t('pwdPlaceholder', data.language)}
                  autoFocus
                  style={{ width: '100%', marginBottom: '1rem', textAlign: 'center' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button className="ghost-button" onClick={() => setShowPasswordPrompt(false)} style={{ flex: 1 }}>{t('cancel', data.language)}</button>
                  <button className="primary-button" onClick={handleVerifyPassword} style={{ flex: 2 }}>{t('confirm', data.language)}</button>
                </div>
                <button 
                  onClick={() => setIsChangePasswordMode(true)} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#666', 
                    fontSize: '0.75rem', 
                    textDecoration: 'underline', 
                    cursor: 'pointer' 
                  }}
                >
                  {t('changePassword', data.language)}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showCloudInspector && (
        <div className="modal-overlay" style={{ zIndex: 1200, display: isReparseMinimized ? 'none' : 'flex' }}>
          <div className="glass-panel modal-content" style={{ padding: '2rem', width: '90vw', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={24} color="var(--tuc-red)" /> {t('cloudInspector', data.language)}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedFileIds.length > 0 && (
                  <button 
                    className="primary-button" 
                    onClick={handleBatchDeleteFiles}
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '6px 12px', 
                      background: '#EF4444', 
                      borderColor: '#EF4444',
                      marginRight: '0.5rem'
                    }}
                  >
                    <Trash2 size={14} /> {t('batchDelete', data.language)} ({selectedFileIds.length})
                  </button>
                )}
                <button className="ghost-button" onClick={() => handleExportAll('csv')} style={{ fontSize: '0.8rem' }}>
                  <Download size={16} /> {t('exportCsv', data.language)}
                </button>

                <button 
                  className="ghost-button" 
                  onClick={handleCleanupDuplicates} 
                  style={{ fontSize: '0.8rem', color: '#FBBF24', borderColor: 'rgba(251,191,36,0.3)' }}
                >
                  <Sparkles size={16} /> <span className="header-btn-text">{t('cleanup', data.language)}</span>
                </button>
                <button 
                  className="ghost-button" 
                  onClick={handleReparseAll} 
                  disabled={isReparsing}
                  style={{ 
                    fontSize: '0.8rem', 
                    color: '#60A5FA', 
                    borderColor: 'rgba(96,165,250,0.3)',
                    opacity: isReparsing ? 0.5 : 1
                  }}
                >
                  <Zap size={16} /> <span className="header-btn-text">{t('reparseAll', data.language)}</span>
                </button>
                <button 
                  className="ghost-button" 
                  onClick={handleAutofixLabels} 
                  disabled={isReparsing}
                  style={{ 
                    fontSize: '0.8rem', 
                    color: '#10B981', 
                    borderColor: 'rgba(16,185,129,0.3)',
                    opacity: isReparsing ? 0.5 : 1
                  }}
                >
                  {isReparsing ? <Loader2 size={16} className="spin" /> : <ShieldAlert size={16} />} 
                  <span className="header-btn-text">{t('labelFix', data.language)}</span>
                </button>
                <button onClick={() => setIsReparseMinimized(true)} className="icon-btn" title={t('minimizeToBg', data.language)}>
                  <Minimize2 size={20} />
                </button>
                <button onClick={() => setShowCloudInspector(false)} className="icon-btn">
                  <X size={24} />
                </button>
              </div>
            </div>

            {isReparsing && (
              <div style={{ 
                background: 'rgba(96,165,250,0.05)', 
                border: '1px solid rgba(96,165,250,0.2)', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={14} className="spin" /> {t('processing', data.language)}: <b>{reparseCurrentFile}</b>
                  </span>
                  <span style={{ color: '#888' }}>
                    {t('progress', data.language)}: <b style={{ color: '#60A5FA' }}>{reparseIndex} / {reparseTotal}</b> ({reparseProgress}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${reparseProgress}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #3B82F6, #60A5FA)', 
                    transition: 'width 0.5s ease-out',
                    boxShadow: '0 0 10px rgba(96, 165, 250, 0.5)'
                  }} />
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 10 }}>
                  <tr style={{ color: '#888', fontSize: '0.9rem' }}>
                    <th style={{ textAlign: 'center', padding: '12px', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredFiles.length > 0 && selectedFileIds.length === filteredFiles.length}
                        onChange={(e) => handleSelectAllFiles(e.target.checked)}
                      />
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', width: '60px' }}>{t('num', data.language)}</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>{t('displayName', data.language)}</th>
                    <th style={{ textAlign: 'left', padding: '12px', width: '120px' }}>{t('status', data.language)}</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>{t('uploader', data.language)}</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>{t('date', data.language)}</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>{t('actions', data.language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#555' }}>{t('noFiles', data.language)}</td></tr>
                  ) : filteredFiles.map((f, idx) => (
                    <tr 
                      key={f.id} 
                      style={{ 
                        borderTop: '1px solid rgba(255,255,255,0.05)', 
                        transition: 'background 0.2s',
                        background: selectedFileIds.includes(f.id) ? 'rgba(230,0,18,0.05)' : 'transparent',
                        cursor: 'pointer'
                      }} 
                      className="hover-row"
                      onClick={() => handleToggleSelectFile(f.id)}
                    >
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedFileIds.includes(f.id)}
                          onChange={() => handleToggleSelectFile(f.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: '12px', color: '#888' }}>{idx + 1}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>{f.display_name}</div>
                        <div 
                          style={{ 
                            marginTop: '6px',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            background: editingFileId === f.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                            border: editingFileId === f.id ? '1px solid rgba(230,0,18,0.3)' : '1px solid transparent',
                            minHeight: '24px',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            if (editingFileId !== f.id) {
                              setEditingFileId(f.id);
                              setTempTags((f.equipment_tags && f.equipment_tags.length > 0) ? f.equipment_tags.join(', ') : (f.equipment_name || ''));
                            }
                          }}
                          title={t('clickToEditTags', data.language)}
                        >
                          {editingFileId === f.id ? (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input 
                                autoFocus
                                className="glass-input"
                                style={{ padding: '2px 8px', fontSize: '0.75rem', flex: 1, minWidth: '150px', background: '#000' }}
                                value={tempTags}
                                onChange={(e) => setTempTags(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateTags(f.id, tempTags);
                                  if (e.key === 'Escape') setEditingFileId(null);
                                }}
                                onClick={(e) => e.stopPropagation()} 
                              />
                              <button className="icon-btn" style={{ color: '#10B981', padding: '2px' }} onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTags(f.id, tempTags);
                              }}>
                                <Check size={14} />
                              </button>
                              <button className="icon-btn" style={{ color: '#EF4444', padding: '2px' }} onClick={(e) => {
                                e.stopPropagation();
                                setEditingFileId(null);
                              }}>
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {(f.equipment_tags && f.equipment_tags.length > 0) ? (
                                f.equipment_tags.map((tag: string, i: number) => (
                                  <span key={i} style={{ 
                                    fontSize: '0.65rem', 
                                    padding: '1px 8px', 
                                    background: 'rgba(230,0,18,0.1)', 
                                    color: 'var(--tuc-red)', 
                                    borderRadius: '4px',
                                    border: '1px solid rgba(230,0,18,0.2)',
                                    fontWeight: 'bold'
                                  }}>
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                 <span style={{ fontSize: '0.7rem', color: '#555', fontStyle: 'italic' }}>
                                   {f.equipment_name || t('newTagHint', data.language)}
                                 </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {(f.is_parsed || (f as any).knowledgeCount > 0) ? (
                          <span style={{ 
                            padding: '2px 8px', 
                            background: 'rgba(16,185,129,0.1)', 
                            color: '#10B981', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem',
                            border: '1px solid rgba(16,185,129,0.2)',
                            display: 'inline-flex',
                             alignItems: 'center',
                             gap: '4px'
                           }}>
                             <Zap size={10} /> {t('parsedCount', data.language)} {(f as any).knowledgeCount > 0 ? `(${(f as any).knowledgeCount} ${t('itemsSuffix', data.language)})` : ''}
                           </span>
                        ) : (
                          <span style={{ 
                            padding: '2px 8px', 
                            background: 'rgba(245,158,11,0.1)', 
                            color: '#F59E0B', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem',
                            border: '1px solid rgba(245,158,11,0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Loader2 size={10} className="spin" /> {t('noEntries', data.language)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#bbb' }}>{f.requester}</td>
                      <td style={{ padding: '12px', color: '#888', fontSize: '0.8rem' }}>{new Date(f.created_at).toLocaleString(data.language)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="icon-btn" onClick={() => window.open(f.public_url)} title={t('viewFull', data.language)}>
                            <Eye size={16} />
                          </button>
                          <button className="icon-btn" onClick={() => handleDeleteFile(f.id)} style={{ color: '#EF4444' }} title={t('deleteRecord', data.language)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
              {t('totalProgress', data.language)} {cloudFiles.length} {t('items', data.language)}
            </div>
          </div>
        </div>
      )}

      <UploadWizardModal 
        isOpen={showUploadWizard} 
        onClose={() => setShowUploadWizard(false)} 
        onMinimize={() => { setShowUploadWizard(false); }}
        isMinimized={isReparseMinimized}
        data={data} 
        onApplyData={setData}
        language={data.language}
      />

      {/* V9.9: 全域任務監測膠囊 (Floating Task Capsule) */}
      {isReparsing && isReparseMinimized && (
        <div 
          onClick={() => setIsReparseMinimized(false)}
          style={{ 
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2000,
            background: 'rgba(20,20,20,0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--tuc-red)',
            borderRadius: '50px',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(230,0,18,0.3)',
            animation: 'pulse 2s infinite ease-in-out'
          }}
        >
          <div className="spin" style={{ color: 'var(--tuc-red)', display: 'flex' }}>
            <Repeat size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white' }}>
              {t('processing', data.language)} {reparseProgress}%
            </div>
            <div style={{ fontSize: '0.6rem', color: '#888', whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {reparseCurrentFile}
            </div>
          </div>
          <div style={{ marginLeft: '8px', color: '#60A5FA' }}>
            <Maximize2 size={16} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
