import mammoth from 'mammoth';
import { supabase } from './supabase';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { AIHintSelection } from '../types/form';
import { t } from './i18n';

/**
 * V13: 動態模型管理系統 (2026 最新版)
 * 使用 @google/genai 統一 SDK，具備自動模型發現機制
 */
let cachedModelId: string | null = null;
export const getCachedModelId = () => cachedModelId;

/** V27.5: 實際 API 呼叫遇 429/503 時呼叫此函式，強制下次重新偵測 */
export function invalidateCachedModel() {
  if (cachedModelId) {
    console.warn(`[AI Discovery] 快取模型 ${cachedModelId} 已因限流/過載失效，下次將重新偵測。`);
    cachedModelId = null;
  }
}
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export interface DiagnosticResult {
  code: 'QUOTA_EXCEEDED' | 'API_KEY_EXPIRED' | 'API_KEY_INVALID' | 'FILE_TOO_LARGE' | 'AI_SAFETY_REJECT' | 'JSON_PARSE_FAILED' | 'STORAGE_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  rawError?: string;
  timestamp: string;
  suggestion?: string;
}

export class DiagnosticError extends Error {
  diagnostic: DiagnosticResult;
  constructor(diag: DiagnosticResult) {
    super(diag.message);
    this.name = 'DiagnosticError';
    this.diagnostic = diag;
  }
}

/**
 * V27: 瀑布式金鑰輪替輔助函式
 * 整合 localStorage 中的金鑰池與目前活動金鑰
 */
export function getGeminiKeyPool(): string[] {
  const activeKey = localStorage.getItem('tuc_gemini_key') || '';
  const poolStr = localStorage.getItem('gemini_api_key_pool') || '';
  const legacyKey = localStorage.getItem('gemini_api_key') || '';
  const envKey1 = import.meta.env.VITE_GEMINI_API_KEY || '';
  const envKey2 = import.meta.env.VITE_GEMINI_KEY || '';
  
  // 遍歷所有可能的來源並進行分割
  const allRaw = [activeKey, poolStr, legacyKey, envKey1, envKey2].join(',');
  const keys = allRaw.split(/[,，\n]/).map(k => k.trim()).filter(k => k);
  
  return Array.from(new Set(keys));
}

export async function getAutoSelectedModel(apiKeys: string | string[]): Promise<{ modelId: string; apiKey: string }> {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  console.log(`[AI Discovery] 啟動瀑布式偵測 (Waterfall V3)，金鑰池總數: ${keys.length}`);

  const activeKey = localStorage.getItem('tuc_gemini_key') || (Array.isArray(apiKeys) ? apiKeys[0] : apiKeys);
  if (cachedModelId && activeKey) return { modelId: cachedModelId, apiKey: activeKey };

  // 用於紀錄偵測到的最佳「非 100% 可用」模型，作為最後的防線
  let globalFallback: { modelId: string; apiKey: string } | null = null;

  const priorityList = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro-latest',
    'gemini-flash-latest',
  ];

  for (let i = 0; i < keys.length; i++) {
    const currentKey = keys[i];
    if (!currentKey) continue;

    console.log(`[AI Discovery] 正在掃描金鑰索引 ${i} (前 6 碼: ${currentKey.substring(0,6)}...)`);
    const genAI = new GoogleGenerativeAI(currentKey);

    for (const mId of priorityList) {
      try {
        const model = genAI.getGenerativeModel({ model: mId, safetySettings });

        // 探針測試：嘗試生成 1 個 Token
        await Promise.race([
          model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
            generationConfig: { maxOutputTokens: 1 }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Probe timeout')), 10000))
        ]);

        // 若成功，立即鎖定並返回
        cachedModelId = mId;
        localStorage.setItem('tuc_gemini_key', currentKey);
        console.log(`[AI Discovery] 試驗成功！鎖定可用模型 ${mId} (金鑰索引: ${i})。`);
        return { modelId: mId, apiKey: currentKey };

      } catch (err: any) {
        const errMsg = err.message || '';
        const status = err.status || (err.response ? err.response.status : null);

        // V27.5: 503 (Service Unavailable) 視同 429 限流處理
        const isRateLimited =
          errMsg.includes('429') || status === 429 ||
          errMsg.includes('503') || status === 503 ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('exhausted') ||
          errMsg.toLowerCase().includes('overloaded');

        if (isRateLimited) {
          console.warn(`[AI Discovery] 模型 ${mId} 暫時限流/過載 (${status || 'unknown'})，存為備選，繼續嘗試...`);
          if (!globalFallback) {
            globalFallback = { modelId: mId, apiKey: currentKey };
          }
          continue;
        }

        // 若為 API Key 根本性錯誤 (400/401/Invalid)，直接跳過此 Key
        if (errMsg.includes('API key expired') || errMsg.includes('API_KEY_INVALID') || status === 401 || status === 400 || errMsg.includes('not found')) {
          console.warn(`[AI Discovery] 金鑰索引 ${i} 已失效，跳過該金鑰並嘗試下一把。`);
          break;
        }

        // 其他錯誤 (404 模型不存在等)，繼續嘗試下一個模型
        continue;
      }
    }
  }

  // 若遍歷所有金鑰與模型後仍無 100% 成功的
  if (globalFallback) {
    cachedModelId = globalFallback.modelId;
    localStorage.setItem('tuc_gemini_key', globalFallback.apiKey);
    console.log(`[AI Discovery] 未發現完全可用路徑，回退至首個限流模型: ${cachedModelId}。`);
    return globalFallback;
  }

  console.error(`[AI Discovery] 嚴重故障：金鑰池中所有組合皆無法連通。`);
  return 'gemini-2.0-flash';
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

    const encodings = ['utf-8', 'big5', 'gbk', 'windows-1252'];
    let finalCleaned = "";
    const CHUNK_SIZE = 512 * 1024; // 512KB 區塊，預防 V8 Regex 記憶體溢出
    const targetLimit = 50000;

    for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      let chunkSoup = "";

      encodings.forEach(enc => {
        try {
          const decoder = new TextDecoder(enc, { fatal: false });
          chunkSoup += decoder.decode(chunk) + " ";
        } catch {}
      });

      try {
        const decoder16 = new TextDecoder('utf-16le', { fatal: false });
        chunkSoup += decoder16.decode(chunk) + " ";
        if (chunk.byteLength > 1) {
          chunkSoup += decoder16.decode(chunk.slice(1)) + " ";
        }
      } catch {}

      const filtered = chunkSoup.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F\uFF00-\uFFEF\u2122\x20-\x7E\n]/g, ' ');
      
      const cleanedChunk = filtered
        .replace(/[ ]{2,}/g, ' ')
        .replace(/([^0-9a-zA-Z\u4E00-\u9FFF])\1{2,}/g, '$1')
        .trim();

      finalCleaned += cleanedChunk + " ";

      if (finalCleaned.length > targetLimit) {
        finalCleaned = finalCleaned.substring(0, targetLimit);
        console.log(`[AI Parser] 提取已達上限 (${targetLimit} 字)，提早結束掃描。`);
        break;
      }
    }

    console.log(`[AI Parser] 全頻段掃描完成，提取長度: ${finalCleaned.length}`);
    
    if (finalCleaned.trim().length < 50) {
      console.warn('[AI Parser] 提取內容極少，建議對該檔案另存為 .docx 處理。');
    }

    return finalCleaned.trim();
  } catch (err) {
    console.error('[AI Parser] V14.5 解析崩潰:', err);
    return "";
  }
};

export const processFileToKnowledge = async (file: File, apiKey?: string, equipmentName?: string, overrideDocId?: string, forceRebuild?: boolean) => {
  const lang = (globalThis as any)._tuc_lang || 'zh-TW'; 

  // V27.12: 取得完整金鑰池，支援多把 Key 瀑布輪替
  let pool = getGeminiKeyPool();
  const passedKey = (apiKey || import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('tuc_gemini_key') || '').trim();
  
  if (passedKey && !pool.includes(passedKey)) {
    pool.unshift(passedKey); // 優先使用外部傳入的 Key
  }
  
  if (pool.length === 0) throw new Error(t('aiNoKey', lang));

  // 讓探針測試所有 Key 與所有 Model
  const modelId = await getAutoSelectedModel(pool);
  
  // 取得探針測試成功的 Key (getAutoSelectedModel 會在成功時寫入 localStorage)
  const workingKey = localStorage.getItem('tuc_gemini_key') || passedKey;
  
  const genAI = new GoogleGenerativeAI(workingKey);
  const model = genAI.getGenerativeModel({ model: modelId, safetySettings });

  let inlineData: { data: string, mimeType: string } | null = null;
  let text = '';
  
  // V13.8: 複合式解析架構 (Docx/Doc 本地提取，PDF 自動回退多模態)
  const lowerName = file.name.toLowerCase();
  
  if (lowerName.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const resp = await mammoth.extractRawText({ arrayBuffer });
      text = resp.value;
      console.log(`[AI Parser] .docx 本地提取成功: ${text.length} 字`);
    } catch (err) {
      console.warn(`[AI Parser] .docx 本地提取失敗，嘗試粗暴掃描:`, err);
      text = extractStringsFromBinary(arrayBuffer);
    }
  } else if (lowerName.endsWith('.doc')) {
    const arrayBuffer = await file.arrayBuffer();
    text = extractStringsFromBinary(arrayBuffer);
    console.log(`[AI Parser] .doc (Legacy) 字串掃描成功: ${text.length} 字`);
  } else if (lowerName.endsWith('.pdf')) {
    // V18: 徹底移除不穩定的 pdfjs-dist CDN Worker，全面啟用 Gemini 原生多模態 PDF 視覺解析。
    // 這能完美保留表格結構、繞過加密字體提取失敗，並解決大部分 CDN 逾時問題。
    const MAX_BASE64_SIZE = 15 * 1024 * 1024; // 15MB 上限 (Base64 會膨脹 33%，約佔 20MB Payload)
    if (file.size > MAX_BASE64_SIZE) {
      console.warn(`[AI Multimodal] PDF 檔案超過單次請求上限 (15MB)，嘗試擷取... : ${file.name}`);
      // 這裡理論上可以呼叫 File API 分割，但目前先直上，由外圍 Catch 接住超限報錯。
    }
    const base64 = await fileToBase64(file);
    inlineData = { data: base64, mimeType: 'application/pdf' };
    text = ''; 
    console.log(`[AI Multimodal] PDF 原生視覺渲染啟動: ${file.name}`);
  }

  if (!text && !inlineData) throw new Error(t('parseError', lang));

  const prompt = `
    你是一個「極致知識挖掘」與「採購技術專家」。你目前正在解構一份專業的採購規範或技術標準檔案。
    你的任務是：**榨乾這份檔案的所有技術價值**。
    
    請執行以下操作：
    1. **深度語意分析**：
       - 如果檔案是特定設備的規範，請提取所有規格、材質、性能指標。
       - 如果檔案是通用技術標準 (Standard) 或法規 (Global)，請提取關鍵的「作業準則」、「安全規範」或「驗收條件」。
    2. **絕對強制提取與零遺漏政策**：
       - **嚴禁過度摘要**。請將每一個獨立的法規條款、技術規格或性能指標拆解為獨立的 specEntry。
       - 對於長篇文件，請務必產出與原文長度成比例的條目數量（目標 20-50 條），確保技術細節不被遺漏。
       - 即便內容難以辨識，也要根據檔名（${file.name}）與可見文字，產出文檔核心摘要。
    3. **知識層級判定**：
       - Specific: 具體設備或工程。
       - Standard: 施工法、材料標準、KCG 編號標準。
       - Global: 法規、環保規章。
    
    回傳格式：必須是純粹的 JSON。
    {
      "docType": "Specific | Standard | Global",
      "detectedEquipment": "最相關的設備或工程名稱",
      "specEntries": [
        {"category": "技術要求/安全規範/驗收標準...", "content": "精煉後的條款內容"}
      ],
      "fullJsonData": { "summary": "文檔整體摘要", "keywords": ["關鍵字1", "關鍵字2"] }
    }
    
    待分析內容：
    ${text ? text.substring(0, 60000) : '請深度掃描附件檔案並提取所有技術條款。'}
  `;

  try {
    const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
    
    if (inlineData) {
      contents[0].parts.push({ inlineData });
    }

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.2,
        topP: 0.8,
        topK: 40
      }
    }).catch(err => {
      const msg = err.message || '';

      // V20: API Key 過期/無效攔截 (最高優先)
      if (
        msg.includes('API key expired') ||
        msg.includes('API_KEY_INVALID') ||
        msg.includes('API key not valid')
      ) {
        throw new DiagnosticError({
          code: 'API_KEY_EXPIRED',
          message: 'Gemini API Key 已過期或無效。',
          rawError: msg,
          timestamp: new Date().toISOString(),
          suggestion: '請點擊右上角「齒輪」圖示，進入設定頁面更新您的 Gemini API Key。'
        });
      }

      // V18.1 / V27.5: 429 配額或 503 過載攔截 — 同時清除快取讓下次重新偵測模型
      if (msg.includes('429') || msg.includes('503') || msg.includes('Quota') || msg.includes('exhausted') || msg.toLowerCase().includes('overloaded')) {
        invalidateCachedModel();
        throw new DiagnosticError({
          code: 'QUOTA_EXCEEDED',
          message: 'Gemini API 每日或每分鐘配額已耗盡，或服務暫時過載。',
          rawError: msg,
          timestamp: new Date().toISOString(),
          suggestion: '請等待 1 分鐘後再試，或更換 API Key。如果您使用的是免費版，每日限制通常為 20-50 次。'
        });
      }
      // 安全攔截
      if (msg.toLowerCase().includes('safety') || msg.toLowerCase().includes('blocked')) {
        throw new DiagnosticError({
          code: 'AI_SAFETY_REJECT',
          message: 'AI 安全審查攔截了此檔案內容。',
          rawError: msg,
          timestamp: new Date().toISOString(),
          suggestion: '檔案中可能包含敏感字眼或格式被誤判為有害。請嘗試重新掃描或手動節錄關鍵技術條款。'
        });
      }
      throw err;
    });
    const responseText = result.response.text();
    if (!responseText) throw new Error(t('aiError', lang));
    
    let cleanJson = responseText.replace(/```json|```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn('[AI Parser] Strict JSON.parse failed, attempting aggressive sanitization:', parseError);
      try {
        cleanJson = cleanJson.replace(/[\x00-\x1F]/g, '');
        cleanJson = cleanJson.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
        parsed = JSON.parse(cleanJson);
      } catch (finalError) {
        console.warn('[AI Parser] JSON 解析徹底失敗，啟動容錯備用機制。');
        parsed = {
          docType: 'Specific',
          specEntries: [{ category: '未分類提取', content: responseText.substring(0, 1000) }],
          fullJsonData: {}
        };
      }
    }
    
    const detectedEq = parsed.detectedEquipment || equipmentName || t('unnamedEq', lang);
    let indexData = parsed.specEntries || [];
    const fullJson = parsed.fullJsonData || {};

    // V17.0: 深度挖掘 Fallback (全方位保障機制)
    // 策略 A: 若 AI 漏寫 specEntries 但有寫出 fullJsonData，我們強制轉譯
    if (indexData.length === 0 && Object.keys(fullJson).length > 0) {
      console.warn(`[AI Parser] specEntries 為空，啟動全欄位轉譯映射 (Quantity-First)...`);
      const categoryMap: Record<string, string> = {
        equipmentName: '設備主體',
        requirementDesc: '採購需求說明',
        appearance: '品相與材質',
        quantityUnit: '數量/單位',
        scopeScope: '適用範圍',
        rangeRange: '適用區間',
        envRequirements: '環保與場域要求',
        regRequirements: '政府法規與合規',
        maintRequirements: '維護保固與售後',
        safetyRequirements: '勞安與安全規範',
        elecSpecs: '電氣與控制系統',
        mechSpecs: '機構與物理參數',
        physSpecs: '物理規格',
        relySpecs: '信賴性要求',
        installStandard: '施工裝機標準',
        workPeriod: '施作工期',
        acceptanceDesc: '驗收與測量標準',
        complianceDesc: '一般遵守事項',
        tableData: '關鍵數據列表'
      };

      for (const [key, val] of Object.entries(fullJson)) {
        if (val) {
          let contentStr = '';
          if (typeof val === 'string' && val.trim().length > 0) {
            contentStr = val.trim();
          } else if (Array.isArray(val) && val.length > 0) {
            // 處理 tableData 或是 Array 欄位
            contentStr = val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('; ');
          }

          if (contentStr && categoryMap[key]) {
            indexData.push({ category: categoryMap[key], content: contentStr });
          }
        }
      }
    }

    // 策略 B: 若依然為 0 (極度貧乏)，則將全文摘要作為條目 (最後防線)
    if (indexData.length === 0) {
      console.warn(`[AI Parser] 深度挖掘失敗，啟動最後防線：文檔摘要條目化`);
      indexData.push({ 
        category: '文檔核心摘要', 
        content: `(文檔來源: ${file.name}) ` + (text.substring(0, 500) || '此檔案內容較為簡略或為純圖像/殘缺二進制，只能記錄為純參考附件。') 
      });
    }

    const docId = overrideDocId || crypto.randomUUID();

    if (!supabase) return { added: 0, skipped: 0, detectedEquipment: detectedEq, fullJson, docId };

    if (forceRebuild) {
      console.log(`[AI Parser] 執行強制重建，刪除舊有紀錄: ${file.name}`);
      await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', file.name);
    }

    let addedCount = 0;
    let skippedCount = 0;

    // V17.3: In-memory deduplication to prevent cross-file conflicts and speed up processing
    const uniqueItems = [];
    const seen = new Set();
    for (const item of indexData) {
      const contentStr = item.content || '無內容摘要';
      const catStr = item.category || '未分類';
      const key = `${catStr}:::${contentStr}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push({ category: catStr, content: contentStr });
      } else {
        skippedCount++;
      }
    }

    for (const item of uniqueItems) {
      const safeCategory = item.category.substring(0, 50);
      
      const { error } = await supabase.from('tuc_history_knowledge').insert({
        category: safeCategory,
        content: item.content,
        source_file_name: file.name,
        metadata: { 
          equipment_name: detectedEq, 
          docType: parsed.docType, 
          docId: docId,
          full_json_data: fullJson
        }
      });
      if (!error) {
        addedCount++;
      } else {
        console.error('[AI Parser] 知識點存檔失敗 (Insert Error):', error.message);
      }
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

export const translateSearchQueries = async (eqK: string, reqK: string, apiKey: string | string[]): Promise<{eqVariants: string[], reqVariants: string[]}> => {
  if (!apiKey || (Array.isArray(apiKey) && apiKey.length === 0)) return { eqVariants: [eqK], reqVariants: [reqK] };
  if (searchVariantCache && searchVariantCache.eqKey === eqK && searchVariantCache.reqKey === reqK) {
    return searchVariantCache.variants;
  }
  
  try {
    const keys = Array.isArray(apiKey) ? apiKey : [apiKey];
    const modelId = await getAutoSelectedModel(apiKey);
    const workingKey = localStorage.getItem('tuc_gemini_key') || keys[0];
    const genAI = new GoogleGenerativeAI(workingKey);
    const model = genAI.getGenerativeModel({ model: modelId, safetySettings });

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
  thresholdHistory: number = 0.5,
  thresholdReg: number = 0.5
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

    // 3. 排序並過取前 10 名 (移除 AI Rerank，直接回傳確定性結果)
    const finalSelection = scoredData.sort((a, b) => b.score - a.score).slice(0, 10);

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
export const syncFormDataToKnowledge = async (data: any, apiKey?: string | string[]) => {
  const finalKey = apiKey || getGeminiKeyPool();
  const modelId = await getAutoSelectedModel(finalKey);
  const keys = Array.isArray(finalKey) ? finalKey : [finalKey];
  const workingKey = localStorage.getItem('tuc_gemini_key') || keys[0];
  const genAI = new GoogleGenerativeAI(workingKey);

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
  if (!supabase) throw new Error('資料庫連線未建立');

  try {
    const model = genAI.getGenerativeModel({ model: modelId, safetySettings });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const responseText = result.response.text();
    if (!responseText) throw new Error('AI 同步回傳內容為空');
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    let parsed: any = { specEntries: [], docType: 'Specific' };
    try {
      parsed = JSON.parse(cleanJson);
    } catch(err) {
      console.warn('[Sync] JSON 解析失敗，啟用容錯機制');
    }
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
      const safeCategory = item.category ? item.category.substring(0, 50) : '未分類';
      const { error } = await supabase.from('tuc_history_knowledge').insert({
        category: safeCategory,
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
    const { error: updateError } = await supabase.from('tuc_uploaded_files')
      .update({ full_json_data: data })
      .eq('id', docId);

    if (updateError) {
      console.warn('[Sync] 忽略更新 tuc_uploaded_files 的 full_json_data (可能無此欄位):', updateError.message);
    }

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
    欄位包含：equipmentName, requirementDesc, appearance, quantityUnit, equipmentScope, rangeRange, envRequirements, regRequirements, maintRequirements, safetyRequirements, elecSpecs, mechSpecs, physSpecs, relySpecs, installStandard, workPeriod, acceptanceDesc, complianceDesc, contractorNotice, tableData (JSONArray)。
    請依據條文內容進行最佳分類與填充。若條文與某欄位不相關，請留空。

    內容：
    ${combinedContent}
  `;

  try {
    const genAI = new GoogleGenerativeAI(rawKey);
    const modelId = await getAutoSelectedModel(rawKey);
    const model = genAI.getGenerativeModel({ model: modelId, safetySettings });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const responseText = result.response.text();
    if (!responseText) throw new Error('AI 反向組裝回傳內容為空');
    let cleanJson = responseText.replace(/```json|```/g, '').trim();
    let fullJson: any = {};
    try {
      fullJson = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[反向組裝] JSON 解析失敗，啟用容錯機制');
      try {
        cleanJson = cleanJson.replace(/[\x00-\x1F]/g, '').replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
        if (!cleanJson.endsWith('}')) cleanJson += '}';
        fullJson = JSON.parse(cleanJson);
      } catch (e2) {
        console.error('[反向組裝] 完全解析失敗', e2);
      }
    }
    
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
  apiKey: string | string[]
): Promise<AIHintSelection[]> {
  if (hints.length === 0) return hints;

  // V27.29: 取得驗證過的可用金鑰與模型
  const { modelId, apiKey: workingKey } = await getAutoSelectedModel(apiKey);
  const genAI = new GoogleGenerativeAI(workingKey);
  const model = genAI.getGenerativeModel({ model: modelId, safetySettings });

  const langMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'en-US': 'English',
    'th-TH': 'Thai (ภาษาไทย)'
  };

  const targetLabel = langMap[targetLang] || targetLang;

  if (targetLang === 'zh-TW') return hints;

  // V27.26: 增加啟發式偵測，如果內容已經包含泰文字元且目標是泰文，則跳過
  const isThai = (text: string) => /[\u0E00-\u0E7F]/.test(text);
  if (targetLang === 'th-TH' && hints.every(h => isThai(h.content))) {
    return hints;
  }

  const inputTexts = hints.map(h => h.content);

  const prompt = `You are a professional technical procurement translator. 
Translate the array of Traditional Chinese strings into ${targetLabel}.
CRITICAL: Even if the content is highly technical, EVERYTHING must be translated into ${targetLabel}.
DO NOT return any Chinese characters in the result.
Maintain technical accuracy for terms like PLC, SUS, HMI.
RETURN ONLY A JSON ARRAY OF STRINGS. Keep the same array order.

INPUT:
${JSON.stringify(inputTexts)}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        // V27.27: 移除強制 JSON 模式以提升舊模型相容性，改由 Prompt 與提取器確保結果
      }
    });
    
    const text = result.response.text();
    // V27.26: 強化 JSON 提取器，確保能處理包含廢話的回應
    let cleanJson = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    } else {
      cleanJson = text.replace(/```json|```/g, '').trim();
    }
    
    const translatedTexts = JSON.parse(cleanJson);

    if (!Array.isArray(translatedTexts)) {
      throw new Error('AI did not return a JSON array');
    }

    const updatedHints = JSON.parse(JSON.stringify(hints));

    updatedHints.forEach((h: AIHintSelection, idx: number) => {
      if (!h.originalContent) {
        h.originalContent = hints[idx].content;
      }
      
      if (translatedTexts[idx]) {
        h.content = translatedTexts[idx].trim();
      }
    });

    return updatedHints;
  } catch (err) {
    console.error('[AI Translation Error]:', err);
    return hints; // 失敗時保留原文
  }
}

/**
 * V17.3: 雲端紀錄動態翻譯
 * 將資料庫中的動態名稱與標籤翻譯為目標語系
 */
export async function translateCloudMetadata(
  items: { id: string; name: string; tags?: string[] }[],
  targetLang: string,
  apiKey: string | string[]
): Promise<{ id: string; name: string; tags?: string[] }[]> {
  if (items.length === 0 || targetLang === 'zh-TW') return items;

  const keys = Array.isArray(apiKey) ? apiKey : [apiKey];
  const workingKey = localStorage.getItem('tuc_gemini_key') || keys[0];
  const genAI = new GoogleGenerativeAI(workingKey);
  const modelId = await getAutoSelectedModel(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId, safetySettings });

  const langMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'en-US': 'English',
    'th-TH': 'Thai (ภาษาไทย)'
  };
  const targetLabel = langMap[targetLang] || targetLang;

  // 縮小翻譯範圍：僅翻譯名稱與標籤，並組合為單一 Prompt
  const payload = items.map((item, idx) => ({
    idx,
    name: item.name,
    tags: item.tags || []
  }));

  const prompt = `You are a high-end technical translator. Translate these Traditional Chinese equipment maintenance titles and filenames into ${targetLabel}.
  - MANDATORY: The output MUST NOT contain any Traditional Chinese characters.
  - Translate machine parts: "滾輪" -> "Roller", "平台" -> "Platform", "導輪" -> "Guide Wheel".
  - Translate actions: "更換" -> "Replacement", "修改" -> "Modification", "加裝" -> "Installation".
  - Preserve specific model numbers (e.g., T8, T9) and file extensions (e.g., .docx).
  Input: ${JSON.stringify(payload)}
  Return format: [{"idx": number, "name": "translated title", "tags": ["translated tag"]}]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // V17.5: 強化 JSON 提取器，確保能處理包含 preamble 的回應
    let cleanJson = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    } else {
      cleanJson = text.replace(/```json|```/g, '').trim();
    }
    
    const translatedList = JSON.parse(cleanJson);

    return items.map((item, idx) => {
      // 優先使用 idx 匹配，備援使用 id 匹配
      const translated = translatedList.find((t: any) => t.idx === idx || t.id === item.id);
      return translated ? { 
        ...item, 
        name: translated.name || translated.title, 
        tags: translated.tags 
      } : item;
    });
  } catch (err) {
    console.error('[AI Translation] Metadata translation failed:', err);
    return items;
  }
}

/**
 * V17.4: 深度規格內容轉譯
 * 當載入歷史檔案時，若語系不符，自動將整個 JSON 規格內容轉譯為目標語系
 */
export async function translateFullSpec(
  data: any,
  targetLang: string,
  apiKey: string | string[]
): Promise<any> {
  if (!data || targetLang === 'zh-TW') return data;

  const keys = Array.isArray(apiKey) ? apiKey : [apiKey];
  const workingKey = localStorage.getItem('tuc_gemini_key') || keys[0];
  const genAI = new GoogleGenerativeAI(workingKey);
  const modelId = await getAutoSelectedModel(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId, safetySettings });

  const langMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'en-US': 'English',
    'th-TH': 'Thai (ภาษาไทย)'
  };
  const targetLabel = langMap[targetLang] || targetLang;

  const prompt = `You are a professional technical procurement translator. 
Translate the following procurement specification JSON from Traditional Chinese into ${targetLabel}.
Maintain the EXACT JSON structure. Only translate the string values.
Keep technical terms like "PLC", "SUS304", "HMI", "ISO" in their standard technical format.

Input JSON: ${JSON.stringify(data)}
Return ONLY the translated JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('[AI Deep Translation] Full spec translation failed:', err);
    return data; // 失敗時傳回原文
  }
}


