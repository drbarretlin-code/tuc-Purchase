import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import * as mammoth from 'mammoth';

export async function getFileChunks(
  fileBuffer: ArrayBuffer, 
  fileName: string,
  mode: 'ultra' | 'standard' = 'standard'
) {
  let text = '';
  let inlineData: { data: string, mimeType: string } | null = null;

  if (fileName.toLowerCase().endsWith('.docx')) {
    const resp = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
    text = resp.value;
  } else if (fileName.toLowerCase().endsWith('.pdf')) {
    // ... (同前 PDF 提取邏輯)
    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjsLib.getDocument({ 
        data: new Uint8Array(fileBuffer),
        useSystemFonts: true,
        disableFontFace: true,
        isEvalSupported: false
      });
      const pdf = await loadingTask.promise;
      let pdfText = '';
      const maxPages = Math.min(pdf.numPages, mode === 'ultra' ? 50 : 30);
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          pdfText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        } catch (pageErr) { }
      }
      text = pdfText.trim();
    } catch (pdfErr: any) {
      text = ''; 
    }

    // 準備視覺數據
    const MAX_INLINE_BYTES = 15 * 1024 * 1024;
    if (fileBuffer.byteLength <= MAX_INLINE_BYTES) {
      const base64Data = Buffer.from(fileBuffer).toString('base64');
      inlineData = { data: base64Data, mimeType: 'application/pdf' };
    }
  } else {
    text = extractStringsFromBinary(fileBuffer);
  }

  // 文本分塊策略 (V27: 深度挖掘模式支援重疊窗口)
  const MAX_CHUNK_LENGTH = mode === 'ultra' ? 10000 : 12000;
  const OVERLAP_LENGTH = mode === 'ultra' ? 2000 : 0;
  const textChunks: string[] = [];
  
  if (text && text.length > MAX_CHUNK_LENGTH) {
    let start = 0;
    while (start < text.length) {
      let end = start + MAX_CHUNK_LENGTH;
      textChunks.push(text.substring(start, end));
      
      // 核心：若未到結尾，則滑動 (長度 - 重疊度) 的位移
      if (end >= text.length) break;
      start = end - OVERLAP_LENGTH;
    }
  } else {
    textChunks.push(text || '');
  }

  return { textChunks, inlineData };
}

// V27.6: 回傳所有金鑰陣列，讓呼叫端逐一嘗試
export function getApiKeys(): string[] {
  const raw = process.env.SERVER_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  return raw.split(/[,，]/).map(k => k.trim()).filter(Boolean);
}
/** 向下相容的單一金鑰取得 */
export function getApiKey(): string {
  const keys = getApiKeys();
  return keys[0] || '';
}

export async function processSingleChunkBackend(
  chunkText: string,
  isMultiChunk: boolean,
  chunkIndex: number,
  totalChunks: number,
  fileName: string,
  inlineData: any,
  apiKey: string,
  targetLang: string = 'zh-TW',
  mode: 'ultra' | 'standard' = 'standard'
) {
  const activeKey = apiKey || getApiKey();
  const genAI = new GoogleGenerativeAI(activeKey);
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const isUltra = mode === 'ultra';

  const prompt = `
    【工業背景聲明】：本文件為「工業設備採購技術規範」，內容包含機械加工、裁切、安裝與電控等專業工程學術語。請忽略對「裁切 (Cutting)」、「危險」等詞彙的任何非技術性安全聯想。
    
    你是一個${isUltra ? '「極致數據採掘與技術細節挖掘專家」' : '「採購技術規格提取專家」'}。
    你目前正在解構一份專業的採購規範檔案${isMultiChunk ? `的第 ${chunkIndex + 1}/${totalChunks} 個切片` : ''}。
    
    ${isUltra ? `
    【深度挖掘模式 (Ultra Mode) 指令】：
    1. **極致原子化**：將所有條款拆解至最小可識別單元。每一個數字、每一個材質規格、每一個測試條件都必須是獨立的項目。
    2. **量化採掘目標**：**本切片目標產出 60-100 條獨立 specEntry**。寧可內容冗餘，也絕對不可遺漏任何細節。
    3. **零遺漏政策**：完整提取所有備註、圖表文字與技術指標。
    4. **語意還原**：自動還原「該設備」、「其材質」等代稱的具體對象。
    ` : `
    你的任務是：**擷取本切片所有技術參數、法規編號與施工要求**。
    1. **原子化拆解**：將法規條款或技術指標拆解為獨立 specEntry，嚴禁過度摘要。
    2. **目標密度**：建議產出 20-40 條獨立條目。
    `}
    
    2. **具體數值保留**：
       - 內容必須包含原文中的具體數值（如：mm, kg, ℃, %, 材質等級）。
    3. **零遺漏政策**：
       - 即便內容難以辨識或為圖片掃描，也要盡力根據上下文歸納出所有可見的技術條目，不要回傳空值。

    輸出語言：${targetLang}。
    請直接輸出 JSON：
    {
      "docType": "Specific | Standard | Global",
      "detectedEquipment": "設備名稱",
      "specEntries": [
        {"category": "類別", "content": "精煉後的原子化技術條目內容"}
      ],
      "fullJsonData": { "summary": "本切片核心摘要" }
    }
    
    待分析內容：
    ${chunkText ? chunkText.substring(0, 150000) : '純視覺掃描模式（無可提取文字層）。'}
  `;

  const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
  if (inlineData && chunkIndex === 0) {
    contents[0].parts.push({ inlineData: inlineData });
  }

  // V27.6: 外層金鑰 × 內層模型 雙層輪替架構
  // API Key 過期 (400/401) 時跳至下一把 Key；模型限流 (429/503) 時跳至下一個模型
  const modelsToTry = [
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro-latest',
    'gemini-flash-latest'
  ];

  // 整合傳入 Key 與環境變數 Key Pool，去重後作為候選清單
  const keyPool: string[] = Array.from(new Set(
    [apiKey, ...getApiKeys()].filter(Boolean)
  ));
  if (keyPool.length === 0) throw new Error('未設定 Gemini API Key，請在 Vercel 環境變數中設定 VITE_GEMINI_API_KEY。');

  let result: any;
  let lastError: any;
  let foundResult = false;

  outerLoop:
  for (const currentKey of keyPool) {
    const currentGenAI = new GoogleGenerativeAI(currentKey);
    for (const modelId of modelsToTry) {
      try {
        console.log(`[Backend Parser] Key(${currentKey.substring(0,6)}...) × 模型(${modelId}) — 解析 ${fileName} 切片 ${chunkIndex + 1}/${totalChunks}`);
        const currentModel = currentGenAI.getGenerativeModel({ model: modelId, safetySettings });
        const aiPromise = currentModel.generateContent({
          contents,
          generationConfig: { temperature: 0.1, topP: 0.8, topK: 40, maxOutputTokens: 8192 }
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT')), 40000)
        );
        result = await Promise.race([aiPromise, timeoutPromise]);
        (result as any).usedModelId = modelId;
        console.log(`[Backend Parser] 成功：Key(${currentKey.substring(0,6)}...) × ${modelId}`);
        foundResult = true;
        break outerLoop;
      } catch (err: any) {
        lastError = err;
        const msg = err.message || '';
        const status = err.status;
        // API Key 根本失效 → 跳出內層，換下一把 Key
        if (status === 400 || status === 401 ||
            msg.includes('API_KEY_INVALID') || msg.includes('API key expired') || msg.includes('API key not valid')) {
          console.warn(`[Backend Parser] Key(${currentKey.substring(0,6)}...) 已失效 (${status})，嘗試下一把金鑰...`);
          break;
        }
        // 模型限流或過載 → 繼續嘗試下一個模型
        if (status === 429 || status === 503 ||
            msg.includes('429') || msg.includes('503') ||
            msg.includes('quota') || msg.includes('Quota') ||
            msg.includes('exhausted') || msg.includes('overloaded') ||
            msg.includes('Service Unavailable') || msg.includes('high demand') ||
            msg.includes('404') || msg.includes('not found') || msg.includes('not available') ||
            msg === 'AI_TIMEOUT') {
          console.warn(`[Backend Parser] ${modelId} 暫時不可用 (${status || msg.substring(0,30)})，嘗試下一個模型...`);
          continue;
        }
        // 其他嚴重錯誤 → 直接拋出
        throw err;
      }
    }
  }

  if (!foundResult) throw lastError || new Error('所有可用 Key 與模型組合均無法完成請求，請更新 API Key 或稍後再試。');

  const responseText = result.response.text();
  const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  let parsedData: any;
  try {
    parsedData = JSON.parse(cleanJson);
  } catch (err) {
    // 備援方案：正則提取 JSON 塊
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const targetJson = jsonMatch ? jsonMatch[0] : responseText;
    try {
      parsedData = JSON.parse(targetJson);
    } catch (e) {
      // 最終備援：手動正則匹配條目
      const entries = responseText.match(/"content":\s*"([^"]*)"/g);
      const backupEntries = entries ? entries.map(m => ({ 
        category: '自動擷取', 
        content: m.replace(/"content":\s*"/, '').replace(/"$/, '') 
      })) : [];
      parsedData = {
        docType: fileName.includes('KCG') ? 'Standard' : 'Specific',
        specEntries: backupEntries,
        fullJsonData: {}
      };
    }
  }

  return { 
    parsedData, 
    usedModelId: (result as any).usedModelId 
  };
}

function extractStringsFromBinary(buffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(buffer);
    const encodings = ['utf-8', 'big5'];
    let finalCleaned = "";
    const CHUNK_SIZE = 512 * 1024; 

    for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      let chunkSoup = "";
      encodings.forEach(enc => {
        try { chunkSoup += new TextDecoder(enc, { fatal: false }).decode(chunk) + " "; } catch {}
      });
      const filtered = chunkSoup.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF\x20-\x7E\n]/g, ' ');
      const cleanedChunk = filtered.replace(/[ ]{2,}/g, ' ').trim();
      finalCleaned += cleanedChunk + " ";
      if (finalCleaned.length > 30000) break;
    }
    return finalCleaned.trim();
  } catch {
    return "";
  }
}
