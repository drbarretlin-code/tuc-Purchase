import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIHintSelection } from '../types/form';
import { t } from './i18n';

// 設定 PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

/**
 * V13: 動態模型管理系統 (2026 最新版)
 * 使用 @google/genai 統一 SDK，具備自動模型發現機制
 */
let cachedModelId: string | null = null;

async function getAutoSelectedModel(apiKey: string): Promise<string> {
  if (cachedModelId) return cachedModelId;
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // V16: 模型搜尋機制
  // 優先順序策略 (由 2026 最新至穩定版)
  // 注意：gemini-2.0-flash 對新用戶已失效，故排除或置後
  const priorityList = [
    'gemini-3.1-flash',
    'gemini-3.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash'
  ];

  console.log('[AI Discovery] 開始進行可用性連線試驗 (generateContent probe)...');

  for (const mId of priorityList) {
    try {
      // 必須使用 generateContent 進行試驗，因為 countTokens 可能在已禁用模型上仍然成功
      const model = genAI.getGenerativeModel({ model: mId });
      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 1 } // 極小消耗
      });
      cachedModelId = mId;
      console.log(`[AI Discovery] 試驗成功！鎖定最優可用模型: ${cachedModelId}`);
      break;
    } catch (err: any) {
      const errMsg = err.message || '';
      const status = err.status || (err.response ? err.response.status : null);
      
      if (
        errMsg.includes('404') || 
        status === 404 || 
        errMsg.includes('429') || 
        status === 429 || 
        errMsg.toLowerCase().includes('not found') ||
        errMsg.toLowerCase().includes('resource_exhausted') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('rate limit')
      ) {
        console.warn(`[AI Discovery] 模型 ${mId} 暫時不可用 (404/429/Quota)，嘗試下一個...`);
        continue;
      }
      
      // 處理「新使用者受限」的特殊報錯
      if (errMsg.includes('no longer available to new users')) {
        console.warn(`[AI Discovery] 模型 ${mId} 受限 (僅限舊用戶)，跳過...`);
        continue;
      }

      console.error(`[AI Discovery] 試驗 ${mId} 時發生其他錯誤:`, errMsg);
      // 若為授權錯誤 (401)，則不需要再試驗其他模型
      if (status === 401 || errMsg.includes('API key not valid')) break;
    }
  }

  return cachedModelId || 'gemini-1.5-flash';
}

/**
 * 助手函式：將 File 轉換為 Base64 字串
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * 助手函式：究極全頻段二進制提取 (V14.5 - Sliding Window & Multi-Encoding)
 * 這是瀏覽器端處理舊版 .doc 的最後手段：同時解碼多種偏移量與編碼流，拼湊出所有可能的文字碎片。
 */
const extractStringsFromBinary = (buffer: ArrayBuffer): string => {
  try {
    const uint8 = new Uint8Array(buffer);
    
    // 診斷日誌：Hex 標頭
    const hexHeader = Array.from(uint8.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`[AI Parser] .doc 格式診斷 (Hex): ${hexHeader}`);

    // 定義探測策略
    const encodings = ['utf-8', 'big5', 'gbk', 'windows-1252'];
    let soup = "";

    // 1. 標準編碼探測
    encodings.forEach(enc => {
      try {
        const decoder = new TextDecoder(enc, { fatal: false });
        soup += decoder.decode(buffer) + " ";
      } catch {}
    });

    // 2. UTF-16LE 滑動窗口探測 (針對二進制位移偏移量 0 與 1)
    try {
      const decoder16 = new TextDecoder('utf-16le', { fatal: false });
      soup += decoder16.decode(buffer) + " ";
      // 位移 1 位元組再次解碼，捕捉被錯位的文字
      if (buffer.byteLength > 1) {
        soup += decoder16.decode(buffer.slice(1)) + " ";
      }
    } catch {}

    // 3. 語意過濾與強效降噪
    // 保留：中日韓漢字、標點、數值、英文字母
    const filtered = soup.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F\uFF00-\uFFEF\u2122\x20-\x7E\n]/g, ' ');
    
    // 移除過短的雜訊（寬鬆策略），保留所有中文字塊，移除 3 個連續相同不可讀字元
    const cleaned = filtered
      .replace(/[ ]{2,}/g, ' ')
      .replace(/([^0-9a-zA-Z\u4E00-\u9FFF])\1{2,}/g, '$1')
      .trim();

    console.log(`[AI Parser] 全頻段掃描完成，提取長度: ${cleaned.length}`);
    
    if (cleaned.length < 50) {
      console.warn('[AI Parser] 提取內容極少，建議對該檔案另存為 .docx 處理。');
    }

    return cleaned;
  } catch (err) {
    console.error('[AI Parser] V14.5 解析崩潰:', err);
    return "";
  }
};

export const processFileToKnowledge = async (file: File, apiKey?: string, equipmentName?: string, overrideDocId?: string) => {
  const rawKey = apiKey || import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '';
  const finalKey = rawKey.trim();
  
  // V16: 本地化錯誤訊息 (需外部傳入 language，此處暫用預設或從 metadata/傳入)
  // 修正：將 language 作為參數傳入 processFileToKnowledge
  const lang = (globalThis as any)._tuc_lang || 'zh-TW'; 
  
  if (!finalKey) throw new Error(t('aiNoKey', lang));
  
  const genAI = new GoogleGenerativeAI(finalKey);
  const modelId = await getAutoSelectedModel(finalKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  let inlineData: { data: string, mimeType: string } | null = null;
  let text = '';
  
  // V13.8: 複合式解析架構 (Docx/Doc 本地提取，PDF 自動回退多模態)
  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const resp = await mammoth.extractRawText({ arrayBuffer });
      text = resp.value;
      console.log(`[AI Parser] .docx 本地提取成功: ${text.length} 字`);
    } catch (err) {
      console.warn(`[AI Parser] .docx 本地提取失敗，嘗試粗暴掃描:`, err);
      text = extractStringsFromBinary(arrayBuffer);
    }
  } else if (file.name.endsWith('.doc')) {
    const arrayBuffer = await file.arrayBuffer();
    text = extractStringsFromBinary(arrayBuffer);
    console.log(`[AI Parser] .doc (Legacy) 字串掃描成功: ${text.length} 字`);
  } else if (file.name.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    // V13.1: 修正 PDF.js cMap 配置
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true
    }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(' ');
    }
    
    // V13.6: 自動回退機制 - 若提取文字過少，嘗試多模態解析
    if (!fullText || fullText.trim().length < 50) {
      console.warn(`[AI Multimodal] PDF 文字提取內容不足 (${fullText?.length || 0} 字)，自動切換至多模態附件模式: ${file.name}`);
      const base64 = await fileToBase64(file);
      inlineData = { data: base64, mimeType: 'application/pdf' };
      text = ''; 
    } else {
      text = fullText;
    }
  }

  if (!text && !inlineData) throw new Error(t('parseError', lang));

  const prompt = `
    你是一個專業的採購規範專家。目前你正在處理一份透過「全頻段編碼掃描」從二進制遺骸中救援出的文件片段。
    請分析${inlineData ? '「附件檔案」' : '「以下殘缺文字」'}，完成以下任務：
    (重要提示：內容中混雜了多種編碼探測出的重複片段與殘缺字元，請利用你的語意邏輯進行「去重」與「重組」，精確尋找技術要求、材料規格、設備名稱與驗收標準)。

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
    
    ${text ? `內容文字：\n${text.substring(0, 15000)}` : '請直接分析附件二進制檔案。'}
  `;

  try {
    const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
    
    if (inlineData) {
      contents[0].parts.push({ inlineData });
    }

    const result = await model.generateContent({
      contents
    });
    const responseText = result.response.text();
    if (!responseText) throw new Error(t('aiError', lang));
    
    let cleanJson = responseText.replace(/```json|```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn('[AI Parser] Strict JSON.parse failed, attempting aggressive sanitization:', parseError);
      // Remove invalid control characters (0x00-0x1F)
      cleanJson = cleanJson.replace(/[\x00-\x1F]/g, '');
      // Escape backslashes that are not valid JSON escape sequences (", \, /, b, f, n, r, t, u)
      cleanJson = cleanJson.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
      parsed = JSON.parse(cleanJson);
    }
    
    const detectedEq = parsed.detectedEquipment || equipmentName || t('unnamedEq', lang);
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
 * 新版詞彙拆解與吻合度計算 (吻合度 = 輸入詞彙命中數 / 輸入詞彙總數)
 * 70% 門檻指「輸入內容中，有 70% 出現在目標字串中」
 */
const calculateTokenOverlap = (input: string, target: string): number => {
  if (!input || !target) return 0;
  
  const tokenize = (str: string) => {
    return str.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g) || [];
  };

  const inputTokens = Array.from(new Set(tokenize(input)));
  if (inputTokens.length === 0) return 0;

  const targetLower = target.toLowerCase();
  const matches = inputTokens.filter(t => targetLower.includes(t.toLowerCase())).length;
  
  return matches / inputTokens.length;
};

const calculateMaxTokenOverlap = (variants: string[], target: string): number => {
  if (!variants || variants.length === 0) return 0;
  let maxScore = 0;
  for (const v of variants) {
    const score = calculateTokenOverlap(v, target);
    if (score > maxScore) maxScore = score;
    if (maxScore === 1) break;
  }
  return maxScore;
};

let searchVariantCache: { eqKey: string, reqKey: string, variants: { eqVariants: string[], reqVariants: string[] } } | null = null;

export const translateSearchQueries = async (eqK: string, reqK: string, apiKey: string): Promise<{eqVariants: string[], reqVariants: string[]}> => {
  if (!apiKey) return { eqVariants: [eqK], reqVariants: [reqK] };
  if (searchVariantCache && searchVariantCache.eqKey === eqK && searchVariantCache.reqKey === reqK) {
    return searchVariantCache.variants;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelId = await getAutoSelectedModel(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    const prompt = `Translate the following two terms into Traditional Chinese, English, Simplified Chinese, and Thai.
Return ONLY a JSON object with this exact structure, ensuring all values are arrays of strings:
{"eqVariants": ["original", "traditional", "english", "simplified", "thai"], "reqVariants": ["original", "traditional", "english", "simplified", "thai"]}

Term 1 (eq): ${eqK || ' '}
Term 2 (req): ${reqK || ' '}
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    });
    
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    if (!parsed.eqVariants.includes(eqK)) parsed.eqVariants.push(eqK);
    if (!parsed.reqVariants.includes(reqK)) parsed.reqVariants.push(reqK);
    
    searchVariantCache = { eqKey: eqK, reqKey: reqK, variants: parsed };
    return parsed;
  } catch (err) {
    console.warn('Search query translation failed, using original.', err);
    return { eqVariants: [eqK], reqVariants: [reqK] };
  }
};


export const getHistorySuggestions = async (
  category: string, 
  eqKeywords: string[] = [], 
  reqKeywords: string[] = [],
  thresholdHistory: number = 0.6,
  thresholdReg: number = 0.2
): Promise<{ hints: AIHintSelection[], status: 'success' | 'no_key' | 'ai_error' | 'empty' }> => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '';
  if (!apiKey) return { hints: [], status: 'no_key' };
  if (!supabase) return { hints: [], status: 'ai_error' };

  try {
    // 1. 抓取基礎候選人 (類別相符 或 docType 為標準/法規)
    const { data: candidates, error } = await supabase
      .from('tuc_history_knowledge')
      .select('id, content, source_file_name, metadata, category')
      .or(`category.eq.${category},metadata->>docType.in.("Standard","Global")`)
      .limit(200);

    if (error) throw error;
    if (!candidates || candidates.length === 0) return { hints: [], status: 'empty' };

    // 2. 第一階段：分離比對邏輯 (使用動態門檻)
    const scoredData = candidates.map(item => {
      const docType = (item.metadata as any)?.docType || 'Specific';
      let score = 0;

      if (docType === 'Specific') {
        // TUC 歷史資料：僅比對設備名稱
        const dbEquipmentName = (item.metadata as any)?.equipment_name || '';
        score = calculateMaxTokenOverlap(eqKeywords, dbEquipmentName);
        return { ...item, score, threshold: thresholdHistory };
      } else {
        // 技術法令/標準：僅比對條文內容與需求說明
        score = calculateMaxTokenOverlap(reqKeywords, item.content);
        return { ...item, score, threshold: thresholdReg };
      }
    }).filter(item => item.score >= item.threshold);

    if (scoredData.length === 0) return { hints: [], status: 'empty' };

    // 3. 排序並過取前 20 名 (移除 AI Rerank，直接回傳確定性結果)
    const finalSelection = scoredData.sort((a, b) => b.score - a.score).slice(0, 20);

    const mappedHints = finalSelection.map((item) => ({
      id: item.id.toString(),
      content: item.content,
      selected: false,
      docType: (item.metadata as any)?.docType || 'Specific',
      source: item.source_file_name
    }));

    return { 
      hints: mappedHints, 
      status: mappedHints.length > 0 ? 'success' : 'empty' 
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
    const genAI = new GoogleGenerativeAI(finalKey);
    const modelId = await getAutoSelectedModel(finalKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const responseText = result.response.text();
    if (!responseText) throw new Error('AI 同步回傳內容為空');
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
  if (!rawKey) throw new Error('缺少 Gemini API Key，請在設定中輸入。');

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
    const modelId = await getAutoSelectedModel(rawKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const responseText = result.response.text();
    if (!responseText) throw new Error('AI 反向組裝回傳內容為空');
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const fullJson = JSON.parse(cleanJson);
    
    // 確保輸出的 JSON 包含 docId，避免 UI 渲染報錯
    const finalResult = {
      ...fullJson,
      docId: docId
    };

    // 更新資料庫回填
    await supabase.from('tuc_uploaded_files')
      .update({ full_json_data: finalResult })
      .eq('id', docId);

    return finalResult;
  } catch (err: any) {
    console.error('[反向組裝失敗]', err);
    throw new Error(`AI 組裝模組執行失敗: ${err.message || '網路或 API 錯誤'}`);
  }
};

/**
 * V16: 即時內容轉譯功能
 * 將檢索到的歷史/法令內容轉譯為目標語系
 */
export async function translateHints(
  hints: AIHintSelection[], 
  targetLang: string, 
  apiKey: string
): Promise<AIHintSelection[]> {
  if (hints.length === 0) return hints;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = await getAutoSelectedModel(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  const langMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'en-US': 'English',
    'th-TH': 'Thai (ภาษาไทย)'
  };

  const targetLabel = langMap[targetLang] || targetLang;

  // 組合條文以優化 API 效能
  const combinedText = hints.map((h, idx) => `ID:${idx} CONTENT:${h.content}`).join('\n---\n');

  const prompt = `You are a professional technical procurement translator. 
Translate the following entries from Traditional Chinese into ${targetLabel}.
Ensure technical terminology (e.g., PLC, SUS, HMI, safety standards) is accurate.
Strictly maintain the format "ID:number CONTENT:translated_text" for each entry.

DATA TO TRANSLATE:
${combinedText}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      }
    });
    
    const translatedText = result.response.text();
    const updatedHints = JSON.parse(JSON.stringify(hints)); // 深拷貝

    updatedHints.forEach((h: AIHintSelection, idx: number) => {
      // 尋找對應索引的內容
      const regex = new RegExp(`ID:${idx}\\s*CONTENT:\\s*([\\s\\S]*?)(?=ID:${idx + 1}|$)`, 'i');
      const match = translatedText.match(regex);
      if (match && match[1]) {
        h.content = match[1].trim();
      }
    });

    return updatedHints;
  } catch (err) {
    console.error('[AI Translation Error]:', err);
    return hints; // 失敗時保留原文
  }
}
