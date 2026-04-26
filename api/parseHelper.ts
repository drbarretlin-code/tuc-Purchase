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

// V26: 支援多金鑰輪替機制
export function getApiKey() {
  const raw = process.env.SERVER_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return '';
  // 使用隨機或基於時間的分發，此處使用隨機
  return keys[Math.floor(Math.random() * keys.length)];
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
    你是一個${isUltra ? '「極端嚴苛的技術審核與合約挖掘專家」' : '「極致知識挖掘」與「採購技術專家」'}。
    你目前正在解構一份專業的採購規範檔案${isMultiChunk ? `的第 ${chunkIndex + 1}/${totalChunks} 個切片` : ''}。
    
    ${isUltra ? `
    【深度挖掘模式 (Ultra Mode) 指令】：
    1. **絕對原子化**：禁止將多個要求合併為一條。每一個獨立的數值參數、每一個特定的材質要求、每一項法規引用都必須拆分成獨立的項目。
    2. **零遺漏政策**：即便是不起眼的備註、括號內的規格，也必須完整提取。
    3. **挖掘密度**：目標是產出比平常高出 2-3 倍的條目量。
    4. **語境恢復**：如果本分塊開頭有引用前文的內容（例如「承上所述」、「該設備」），請結合上下文判斷其指代對象並補全內容。
    ` : `
    你的任務是：**榨乾這個切片的所有技術價值，絕不遺漏任何技術參數、法規編號、施工要求或驗收標準**。
    1. **絕對強制提取與原子化拆解**：
       - **嚴禁過度摘要**。請將每一個獨立的法規條款、技術規格或性能指標拆解為獨立的 specEntry。
       - 目標是產出高密度的條目（本切片建議產出 20-40 條獨立條目），確保技術細節不被遺漏。
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

  const modelsToTry = [
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-pro-latest',
    'gemini-flash-latest'
  ];
  let result: any;
  let lastError: any;

  for (const modelId of modelsToTry) {
    try {
      console.log(`[Backend Parser] 嘗試使用 ${modelId} 解析 ${fileName} 切片 ${chunkIndex + 1}/${totalChunks}...`);
      const currentModel = genAI.getGenerativeModel({ model: modelId, safetySettings });
      
      // V26.9: 增加超時寬限至 40s (針對 12000 字元高密度挖掘)
      const aiPromise = currentModel.generateContent({ contents });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 40000)
      );

      result = await Promise.race([aiPromise, timeoutPromise]);
      (result as any).usedModelId = modelId;
      console.log(`[Backend Parser] 成功使用 ${modelId} 完成解析。`);
      break; 
    } catch (err: any) {
      lastError = err;
      if (err.message === 'AI_TIMEOUT') {
        console.warn(`[Backend Parser] 型號 ${modelId} 回應超時 (40s)，嘗試下一個型號...`);
        continue;
      }
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Quota exceeded')) {
        console.warn(`[Backend Parser] 型號 ${modelId} 配額耗盡 (429)，嘗試切換備援型號...`);
        continue;
      }
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('not available')) {
        console.warn(`[Backend Parser] 型號 ${modelId} 失敗 (404)，嘗試下一個備援型號...`);
        continue;
      }
      if (err.status === 503 || err.message?.includes('503') || err.message?.includes('Service Unavailable') || err.message?.includes('high demand')) {
        console.warn(`[Backend Parser] 型號 ${modelId} 暫時繁忙 (503)，嘗試下一個備援型號...`);
        continue;
      }
      // 如果是 429 或其他嚴重錯誤，直接拋出
      throw err;
    }
  }

  if (!result) throw lastError || new Error('所有可用 AI 模型均無法處理此請求');

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
