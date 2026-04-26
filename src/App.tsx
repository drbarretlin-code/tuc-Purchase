import { useState, useEffect } from 'react';
import type { FormState } from './types/form';
import { INITIAL_FORM_STATE } from './types/form';
import SpecForm from './components/SpecForm';
import SpecPreview from './components/SpecPreview';
import { Ban, ShieldAlert, Settings, X, PenTool, BookOpen, Eye, EyeOff, Trash2, Download, Lock, Save, Database, CloudUpload, Sparkles, Zap, Loader2, Check, Minimize2, Maximize2, Repeat, Info, Clock } from 'lucide-react';
import { supabase } from './lib/supabase';
import * as KP from './lib/knowledgeParser';
import ManualModal from './components/ManualModal';
import DiagnosticModal from './components/DiagnosticModal';
import SystemDiagnosticModal from './components/SystemDiagnosticModal';
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

    // V17.8: 動態網頁標題
    document.title = t('systemTitle', data.language);
  }, [data.language]);

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('tuc_gemini_key') || '');
  const [showConfig, setShowConfig] = useState(false);
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
  const [translatedCloudFiles, setTranslatedCloudFiles] = useState<any[]>([]);
  // V18.3: 診斷數據安全解析助手
  const getSafeDiagnostic = (errorMsg: string | null): KP.DiagnosticResult | null => {
    if (!errorMsg) return null;
    try {
      if (errorMsg.startsWith('{')) {
        return JSON.parse(errorMsg);
      }
      return {
        code: 'UNKNOWN',
        message: errorMsg,
        timestamp: new Date().toISOString(),
        suggestion: '這是一個舊有的錯誤紀錄。請嘗試重新解析以獲取精確診斷。'
      };
    } catch {
      return {
        code: 'UNKNOWN',
        message: errorMsg,
        timestamp: new Date().toISOString()
      };
    }
  };
  const [showCloudInspector, setShowCloudInspector] = useState(false);
  const [isReparseMinimized, setIsReparseMinimized] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isCloudAuthed, setIsCloudAuthed] = useState(false); // V24: 不再自動記憶登入狀態，提升安全性與可測試性
  const [inputPassword, setInputPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('tuc_admin_password') || '000000');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isChangePasswordMode, setIsChangePasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showSystemDiagnostic, setShowSystemDiagnostic] = useState(false);
  const [systemHealthData, setSystemHealthData] = useState<any>(null);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [isFixingSystem, setIsFixingSystem] = useState(false);
  const [searchQuery] = useState('');
  const [queueFilterTab, setQueueFilterTab] = useState<'all' | 'parsed' | 'pending' | 'processing' | 'failed' | 'unparsed'>('all');

  // V10.3: 批次刪除狀態
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [diagnosticTarget, setDiagnosticTarget] = useState<any | null>(null);

  // V17.6: 操作說明書狀態
  const [showManual, setShowManual] = useState(false);

  // V9.0: 行內標籤編輯狀態
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [tempTags, setTempTags] = useState<string>('');

  // V17.8: 資源水位預警狀態
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const [usageStats, setUsageStats] = useState({ qstash_calls_today: 0, estimated_egress_bytes: 0 });
  const [currentAIModel, setCurrentAIModel] = useState<string>('偵測中...');
  const [healthTab, setHealthTab] = useState<'current' | 'paid'>('current');
  const [largeFileSizeLimit, setLargeFileSizeLimit] = useState<string>('10'); // 預設 10MB
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [largeFilesFound, setLargeFilesFound] = useState<any[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  // V18.6: 雲端查閱器垂直調整器狀態 (V19.2: 預設調降高度以增加下方列表能見度)
  const [inspectorDashboardHeight, setInspectorDashboardHeight] = useState(420);
  const [isInspectorResizing, setIsInspectorResizing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isMobile) return;
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
  }, [isResizing, isMobile]);

  // V18.6: 雲端查閱器垂直調整邏輯
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isInspectorResizing) return;
      // 計算相對於 modal-content 的 Y 軸偏移
      const modalContent = document.querySelector('.modal-content.inspector-modal');
      if (modalContent) {
        const rect = modalContent.getBoundingClientRect();
        const newHeight = e.clientY - rect.top - 60; // 扣除 Header 高度
        if (newHeight > 120 && newHeight < rect.height - 300) {
          setInspectorDashboardHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsInspectorResizing(false);
      document.body.classList.remove('unselectable-v');
    };

    if (isInspectorResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('unselectable-v');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isInspectorResizing]);

  // 自動刷新：當雲端查閱器開啟且有佇列任務時，每 15 秒自動更新狀態
  useEffect(() => {
    if (!showCloudInspector) return;
    const hasActiveJobs = cloudFiles.some(f =>
      (f as any).parse_status === 'pending' || (f as any).parse_status === 'processing' || ((f as any).parse_status && (f as any).parse_status.startsWith('processing:'))
    );
    if (!hasActiveJobs) return;

    const timer = setInterval(() => {
      console.log('[AutoRefresh] 偵測到佇列任務，自動刷新狀態...');
      fetchCloudFiles();
    }, 60000); // V20: Egress 償符，從 15s 延長至 60s

    return () => clearInterval(timer);
  }, [showCloudInspector, cloudFiles]);

  // V18.5: 初始載入時獲取資源使用量 (確保第五章節同步按鈕狀態正確)
  useEffect(() => {
    fetchUsageStats();
  }, []);

  // V17.3: 雲端查閱器動態內容翻譯
  useEffect(() => {
    if (cloudFiles.length > 0 && data.language !== 'zh-TW' && showCloudInspector) {
      // V17.4: 只有在雲端檔案清單變動且長度減少（換頁或刪除）時才重新全量翻譯，避免解析過程中的頻繁閃爍
      // 但我們需要一個機制來獲取增量翻譯
      translateCloudInspectorItems();
    } else {
      setTranslatedCloudFiles(cloudFiles);
    }
  }, [cloudFiles, data.language, showCloudInspector]);

  const translateCloudInspectorItems = async () => {
    const apiKey = localStorage.getItem('tuc_gemini_key') || '';
    if (!apiKey) return;

    // 翻譯前 50 筆，涵蓋大部分視窗範圍
    const itemsToTranslate = cloudFiles.slice(0, 50).map(f => ({
      id: f.id,
      name: f.display_name || f.equipment_name || f.original_name,
      tags: f.equipment_tags || []
    }));

    try {
      const translated = await KP.translateCloudMetadata(itemsToTranslate, data.language, apiKey);
      const newFiles = cloudFiles.map(f => {
        const trans = translated.find(t => t.id === f.id);
        if (!trans) return f;

        // V17.4: 更新顯示名稱與標籤
        return {
          ...f,
          display_name: trans.name,
          equipment_name: trans.name.includes('(') ? trans.name.split('(')[1].replace(')', '') : trans.name,
          equipment_tags: trans.tags
        };
      });
      setTranslatedCloudFiles(newFiles);
    } catch (err) {
      console.error('[AI Translation] App metadata translation failed:', err);
    }
  };

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const resp = await fetch('/api/health');
      const data = await resp.json();
      setSystemHealthData(data);
    } catch (err) {
      alert('無法取得系統診斷數據');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleFixSystem = async () => {
    setIsFixingSystem(true);
    try {
      // 呼叫 Worker 的 process_next 模式，它會自動偵測並修復死鎖
      const resp = await fetch('/api/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_next', language: data.language })
      });
      
      if (resp.ok) {
        alert('已成功發送解鎖指令，請稍候 5-10 秒後重新整理診斷報告。');
        await handleCheckHealth();
      } else {
        throw new Error('伺服器回應異常');
      }
    } catch (err) {
      alert('發送修復指令失敗，請稍後再試。');
    } finally {
      setIsFixingSystem(false);
    }
  };

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
    // V20: 移除 fetchUsageStats 自動路由，避免 storage.list() 重複觸發消耗 Egress

    try {
      // 1. 獲取檔案清單 (優先使用 is_parsed 標籤)
      const { data: list, error: fileError } = await supabase
        .from('tuc_uploaded_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (fileError) throw fileError;

      // 2. 高效統計：透過資料庫 RPC 一次取得所有檔案的知識條目數（無分頁限制）
      const countMap: Record<string, number> = {};
      const { data: countData, error: countError } = await supabase.rpc('get_knowledge_counts');

      if (countError) {
        console.error('無法統計解析條目:', countError);
      } else if (countData) {
        countData.forEach((item: { source_file_name: string; count: number }) => {
          countMap[item.source_file_name] = item.count;
        });
      }
      console.log(`[Debug] 知識條目統計完成，涵蓋 ${Object.keys(countMap).length} 個檔案`);

      // 3. 合併資料 (V17.2: 雙重防呆 - 避免使用者未更新資料庫欄位導致進度遺失。信任資料庫或知識條目數大於 0)
      const enrichedList = (list || []).map(f => {
        const countFromStats = countMap[f.original_name] || 0;

        return {
          ...f,
          display_name: f.display_name || f.original_name, // 防呆：確保介面總是有名稱可顯示
          knowledgeCount: countFromStats,
          is_parsed: f.is_parsed === true || countFromStats > 0
        };
      });

      console.log(`[Debug] 查詢成功，找到 ${enrichedList.length} 筆紀錄。`);
      setCloudFiles(enrichedList);
      // V18.4: 確保翻譯列表在初始加載時也有數據，防止 UI 空白
      if (data.language === 'zh-TW') {
        setTranslatedCloudFiles(enrichedList);
      }
      
      // V26.10: 恢復水位計同步。在列表載入後調用輕量化統計，確保總量更新。
      fetchUsageStats();
    } catch (err: any) {
      console.error('[Debug] fetchCloudFiles 捕捉到異常:', err.message);
      alert('無法取得檔案紀錄: ' + err.message);
    }
  };

  const fetchUsageStats = async () => {
    if (!supabase) return;
    try {
      // V26.10: 極輕量統計。僅使用 head: true 獲取精確總數，避免掃描 Data。
      const { count: kCount } = await supabase
        .from('tuc_history_knowledge')
        .select('*', { count: 'exact', head: true });

      const { data: fileRecords } = await supabase
        .from('tuc_uploaded_files')
        .select('file_size')
        .not('file_size', 'is', null);

      const totalSizeBytes = (fileRecords || []).reduce((acc: number, f: any) => acc + (f.file_size || 0), 0);

      setKnowledgeCount(kCount || 0);
      setStorageSize(totalSizeBytes);

      // V26.10: 獲取系統用量統計 (QStash/Egress)
      const { data: uStats } = await supabase
        .from('tuc_usage_stats')
        .select('*')
        .eq('stat_date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (uStats) {
        setUsageStats({
          qstash_calls_today: uStats.qstash_calls_today || 0,
          estimated_egress_bytes: uStats.estimated_egress_bytes || 0
        });
      }

      // V26.11: 更新當前前端鎖定的模型名稱
      const detected = KP.getCachedModelId();
      if (detected) setCurrentAIModel(detected);
    } catch (err) {
      console.error('Fetch usage stats error:', err);
    }
  };

  const handleDeleteLargeFiles = async () => {
    if (!supabase) return;
    const limitBytes = Number(largeFileSizeLimit) * 1024 * 1024;
    setIsCleaning(true);

    try {
      const { data: files, error } = await supabase.storage.from('spec-files').list('', {
        limit: 1000
      });

      if (error) throw error;

      const filtered = (files || []).filter(f => f.metadata && f.metadata.size > limitBytes);

      if (filtered.length === 0) {
        alert('未偵測到任何大於 ' + largeFileSizeLimit + ' MB 的檔案。');
        setIsCleaning(false);
        return;
      }

      // 預設全部勾選要刪除
      setLargeFilesFound(filtered.map(f => {
        // 從目前的 cloudFiles (tuc_uploaded_files) 找到對應的展示名稱，支援多種新舊欄位與 URL 模糊配對
        const dbRecord = cloudFiles.find(cf =>
          cf.storage_path === f.name ||
          cf.file_path === f.name ||
          (cf.public_url && cf.public_url.includes(f.name)) ||
          cf.id === f.name.split('_')[0]
        );
        // 如果找不到記錄（可能為孤兒檔案），則顯示原儲存名稱並加註
        const displayName = dbRecord ? (dbRecord.original_name || dbRecord.display_name) : `${f.name} (查無原始紀錄的孤兒檔案)`;

        return {
          ...f,
          checked: true,
          originalName: displayName
        };
      }));
      setShowCleanupModal(true);
    } catch (err: any) {
      console.error('Scan large files failed:', err);
      alert('掃描失敗: ' + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const executeCleanup = async () => {
    const toDelete = largeFilesFound.filter(f => f.checked);
    if (!supabase || toDelete.length === 0) {
      alert('請至少選擇一個檔案進行清理。');
      return;
    }
    setIsCleaning(true);

    try {
      const fileNames = toDelete.map(f => f.name);

      // 1. 刪除 Storage 實體檔案
      const { error: storageError } = await supabase.storage.from('spec-files').remove(fileNames);
      if (storageError) throw storageError;

      // 2. 刪除上傳紀錄 (tuc_uploaded_files)
      const { error: uploadError } = await supabase
        .from('tuc_uploaded_files')
        .delete()
        .in('original_name', fileNames);
      if (uploadError) throw uploadError;

      // 3. 刪除知識庫條文 (tuc_history_knowledge)
      const { error: knowledgeError } = await supabase
        .from('tuc_history_knowledge')
        .delete()
        .in('source_file_name', fileNames);
      if (knowledgeError) throw knowledgeError;

      alert('清理完成！已徹底移除 ' + fileNames.length + ' 個檔案及其所有關聯紀錄。');
      setShowCleanupModal(false);
      setLargeFilesFound([]);
      fetchCloudFiles();
      fetchUsageStats();
    } catch (err: any) {
      console.error('Execute cleanup failed:', err);
      alert('執行清理時發生錯誤: ' + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOpenInspector = () => {
    setSelectedFileIds([]); // 開啟時重置選擇
    if (supabase) {
      fetchCloudFiles();
      
      // V26.11: 導入 Supabase Realtime 實現全自動即時更新
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tuc_uploaded_files' }, () => {
          console.log('[Realtime] 偵測到檔案狀態變更，即時同步...');
          fetchCloudFiles();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tuc_history_knowledge' }, () => {
          console.log('[Realtime] 偵測到知識庫變更，即時同步水位...');
          fetchUsageStats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tuc_usage_stats' }, () => {
          console.log('[Realtime] 偵測到資源用量變更，即時同步儀表板...');
          fetchUsageStats();
        })
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
    if (isCloudAuthed) {
      setShowCloudInspector(true);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handleVerifyPassword = () => {
    if (inputPassword === adminPassword) {
      setIsCloudAuthed(true);
      localStorage.setItem('tuc_cloud_authed', 'true');
      setShowPasswordPrompt(false);
      setInputPassword('');
      fetchCloudFiles(); // V20: 移除重複的 fetchUsageStats() 呼叫
      setShowCloudInspector(true);
    } else {
      alert('密碼錯誤，請重新輸入。');
      setInputPassword('');
    }
  };

  const handleLogout = () => {
    setIsCloudAuthed(false);
    localStorage.removeItem('tuc_cloud_authed');
    setShowCloudInspector(false);
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
    if (!supabase || !confirm('確定要永久刪除此上傳紀錄（包含實體檔案與解析資料）嗎？')) return;
    try {
      const targetFile = cloudFiles.find(f => f.id === id);
      if (targetFile) {
        // 1. 清除關聯的知識解析紀錄
        await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', targetFile.original_name);
        // 2. 清除 Storage 實體檔案
        await supabase.storage.from('spec-files').remove([targetFile.storage_path]);
      }

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
        alert(t('dbClean', data.language));
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

      alert(t('cleanSuccess', data.language).replace('{n}', toDelete.length.toString()));
      fetchCloudFiles();
    } catch (err: any) {
      console.error('清理失敗:', err);
      alert(`${t('cleanError', data.language)} ${err.message}`);
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
      alert(`${t('tagUpdateFail', data.language)} ${err.message}`);
    }
  };

  const handleAutofixLabels = async () => {
    if (!supabase || !confirm(t('confirmCalibrate', data.language))) return;
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

    // V16.10: 強化跳過機制 - 嚴謹判定 !== true (包含 false, undefined, null)
    // 斷點續傳機制：僅選取尚未完成校準的檔案
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
          // V20: 改用後端代理下載 (service role key，不走 CDN)，消除 Cached Egress 消耗
          const resp = await fetch(`/api/download-file?storagePath=${encodeURIComponent(fileRecord.storage_path)}`);
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
    const targets = cloudFiles.filter(f =>
      f.is_parsed !== true || (f as any).knowledgeCount === 0
    );

    if (targets.length === 0) {
      alert('所有檔案皆已完成解析，無須重複執行。');
      return;
    }

    if (!confirm(`偵測到 ${targets.length} 筆檔案需處理。系統支援「斷點續傳」，已解析檔案將自動跳過。\n\n確定要把這些檔案全數送入背景佇列解析嗎？`)) return;

    const ids = targets.map(t => t.id);
    await enqueueBatchForParsing(ids);
  };

  // 共同的送入背景佇列函數
  const enqueueBatchForParsing = async (ids: string[]) => {
    if (!supabase) return;
    setIsReparsing(true); // 僅用於按鈕 Disable 狀態
    try {
      const targets = cloudFiles.filter(f => ids.includes(f.id));
      const targetFileNames = targets.map(f => f.original_name);
      const uniqueNames = Array.from(new Set(targetFileNames));

      // 1. 強制清理舊有紀錄，確保能重新產生知識點
      await supabase.from('tuc_history_knowledge').delete().in('source_file_name', uniqueNames);

      // 2. 呼叫後端 API
      const res = await fetch('/api/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: ids,
          language: data.language
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errMsg = errorData.details || errorData.error || 'Enqueue API failed';
        if (typeof errMsg === 'string' && (errMsg.includes('QstashDailyRatelimitError') || errMsg.includes('Exceeded daily rate limit'))) {
          errMsg = '已觸及背景排程服務 (QStash) 的免費版每日佇列上限 (1000筆)。\n此非系統故障，您的配額將於隔日早上 08:00 自動刷新，屆時即可正常使用。';
        }
        throw new Error(errMsg);
      }

      alert(`已成功將 ${ids.length} 筆檔案送入後端完全託管佇列！您可以隨意關閉瀏覽器，系統會自動在背景分塊解析，並處理 API 額度等待。`);
      
      // 更新列表顯示為排隊中
      setCloudFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, parse_status: 'pending', is_parsed: false } : f));
      setSelectedFileIds([]);
    } catch (err: any) {
      console.error('[Enqueue Batch Error]', err);
      alert('送入解析佇列時發生錯誤: ' + err.message);
    } finally {
      setIsReparsing(false);
    }
  };

  const handleForceReparseFiles = async (ids: string[]) => {
    if (!supabase) return;
    const targets = cloudFiles.filter(f => ids.includes(f.id));
    if (targets.length === 0) return;

    if (!confirm(`${t('confirmReparseBatch', data.language).replace('{n}', targets.length.toString())}`)) return;
    await enqueueBatchForParsing(ids);
  };

  const handleEnqueueUnparsed = async () => {
    if (!supabase) return;
    const targets = cloudFiles.filter(f => !f.is_parsed || (f as any).parse_status === 'failed');
    if (targets.length === 0) {
      alert('沒有需要解析或過去解析失敗的檔案。');
      return;
    }
    const ids = targets.map(t => t.id);
    handleForceReparseFiles(ids);
  };

  const handleResetAndEnqueueAll = async () => {
    if (!supabase) return;
    
    // V19.6: 支援選取特定檔案重置，若無選取則維持全量重置
    const isBatchMode = selectedFileIds.length > 0;
    const targets = isBatchMode 
      ? cloudFiles.filter(f => selectedFileIds.includes(f.id))
      : cloudFiles;
    
    const targetFileIds = targets.map(f => f.id);
    const targetFileNames = targets.map(f => f.original_name);

    const confirmMsg = isBatchMode 
      ? `確定要「清空已解析條目」並重置選取的 ${selectedFileIds.length} 筆檔案嗎？\n系統將重新送進背景佇列進行解析。`
      : t('confirmResetAndReparse', data.language);

    if (!confirm(confirmMsg)) return;

    setIsResetting(true);
    try {
      // 1. 清空知識條目 (tuc_history_knowledge)
      if (isBatchMode) {
        // 批次模式：針對特定檔名刪除 (使用 Set 避免重複)
        const uniqueNames = Array.from(new Set(targetFileNames));
        const { error: clearError } = await supabase
          .from('tuc_history_knowledge')
          .delete()
          .in('source_file_name', uniqueNames);
        if (clearError) throw clearError;
      } else {
        // 全量模式
        const { error: clearError } = await supabase
          .from('tuc_history_knowledge')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (clearError) throw clearError;
      }

      // 2. 重置檔案狀態 (tuc_uploaded_files)
      const updateData = {
        is_parsed: false,
        is_calibrated: false,
        parse_status: 'pending',
        parsed_at: null,
        error_message: null
      } as any;

      if (isBatchMode) {
        const { error: resetError } = await supabase
          .from('tuc_uploaded_files')
          .update(updateData)
          .in('id', targetFileIds);
        if (resetError) throw resetError;
      } else {
        const { error: resetError } = await supabase
          .from('tuc_uploaded_files')
          .update(updateData)
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (resetError) throw resetError;
      }

      // 3. 送入佇列
      if (targetFileIds.length > 0) {
        const res = await fetch('/api/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fileIds: targetFileIds,
            language: data.language 
          })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          let errMsg = errorData.details || errorData.error || 'Enqueue API failed';
          if (typeof errMsg === 'string' && (errMsg.includes('QstashDailyRatelimitError') || errMsg.includes('Exceeded daily rate limit'))) {
            errMsg = '已觸及背景排程服務 (QStash) 的免費版每日佇列上限 (1000筆)。\n此非系統故障，您的配額將於隔日早上 08:00 自動刷新，屆時即可正常使用。';
          }
          throw new Error(errMsg);
        }
      }

      alert(t('resetSuccess', data.language));
      fetchCloudFiles();
      if (isBatchMode) setSelectedFileIds([]);
    } catch (err: any) {
      console.error('[ResetAndEnqueue] Failed:', err);
      alert('操作失敗: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAbortParsing = async () => {
    if (!supabase) return;
    
    // 找出正在進行中的檔案
    const targets = cloudFiles.filter(f => (f as any).parse_status === 'pending' || (f as any).parse_status === 'processing' || ((f as any).parse_status && (f as any).parse_status.startsWith('processing:')));
    if (targets.length === 0) {
      alert('目前沒有正在排隊中或進行中的解析任務。');
      return;
    }

    if (!confirm(`確定要強行中斷目前所有的 ${targets.length} 筆背景處理任務嗎？\n此操作將會發信號阻止排隊系統繼續運作，已進行到一半的檔案也會被放棄。`)) return;

    try {
      const targetIds = targets.map(f => f.id);
      
      const { error } = await supabase
        .from('tuc_uploaded_files')
        .update({
          parse_status: 'failed',
          error_message: '使用者已手動終止，以節省 API 資源與配額。'
        } as any)
        .in('id', targetIds);

      if (error) throw error;
      
      alert('✅ 中斷信號送出成功！背景工作管線在讀取到此狀態後會自動煞車。');
      fetchCloudFiles();
    } catch (err: any) {
      console.error('[Abort Error]', err);
      alert('發生錯誤: ' + err.message);
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


   // 互斥分類函式：每個檔案只歸屬一個類別，優先順序 parsed > failed > processing > pending
  const getFileCategory = (f: any): 'failed' | 'processing' | 'pending' | 'parsed' | 'unparsed' => {
    // V18.7: 強化分類邏輯 - 必須同時具備解析標記且知識條目 > 0 才視為成功
    if (f.is_parsed && (f.knowledgeCount > 0)) return 'parsed';
    
    // 其次檢查狀態
    if (f.parse_status === 'failed') return 'failed';
    if (f.parse_status === 'processing' || (f.parse_status && f.parse_status.startsWith('processing:'))) return 'processing';
    if (f.parse_status === 'pending') return 'pending';
    
    // 若標記為已解析但條目為 0，視為待處理(幽靈狀態)
    if (f.is_parsed && f.knowledgeCount === 0) return 'pending';
    
    return 'unparsed';
  };

  const filteredFiles = (data.language === 'zh-TW' ? cloudFiles : translatedCloudFiles).filter(f => {
    // V17.9: 修正搜尋邏輯，同時支援原始檔名與翻譯檔名
    const nameToSearch = f.display_name || f.original_name || '';
    const matchesSearch = nameToSearch.includes(searchQuery) ||
      (f.equipment_name || '').includes(searchQuery) ||
      (f.requester || '').includes(searchQuery);
    if (!matchesSearch) return false;

    if (queueFilterTab === 'all') return true;
    return getFileCategory(f) === queueFilterTab;
  });

  return (
    <div className="app-container" style={{ padding: isMobile ? '0.5rem' : '1rem', maxWidth: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.5rem' : '1rem', flexShrink: 0 }}>
        <div role="banner" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
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

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* V16: 語系選擇器 */}
          <div className="lang-selector-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', borderRadius: '6px', padding: '2px 8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#888', marginRight: '6px' }}>{t('languageLabel', data.language)}</span>
            <select
              value={data.language}
              onChange={(e) => setData({ ...data, language: e.target.value as Language })}
              className="lang-select"
              aria-label="Select Language"
            >
              <option value="zh-TW">🇹🇼 繁體中文</option>
              <option value="zh-CN">🇨🇳 简体中文</option>
              <option value="en-US">🇺🇸 English</option>
              <option value="th-TH">🇹🇭 ภาษาไทย</option>
            </select>
          </div>



          <button
            onClick={() => setShowManual(true)}
            className="icon-btn manual-btn"
            aria-label="Open User Manual"
            style={{
              background: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
              color: 'white',
              border: 'none',
              padding: isMobile ? '6px 10px' : '8px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <BookOpen size={isMobile ? 18 : 20} />
            {!isMobile && <span>{t('userManual', data.language)}</span>}
          </button>

          <button
            onClick={() => setShowConfig(true)}
            className="icon-btn"
            aria-label="Open Settings"
          >
            <Settings size={isMobile ? 18 : 20} />
          </button>
        </nav>
      </header>

      <main className="main-grid" style={{
        gridTemplateColumns: isMobile ? '100%' : `${splitPercentage}% 6px 1fr`,
        gridTemplateRows: '100%',
        gap: 0,
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        paddingBottom: isMobile ? '70px' : '0'
      }}>
        {(!isMobile || mobileAppTab === 'edit') && (
          <div style={{ minWidth: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {(() => {
              const isSyncBlocked = knowledgeCount > 99800 || storageSize > (0.97 * 1024 * 1024 * 1024);
              return <SpecForm data={data} onChange={setData} isSyncBlocked={isSyncBlocked} />;
            })()}
          </div>
        )}

        {!isMobile && (
          <div
            className={`layout-resizer ${isResizing ? 'active' : ''}`}
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {(!isMobile || mobileAppTab === 'preview') && (
          <div style={{
            minWidth: 0,
            minHeight: 0,
            height: '100%',
            transition: (isResizing || isMobile) ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'auto',
            background: isMobile ? 'white' : 'transparent',
            position: 'relative'
          }}>
            {/* V7.0: 資料庫管理入口遷移至此 */}
            {!isMobile && (
              <div style={{ position: 'sticky', top: 0, right: 0, zIndex: 10, padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
            className="nav-tab"
            onClick={() => setShowUploadWizard(true)}
            style={{ color: '#60A5FA' }}
          >
            <CloudUpload size={22} />
            {t('import', data.language)}
          </button>
          <button
            className="nav-tab"
            onClick={handleOpenInspector}
            style={{ color: 'var(--tuc-red)' }}
          >
            <Database size={22} />
            {t('history', data.language)}
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
          <div className="glass-panel modal-content inspector-modal" style={{ padding: '1.5rem', width: '95vw', maxWidth: '1300px', height: '92vh', maxHeight: '98vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={24} color="var(--tuc-red)" /> {t('cloudInspector', data.language)}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedFileIds.length > 0 && (
                  <>
                    <button
                      className="primary-button"
                      onClick={() => handleForceReparseFiles(selectedFileIds)}
                      disabled={isReparsing}
                      style={{
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        background: '#60A5FA',
                        borderColor: '#60A5FA',
                        opacity: isReparsing ? 0.5 : 1
                      }}
                    >
                      <Repeat size={14} /> {t('batchReparse', data.language)} ({selectedFileIds.length})
                    </button>
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
                  </>
                )}
                {selectedFileIds.length === 0 && (
                  <button
                    className="primary-button"
                    onClick={handleEnqueueUnparsed}
                    disabled={isReparsing}
                    style={{
                      fontSize: '0.8rem',
                      padding: '6px 12px',
                      background: '#10B981',
                      borderColor: '#10B981',
                      marginRight: '0.5rem',
                      opacity: isReparsing ? 0.5 : 1
                    }}
                  >
                    <Sparkles size={14} /> {t('enqueueUnparsed', data.language)}
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
                <button
                  className="ghost-button"
                  onClick={() => {
                    setShowSystemDiagnostic(true);
                    handleCheckHealth();
                  }}
                  disabled={isCheckingHealth}
                  style={{
                    fontSize: '0.8rem',
                    color: '#A78BFA',
                    borderColor: 'rgba(167,139,250,0.3)',
                  }}
                >
                  {isCheckingHealth ? <Loader2 size={16} className="spin" /> : <Info size={16} />}
                  <span className="header-btn-text">系統診斷</span>
                </button>
                <button onClick={() => setIsReparseMinimized(true)} className="icon-btn" title={t('minimizeToBg', data.language)}>
                  <Minimize2 size={20} />
                </button>
                <button onClick={handleLogout} className="icon-btn" title="登出並鎖定" style={{ color: '#EF4444' }}>
                  <Lock size={20} />
                </button>
                <button onClick={() => setShowCloudInspector(false)} className="icon-btn">
                  <X size={24} />
                </button>
              </div>
            </div>
            {/* 系統中控面板區域 (V19.3) */}
            <div style={{ height: inspectorDashboardHeight, minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0, overflow: 'auto' }}>


              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', flexShrink: 0 }}>
                {/* V17.8: 資源水位預警面板 */}
                {(() => {
                  const knowledgeLimit = 100000; // 10萬條設為警戒線 (約佔 100MB+)
                  const storageLimitBytes = 1 * 1024 * 1024 * 1024;    // 1 GB
                  const kUsage = Math.min(Math.round((knowledgeCount / knowledgeLimit) * 100), 100);
                  const sUsage = Math.min(Math.round((storageSize / storageLimitBytes) * 100), 100);
                  const isHighUsage = kUsage > 80 || sUsage > 80;

                  return (
                    <div style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: `1px solid ${isHighUsage ? '#EF4444' : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      position: 'relative'
                    }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert size={16} color={isHighUsage ? '#EF4444' : '#60A5FA'} />
                        {t('resourceUsage', data.language)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px 6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <span style={{ fontSize: '0.7rem', color: '#888', marginRight: '6px' }}>{t('sizeLimitLabel', data.language)}</span>
                          <input
                            type="number"
                            value={largeFileSizeLimit}
                            onChange={(e) => setLargeFileSizeLimit(e.target.value)}
                            style={{
                              width: '45px',
                              background: 'rgba(0,0,0,0.5)',
                              border: '1px solid rgba(96,165,250,0.5)',
                              borderRadius: '4px',
                              color: '#fff',
                              fontSize: '0.75rem',
                              textAlign: 'center',
                              outline: 'none',
                              padding: '2px'
                            }}
                            title="可手動輸入要刪除的容量設定"
                          />
                          <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: '6px' }}>MB</span>
                        </div>
                        <button
                          onClick={handleDeleteLargeFiles}
                          disabled={isCleaning}
                          style={{
                            padding: '4px 8px',
                            background: '#EF4444',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={t('cleanupLargeFiles', data.language)}
                        >
                          {isCleaning ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                          {t('cleanupLargeFiles', data.language)}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      {/* 知識庫條目 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                          <span style={{ color: '#aaa' }}>{t('knowledgeEntries', data.language)}</span>
                          <span style={{ color: kUsage > 80 ? '#EF4444' : '#fff' }}>{knowledgeCount.toLocaleString()} / {knowledgeLimit.toLocaleString()} {data.language === 'en-US' ? 'items' : '筆'}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${kUsage}%`,
                            height: '100%',
                            background: kUsage > 80 ? '#EF4444' : '#60A5FA',
                            transition: 'width 0.5s ease-out'
                          }} />
                        </div>
                      </div>

                      {/* 檔案數量與容量 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                          <span style={{ color: '#aaa' }}>{t('storageFiles', data.language)}</span>
                          <span style={{ color: sUsage > 80 ? '#EF4444' : '#fff' }}>
                            {(storageSize / 1024 / 1024 / 1024).toFixed(3)} GB / 1 GB
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${sUsage}%`,
                            height: '100%',
                            background: sUsage > 80 ? '#EF4444' : '#10B981',
                            transition: 'width 0.5s ease-out'
                          }} />
                        </div>
                      </div>
                    </div>

                    {isHighUsage && (
                      <div style={{
                        marginTop: '4px',
                        padding: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#EF4444',
                        borderLeft: '3px solid #EF4444'
                      }}>
                        {t('warningHighUsage', data.language)}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* V26.10: 雲端資源健康監測儀表板 (Resource Health Dashboard) */}
              {(() => {
                const qstashLimit = 1000; // V26.11: 根據使用者回饋校準為 1000
                const egressLimitGB = 5;
                const egressBytesLimit = egressLimitGB * 1024 * 1024 * 1024;
                
                const qUsage = Math.min(Math.round((usageStats.qstash_calls_today / qstashLimit) * 100), 100);
                const eUsage = Math.min(Math.round((usageStats.estimated_egress_bytes / egressBytesLimit) * 100), 100);
                
                // 判定付費/免費屬性
                const isPaidTier = usageStats.qstash_calls_today > 500; 
                
                return (
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${qUsage > 90 || eUsage > 90 ? '#F59E0B' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => setHealthTab('current')}
                          style={{ 
                            fontSize: '0.75rem', 
                            background: healthTab === 'current' ? 'rgba(16,185,129,0.2)' : 'transparent',
                            color: healthTab === 'current' ? '#10B981' : '#888',
                            border: 'none',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: healthTab === 'current' ? 'bold' : 'normal'
                          }}
                        >
                          當前狀態
                        </button>
                        <button 
                          onClick={() => setHealthTab('paid')}
                          style={{ 
                            fontSize: '0.75rem', 
                            background: healthTab === 'paid' ? 'rgba(59,130,246,0.2)' : 'transparent',
                            color: healthTab === 'paid' ? '#3B82F6' : '#888',
                            border: 'none',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: healthTab === 'paid' ? 'bold' : 'normal'
                          }}
                        >
                          付費額度模式
                        </button>
                      </div>
                      <span style={{ 
                        fontSize: '0.6rem', 
                        padding: '1px 6px', 
                        borderRadius: '4px', 
                        background: isPaidTier ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                        color: isPaidTier ? '#10B981' : '#666',
                        border: `1px solid ${isPaidTier ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`
                      }}>
                        {isPaidTier ? '已解鎖 Pro' : 'Free Tier'}
                      </span>
                    </div>
                    
                    {healthTab === 'current' ? (
                      <>
                        {/* QStash 水位計 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: '#aaa' }}>QStash 今日用量</span>
                            <span style={{ color: qUsage > 80 ? '#F59E0B' : '#fff' }}>
                              {usageStats.qstash_calls_today} / {qstashLimit}
                            </span>
                          </div>
                          <div style={{ height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${qUsage}%`, height: '100%', background: qUsage > 90 ? '#EF4444' : qUsage > 70 ? '#F59E0B' : '#10B981', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>

                        {/* Egress 水位計 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: '#aaa' }}>估計傳輸流量 (Egress)</span>
                            <span style={{ color: eUsage > 80 ? '#F59E0B' : '#fff' }}>
                              {(usageStats.estimated_egress_bytes / (1024 * 1024 * 1024)).toFixed(2)} / {egressLimitGB} GB
                            </span>
                          </div>
                          <div style={{ height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${eUsage}%`, height: '100%', background: eUsage > 90 ? '#EF4444' : eUsage > 70 ? '#F59E0B' : '#3B82F6', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '4px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span style={{ color: '#aaa' }}>專業版 QStash 上限</span>
                          <span style={{ color: '#10B981', fontWeight: 'bold' }}>100,000+ 次 / 日</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span style={{ color: '#aaa' }}>專業版 Egress 流量</span>
                          <span style={{ color: '#10B981', fontWeight: 'bold' }}>250 GB / 月</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span style={{ color: '#aaa' }}>Vercel 逾時上限</span>
                          <span style={{ color: '#10B981', fontWeight: 'bold' }}>300s (Pro Runtime)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: '#aaa' }}>AI 解析優先級</span>
                          <span style={{ color: '#10B981', fontWeight: 'bold' }}>Enterprise Quota</span>
                        </div>
                      </div>
                    )}

                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#888' }}>
                            <Clock size={12} /> 執行上限: {isPaidTier ? '300s' : '60s'}
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#888' }}>
                            <Zap size={12} /> AI 模型: <span style={{ color: '#10B981', fontWeight: 'bold' }}>{currentAIModel}</span>
                         </div>
                      </div>
                    </div>
                );
              })()}

              {/* 佇列狀態總覽面板 */}
              {(() => {
                const completedCount = cloudFiles.filter(f => getFileCategory(f) === 'parsed').length;
                const pendingCount = cloudFiles.filter(f => getFileCategory(f) === 'pending').length;
                const processingCount = cloudFiles.filter(f => getFileCategory(f) === 'processing').length;
                const failedCount = cloudFiles.filter(f => getFileCategory(f) === 'failed').length;
                const unparsedCount = cloudFiles.filter(f => getFileCategory(f) === 'unparsed').length;
                const totalFiles = cloudFiles.length;
                const progressPct = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;
                const hasActiveJobs = pendingCount > 0 || processingCount > 0;

                return (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${hasActiveJobs ? 'rgba(96,165,250,0.3)' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    padding: '1rem 1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>{t('queueOverview', data.language)}</span>
                      {hasActiveJobs && (
                        <span style={{ fontSize: '0.7rem', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Loader2 size={10} className="spin" /> {t('autoRefreshHint', data.language)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('queueParsed', data.language)} <b style={{ color: '#10B981' }}>{completedCount}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('queuePending', data.language)} <b style={{ color: '#F59E0B' }}>{pendingCount}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA' }} />
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('queueProcessing', data.language)} <b style={{ color: '#60A5FA' }}>{processingCount}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('queueFailed', data.language)} <b style={{ color: '#EF4444' }}>{failedCount}</b></span>
                      </div>
                      {unparsedCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#888' }} />
                          <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('unparsed', data.language)} <b style={{ color: '#888' }}>{unparsedCount}</b></span>
                        </div>
                      )}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10B981, #34D399)',
                        transition: 'width 0.5s ease-out',
                        borderRadius: '3px'
                      }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#555', textAlign: 'right' }}>
                      {t('completionRate', data.language)}：{progressPct}% ({completedCount}/{totalFiles})
                    </div>
                    {pendingCount > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: '4px', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>若長時間停滯，可能是雲端佇列逾時休眠。<br />請圈選檔案並點擊上方「全部重新解析」改由本地強制處理。</div>
                      </div>
                    )}

                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={handleResetAndEnqueueAll}
                        disabled={isResetting || isReparsing}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: 'rgba(230,0,18,0.1)',
                          border: '1px solid rgba(230,0,18,0.3)',
                          borderRadius: '6px',
                          color: 'var(--tuc-red)',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isResetting ? <Loader2 size={14} className="spin" /> : <Repeat size={14} />}
                        {selectedFileIds.length > 0 
                          ? `重置並解析選取的 (${selectedFileIds.length})` 
                          : t('resetAndReparseAll', data.language)}
                      </button>
                      <button
                        onClick={handleAbortParsing}
                        disabled={isResetting || isReparsing}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: 'rgba(230,0,18,0.1)',
                          border: '1px solid rgba(230,0,18,0.3)',
                          borderRadius: '6px',
                          color: '#EF4444',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Ban size={14} /> 終止排隊與解析
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            </div>

            {/* V18.6: 垂直 Resizer 調整條 */}
            <div 
              onMouseDown={() => setIsInspectorResizing(true)}
              style={{
                height: '8px',
                width: '100%',
                cursor: 'ns-resize',
                background: isInspectorResizing ? 'rgba(230,0,18,0.2)' : 'transparent',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                margin: '4px 0',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
              className="inspector-resizer"
            >
              <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px' }} />
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

            {/* 分頁篩選標籤列 */}
            {(() => {
              const listToCount = (data.language === 'zh-TW' ? cloudFiles : translatedCloudFiles);
              const counts = {
                all: listToCount.filter(f => {
                  const name = f.display_name || f.original_name || '';
                  return name.includes(searchQuery) || (f.equipment_name || '').includes(searchQuery) || (f.requester || '').includes(searchQuery);
                }).length,
                parsed: listToCount.filter(f => getFileCategory(f) === 'parsed').length,
                pending: listToCount.filter(f => getFileCategory(f) === 'pending').length,
                processing: listToCount.filter(f => getFileCategory(f) === 'processing').length,
                failed: listToCount.filter(f => getFileCategory(f) === 'failed').length,
                unparsed: listToCount.filter(f => getFileCategory(f) === 'unparsed').length
              };
              const tabs: { key: 'all' | 'parsed' | 'pending' | 'processing' | 'failed' | 'unparsed'; labelKey: string; color: string }[] = [
                { key: 'all', labelKey: 'allFiles', color: '#888' },
                { key: 'parsed', labelKey: 'queueParsed', color: '#10B981' },
                { key: 'pending', labelKey: 'queuePending', color: '#F59E0B' },
                { key: 'processing', labelKey: 'queueProcessing', color: '#60A5FA' },
                { key: 'failed', labelKey: 'queueFailed', color: '#EF4444' },
                { key: 'unparsed', labelKey: 'unparsed', color: '#888' },
              ];
              return (
                <div style={{
                  display: 'flex',
                  gap: '2px',
                  marginBottom: '0',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px 8px 0 0',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setQueueFilterTab(tab.key); setSelectedFileIds([]); }}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: queueFilterTab === tab.key ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none',
                        borderBottom: queueFilterTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
                        color: queueFilterTab === tab.key ? tab.color : '#666',
                        fontSize: '0.78rem',
                        fontWeight: queueFilterTab === tab.key ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {t(tab.labelKey, data.language)}
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: queueFilterTab === tab.key ? `${tab.color}22` : 'rgba(255,255,255,0.05)',
                        color: queueFilterTab === tab.key ? tab.color : '#555',
                        fontWeight: 600
                      }}>
                        {counts[tab.key]}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Content List Table Container (V19.3: 提高最小高度並優化捲軸體驗，確保至少顯示 5-8 筆) */}
            <div style={{ flex: 1, minHeight: '450px', overflowY: 'auto', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 8px 8px', background: 'rgba(0,0,0,0.15)' }}>
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
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>{f.display_name || f.original_name}</div>
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
                        {((f as any).parse_status === 'completed' || (!(f as any).parse_status && ((f as any).knowledgeCount > 0 || f.is_parsed))) ? (
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
                            <Zap size={10} /> {t('parsedCount', data.language)} {((f as any).knowledgeCount > 0 || f.is_parsed) ? `(${(f as any).knowledgeCount || 0} ${t('itemsSuffix', data.language)})` : ''}
                          </span>
                        ) : (f as any).parse_status === 'pending' || (f as any).parse_status === 'processing' || ((f as any).parse_status && (f as any).parse_status.startsWith('processing:')) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              padding: '2px 8px',
                              background: 'rgba(96,165,250,0.1)',
                              color: '#60A5FA',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              border: '1px solid rgba(96,165,250,0.2)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content'
                            }}>
                              <Loader2 size={10} className="spin" /> {(f as any).parse_status === 'pending' ? t('statusPending', data.language) : t('statusProcessing', data.language)}
                              {((f as any).parse_status && (f as any).parse_status.startsWith('processing:')) && ` (${(f as any).parse_status.split(':')[1]})`}
                            </span>
                            {((f as any).parse_status && (f as any).parse_status.startsWith('processing:')) && (() => {
                              const [cur, total] = (f as any).parse_status.split(':')[1].split('/').map(Number);
                              const pct = total ? Math.round((cur / total) * 100) : 0;
                              return (
                                <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#60A5FA', transition: 'width 0.3s' }} />
                                </div>
                              );
                            })()}
                          </div>
                        ) : (f as any).parse_status === 'failed' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              padding: '2px 8px',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#EF4444',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              border: '1px solid rgba(239,68,68,0.2)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content'
                            }}>
                              <ShieldAlert size={10} /> {t('statusFailed', data.language)}
                            </span>
                            {f.error_message && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  let analysis = '未知的發生原因。';
                                  let action = '請重試或聯繫系統管理員。';
                                  const msg = f.error_message || '';
                                  if (msg.includes('QstashDailyRatelimitError') || msg.includes('Exceeded daily rate limit')) {
                                    analysis = '背景佇列服務 (QStash) 已達每日免費額度上限 (1000筆)。';
                                    action = '這是第三方服務計費限制，並非系統故障。配額固定於每日早上 08:00 (台灣時間) 自動刷新，屆時請重新送出解析即可。若持續發生，請考慮將 QStash 綁定信用卡解鎖額度。';
                                  } else if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.includes('Resource has been exhausted')) {
                                    analysis = '底層 AI 模型 (Gemini) 的請求配額暫時耗盡。';
                                    action = '由於您的文件過於龐大或同時送出過多請求，導致 Google AI 啟動防護機制。本系統已採用背景自動重試架構，通常過幾分鐘後佇列會重試成功。若超過一小時仍失敗，建議手動點擊「強制補解析」。';
                                  } else if (msg.includes('無法擷取檔案內容') || msg.includes('純視覺掃描模式')) {
                                    analysis = '系統無法讀取該檔案的文字塗層，且啟動視覺備援掃描失敗。';
                                    action = '這通常是因為上傳的檔案已損毀、有密碼保護，或是包含極度模糊的圖片。建議您將該檔案另存為標準 PDF 再重新上傳。';
                                  } else if (msg.includes('AI 回傳內容為空') || msg.includes('安全性過濾')) {
                                    analysis = 'AI 引擎拒絕回答或無法解讀檔案內的資訊。';
                                    action = '可能是 Google Gemini 因為安全過濾而阻隔了回應，也可能是文檔內容極細碎無法構成有意義知識。建議採用人工提取建檔。';
                                  } else {
                                    analysis = '未能精確歸類的解析中斷錯誤。';
                                    action = '原始錯誤訊息如下，若持續出現此錯誤，請回報支援團隊：\n' + msg;
                                  }
                                  
                                  alert(`【文件解析失敗診斷報告】\n\n📄 檔案名稱：${f.original_name}\n\n🔍 失敗原因分析：\n${analysis}\n\n💡 建議對策：\n${action}`);
                                }}
                                style={{ 
                                  fontSize: '0.65rem', 
                                  color: '#EF4444', 
                                  background: 'transparent',
                                  border: '1px solid #EF4444',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  width: 'fit-content',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginTop: '2px'
                                }}
                              >
                                <Info size={10} /> 診斷原因
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            padding: '2px 8px',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#888',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Info size={10} /> {t('unparsed', data.language)}
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
                          <button className="icon-btn" onClick={() => handleForceReparseFiles([f.id])} style={{ color: '#60A5FA' }} title={t('forceReparse', data.language)} disabled={isReparsing}>
                            <Repeat size={16} className={isReparsing && reparseCurrentFile === f.original_name ? "spin" : ""} />
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
        language={data.language}
      />

      {/* V9.9: 全域任務監測膠囊 (Floating Task Capsule) */}
      {isReparseMinimized && (
        <div
          onClick={() => setIsReparseMinimized(false)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2000,
            background: 'rgba(20,20,20,0.9)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isReparsing ? 'var(--tuc-red)' : 'var(--border-color)'}`,
            borderRadius: '50px',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: `0 8px 32px ${isReparsing ? 'rgba(230,0,18,0.3)' : 'rgba(0,0,0,0.5)'}`,
            animation: isReparsing ? 'pulse 2s infinite ease-in-out' : 'none'
          }}
        >
          {isReparsing ? (
            <div className="spin" style={{ color: 'var(--tuc-red)', display: 'flex' }}>
              <Repeat size={16} />
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', display: 'flex' }}>
              <Database size={16} color="var(--tuc-red)" />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white' }}>
              {isReparsing ? `${t('processing', data.language)} ${reparseProgress}%` : t('cloudInspector', data.language)}
            </div>
            {isReparsing && (
              <div style={{ fontSize: '0.6rem', color: '#888', whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {reparseCurrentFile}
              </div>
            )}
          </div>
          <div style={{ marginLeft: '8px', color: '#60A5FA' }}>
            <Maximize2 size={16} />
          </div>
        </div>
      )}
      {showManual && (
        <ManualModal
          isOpen={showManual}
          onClose={() => setShowManual(false)}
          language={data.language}
        />
      )}

      <DiagnosticModal
        isOpen={!!diagnosticTarget}
        onClose={() => setDiagnosticTarget(null)}
        diagnostic={diagnosticTarget ? getSafeDiagnostic(diagnosticTarget.error_message) : null}
        fileName={diagnosticTarget?.original_name || ''}
      />

      <SystemDiagnosticModal
        isOpen={showSystemDiagnostic}
        onClose={() => setShowSystemDiagnostic(false)}
        data={systemHealthData}
        onRefresh={handleCheckHealth}
        onFix={handleFixSystem}
        isRefreshing={isCheckingHealth}
        isFixing={isFixingSystem}
      />

      {/* V18.6: 搬遷至此的全域清理彈窗 */}
      {showCleanupModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '500px',
            background: 'rgba(20,20,20,0.98)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #EF4444',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {t('cleanupLargeFiles', data.language)} (共 {largeFilesFound.length} 個)
              </span>
              <button onClick={() => setShowCleanupModal(false)} className="icon-btn"><X size={20} /></button>
            </div>
            
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: '#bbb',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {largeFilesFound.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 0' }}>
                  <input
                    type="checkbox"
                    checked={f.checked}
                    onChange={(e) => {
                      const newList = [...largeFilesFound];
                      newList[i].checked = e.target.checked;
                      setLargeFilesFound(newList);
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', overflow: 'hidden', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }} title={f.originalName || f.name}>
                      {f.originalName || f.name}
                    </span>
                    <span style={{ color: '#888', flexShrink: 0 }}>{(f.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#F87171', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px' }}>
              ⚠️ {t('warningHighUsage', data.language)}<br/>
              * 提醒：點擊確認後將一併刪除實體檔案、紀錄與知識庫內容。
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={executeCleanup}
                disabled={isCleaning}
                className="primary-button"
                style={{ flex: 1, background: '#EF4444', borderColor: '#EF4444', height: '42px' }}
              >
                {isCleaning ? <Loader2 size={18} className="spin" /> : '確認徹底清理'}
              </button>
              <button
                onClick={() => setShowCleanupModal(false)}
                className="ghost-button"
                style={{ height: '42px' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .unselectable-v {
          user-select: none;
          cursor: ns-resize !important;
        }
        .inspector-resizer:hover {
          background: rgba(255,255,255,0.05) !important;
        }
      `}</style>
    </div>
  );
}

export default App;
