import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIHintSelection } from '../types/form';

// 設定 PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

// V12.2: 升級至 2026 穩定型模型 (解決 404 棄用問題)
const GEMINI_MODEL = "gemini-2.0-flash";

const TECHNICAL_BOOST_MAP: Record<string, number> = {
  '防爆': 2.0,
  '電壓': 1.5,
  'SUS': 1.5,
  '火災': 1.8,
  '靜電': 1.6,
  '消防': 1.8,
  '高架': 1.7,
  '局限空間': 1.9,
  '廢水': 1.6,
  '安全': 1.4,
  '粉塵': 1.7
};

export const processFileToKnowledge = async (file: File, apiKey?: string, equipmentName?: string, overrideDocId?: string) => {
  const rawKey = apiKey || import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '';
  const finalKey = rawKey.trim();
  
  if (!finalKey) throw new Error('缺少 Gemini API Key，請在系統設定中輸入。');
  
  const genAI = new GoogleGenerativeAI(finalKey);
  let text = '';
  
  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else if (file.name.endsWith('.doc')) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawContent = decoder.decode(uint8);
    text = rawContent.replace(/[^\x20-\x7E\u4E00-\u9FA5\u3000-\u303F\uFF00-\uFFEF]/g, ' ');
  } else if (file.name.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(' ');
    }
    text = fullText;
  }

  if (!text) throw new Error('無法從檔案中提取內容');

  const prompt = `
    你是一個專業的採購規範專家。請分析以下文字內容，完成以下任務：
    1. 辨別這份文件的知識層級 (docType)：
       - Specific: 特定機台序號、型號或廠牌所需的「專屬規範」。
       - Standard: 跨設備通用之「工程技術標準」(如配電、零件、材質標準)。
       - Global: 政府法規、勞安或環境保護「共通法規」(如職安法、環保規章)。
    2. 辨別設備主體名稱 (detectedEquipment)：
       - 若為 Specific，請辨識設備名 (如：大明剪床、RTO)。
       - 若為 Standard，請統一回傳「技術標準」。
       - 若為 Global，請統一回傳「共通性法規」。
    3. 從內容中提取「技術要求」條目並分類為 specEntries。
    4. **同時轉成結構化 JSON (fullJsonData)**：
       請根據內容填充以下欄位，若無資訊請留空：
       - equipmentName: 設備名稱
       - requirementDesc: 需求描述
       - appearance: 品相描述
       - quantityUnit: 數量與單位
       - scopeScope: 工程適用範圍
       - rangeRange: 工程適用區間
       - envRequirements: 環保要求
       - regRequirements: 法規要求
       - maintRequirements: 維護要求
       - safetyRequirements: 安全要求
       - elecSpecs: 電氣規格
       - mechSpecs: 機構規格
       - physSpecs: 物理規格
       - relySpecs: 信賴規格
       - installStandard: 施工標準
       - workPeriod: 工期
       - acceptanceDesc: 驗收要求
       - complianceDesc: 遵守事項
       - tableData: 數組對象，包含 {item, requirement, method} (對應十二. 驗收要求細目)

    回傳格式：嚴格純 JSON 物件。
    {
      "docType": "Specific | Standard | Global",
      "detectedEquipment": "辨識出的設備名稱",
      "specEntries": [{"category": "類別", "content": "規範文字"}],
      "fullJsonData": { ...上述欄位... }
    }
    
    內容：
    ${text.substring(0, 8000)}
  `;

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    const detectedEq = parsed.detectedEquipment || equipmentName || '未命名設備';
    const indexData = parsed.specEntries || [];

    if (!supabase) return { added: 0, skipped: 0, detectedEquipment: detectedEq };

    let addedCount = 0;
    let skippedCount = 0;
    
    const fullJson = parsed.fullJsonData || {};
    const docId = overrideDocId || crypto.randomUUID();

    for (const item of indexData) {
      const { data: existing } = await supabase
        .from('tuc_history_knowledge')
        .select('id')
        .eq('category', item.category)
        .eq('content', item.content)
        .contains('metadata', { equipment_name: detectedEq })
        .maybeSingle();

      if (existing) {
        skippedCount++;
        continue;
      }

      const { error } = await supabase.from('tuc_history_knowledge').insert({
        category: item.category,
        content: item.content,
        source_file_name: file.name,
        full_json_data: fullJson,
        metadata: { 
          equipment_name: detectedEq, 
          docType: parsed.docType, 
          docId: docId 
        }
      });
      if (!error) addedCount++;
    }
    
    return { added: addedCount, skipped: skippedCount, detectedEquipment: detectedEq, fullJson, docId };
  } catch (err) {
    console.error('[解析失敗]', err);
    throw err;
  }
};

/**
 * 計算加權相似度 (V11: 20% 設備名稱 / 80% 需求說明 + 關鍵字加權)
 */
export const calculateWeightedSimilarity = (
  content: string, 
  eqKeywords: string = '', 
  reqKeywords: string = '',
  metadata?: any
) => {
  const tokenize = (str: string) => {
    if (!str) return [];
    return str.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g) || [];
  };

  const calculateOverlap = (tokens: string[], target: string) => {
    if (tokens.length === 0) return 0;
    const uniqueTokens = Array.from(new Set(tokens));
    const normalizedTarget = target.toLowerCase();
    const matches = uniqueTokens.filter(t => normalizedTarget.includes(t.toLowerCase())).length;
    let score = matches / uniqueTokens.length;

    // 關鍵字引力增壓 (Keyword Boosting)
    Object.entries(TECHNICAL_BOOST_MAP).forEach(([word, boost]) => {
      if (tokens.includes(word) && target.includes(word)) {
        score *= boost;
      }
    });

    return Math.min(1.0, score);
  };

  const dbEquipmentName = metadata?.equipment_name || '';
  const eqTokens = tokenize(eqKeywords);
  const reqTokens = tokenize(reqKeywords);

  // 1. 設備名稱比對 (20% 權重)
  const scoreEq = eqTokens.length > 0 ? calculateOverlap(eqTokens, dbEquipmentName) : 0.5;
  
  // 2. 說明內容比對 (80% 權重)
  const scoreReq = reqTokens.length > 0 ? calculateOverlap(reqTokens, content) : 0.5;

  return (scoreEq * 0.2) + (scoreReq * 0.8);
};

/**
 * AI 語意重排序 (Reranker) - 提升上下文連貫性
 */
const rerankWithAI = async (
  candidates: any[], 
  equipmentName: string, 
  requirementDesc: string
): Promise<any[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '';
  if (!apiKey || candidates.length === 0) return candidates;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
      你是一個專業的採購規範審核專家。
      使用者目前正在編寫一份採購規範，背景如下：
      - 設備名稱: "${equipmentName}"
      - 需求描述: "${requirementDesc}"

      以下是從資料庫中檢索出的相似條文候選清單，請根據與「當前上下文語意」的相關性進行評分（0.0 到 1.0）。
      相關性是指：候選條文是否能解決需求描述中的技術問題，或與該設備的典型安全/環保規範相符。
      請特別注意技術關鍵字（如：防爆、電力、SUS、消防等）的契合度。

      候選清單：
      ${candidates.map((c, i) => `ID [${i}]: ${c.content}`).join('\n')}

      請回傳 JSON 陣列，包含 ID 與 Score，例如：[{"id": 0, "score": 0.95}, ...]
      僅回傳純 JSON 陣列。
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const scores = JSON.parse(cleanJson);

    if (!Array.isArray(scores)) return candidates;

    return candidates.map((c, i) => {
      const match = scores.find((s: any) => s.id === i);
      return { ...c, aiScore: match ? match.score : 0 };
    }).sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  } catch (err) {
    console.warn('[AI Rerank] 失敗，退回基礎排序:', err);
    return candidates;
  }
};

export const getHistorySuggestions = async (
  category: string, 
  eqKeywords: string = '', 
  reqKeywords: string = ''
): Promise<{ hints: AIHintSelection[], status: 'success' | 'no_key' | 'ai_error' | 'empty' }> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '';
  if (!apiKey) return { hints: [], status: 'no_key' };
  if (!supabase) return { hints: [], status: 'ai_error' };

  try {
    // 抓取基礎候選人 (類別相符 或 docType 為標準/法規)
    const { data: candidates, error } = await supabase
      .from('tuc_history_knowledge')
      .select('id, content, source_file_name, metadata, category')
      .or(`category.eq.${category},metadata->>docType.in.("Standard","Global")`)
      .limit(60);

    if (error) throw error;
    if (!candidates || candidates.length === 0) return { hints: [], status: 'empty' };

    // 第一階段：快速加權過濾 (設定 0.4 為候選門檻)
    const scoredData = candidates.map(item => {
      const baseScore = calculateWeightedSimilarity(
        item.content, 
        eqKeywords, 
        reqKeywords,
        item.metadata
      );
      return { ...item, score: baseScore };
    }).filter(item => item.score >= 0.4);

    if (scoredData.length === 0) return { hints: [], status: 'empty' };

    // 第二階段：AI 語意重排序 (針對前 15 名候選人進行上下文分析)
    const topCandidates = scoredData.sort((a, b) => b.score - a.score).slice(0, 15);
    const reranked = await rerankWithAI(topCandidates, eqKeywords, reqKeywords);

    // 檢查 reranked 是否有 aiScore (若 rerank 失敗會返回原陣列)
    const hasAIScore = reranked.length > 0 && reranked[0].aiScore !== undefined;
    if (!hasAIScore) return { hints: [], status: 'ai_error' };

    const filtered = reranked
      .filter(item => (item.aiScore || 0) >= 0.6) // 最終語意門檻 60%
      .map((item) => ({
        id: item.id.toString(),
        content: item.content,
        selected: false,
        docType: (item.metadata as any)?.docType || 'Specific',
        source: item.source_file_name
      }));

    return { 
      hints: filtered, 
      status: filtered.length > 0 ? 'success' : 'empty' 
    };
  } catch (err) {
    console.error('History fetch fatal error:', err);
    return { hints: [], status: 'ai_error' };
  }
};

/**
 * 完稿同步至知識庫 (基於 DocID 的智慧覆蓋機制)
 */
export const syncFormDataToKnowledge = async (data: any, apiKey?: string) => {
  const rawKey = apiKey || import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '';
  const finalKey = rawKey.trim();
  if (!finalKey) throw new Error('缺少 Gemini API Key');
  if (!supabase) throw new Error('資料庫連線未建立');

  const docId = data.docId;
  const equipmentName = data.equipmentName || '未命名設備';

  // 1. 建構表單摘要文字供 AI 解析
  const summaryText = `
    文件識別碼: ${docId}
    設備名稱: ${equipmentName}
    需求說明: ${data.requirementDesc}
    品相描述: ${data.appearance}
    環境與環保要求: ${data.envRequirements}
    法規遵從: ${data.regRequirements}
    維護要求: ${data.maintRequirements}
    安全要求: ${data.safetyRequirements}
    電氣規格: ${data.elecSpecs}
    機構規格: ${data.mechSpecs}
    安裝標準: ${data.installStandard}
    驗收標準: ${data.acceptanceDesc}
    遵守事項: ${data.complianceDesc}
  `;

  const prompt = `
    你是一個專業的採購規範專家。請分析這份由「系統產生」的規範內容：
    1. 判定 docType (此處建議固定為 Specific)。
    2. 從各類別中提取最具代表性的「技術要求」條目。
    
    回傳格式：嚴格純 JSON。
    {
      "docType": "Specific",
      "specEntries": [{"category": "類別", "content": "規範文字"}]
    }
    
    內容：
    ${summaryText}
  `;

  try {
    // 執行 AI 解析
    const genAI = new GoogleGenerativeAI(finalKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    const indexData = parsed.specEntries || [];

    // 2. 智慧覆蓋：根據 DocID 刪除舊資料
    const { error: deleteError } = await supabase
      .from('tuc_history_knowledge')
      .delete()
      .eq('metadata->>docId', docId);

    if (deleteError) {
      console.warn('[智慧覆蓋] 刪除舊資料失敗 (可能為首次上傳):', deleteError);
    }

    // 3. 執行新資料插入 (僅插入條目)
    let addedCount = 0;
    for (const item of indexData) {
      const { error } = await supabase.from('tuc_history_knowledge').insert({
        category: item.category,
        content: item.content,
        source_file_name: `[App] ${equipmentName}`,
        metadata: { 
          equipment_name: equipmentName, 
          docType: parsed.docType,
          docId: docId,
          isAppGenerated: true 
        }
      });
      if (!error) addedCount++;
    }

    // 4. 同時更新檔案記錄的完整 JSON 存檔
    await supabase.from('tuc_uploaded_files')
      .update({ full_json_data: data })
      .eq('id', docId);

    return { success: true, count: addedCount, docId };
  } catch (err) {
    console.error('[同步失敗]', err);
    throw err;
  }
};

/**
 * 反向組裝既有資料的 JSON
 */
export const assembleJsonFromExistingEntries = async (docId: string, apiKey?: string, fileName?: string) => {
  if (!supabase) throw new Error('資料庫未連線');
  let { data: entries, error } = await supabase
    .from('tuc_history_knowledge')
    .select('*')
    .eq('metadata->>docId', docId);

  // V12.1: 增加檔名回退匹配 (支援舊資料)
  if (!entries || entries.length === 0) {
    console.log('[反向組裝] DocID 匹配失敗，嘗試使用檔名回退...', fileName);
    const { data: fallbackEntries, error: fallbackError } = await supabase
      .from('tuc_history_knowledge')
      .select('*')
      .eq('source_file_name', fileName);
    
    entries = fallbackEntries;
    error = fallbackError;
  }

  if (error || !entries || entries.length === 0) {
    console.error('[反向組裝] 找不到條文。DocID:', docId, 'FileName:', fileName);
    throw new Error('找不到對應條文');
  }

  const rawKey = apiKey || import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '';
  if (!rawKey) return null;

  const combinedContent = entries.map(e => `[${e.category}] ${e.content}`).join('\n');

  const prompt = `
    請將以下零散的採購條文「反向組裝」成一個結構化的 JSON 檔案。
    欄位包含：equipmentName, requirementDesc, appearance, quantityUnit, scopeScope, rangeRange, envRequirements, regRequirements, maintRequirements, safetyRequirements, elecSpecs, mechSpecs, physSpecs, relySpecs, installStandard, workPeriod, acceptanceDesc, complianceDesc, tableData (JSONArray)。
    請依據條文內容進行最佳分類與填充。若條文與某欄位不相關，請留空。

    內容：
    ${combinedContent}
  `;

  try {
    const genAI = new GoogleGenerativeAI(rawKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const fullJson = JSON.parse(cleanJson);
    
    // 更新資料庫回填
    await supabase.from('tuc_uploaded_files')
      .update({ full_json_data: fullJson })
      .eq('id', docId);

    return fullJson;
  } catch (err) {
    console.error('[反向組裝失敗]', err);
    return null;
  }
};
