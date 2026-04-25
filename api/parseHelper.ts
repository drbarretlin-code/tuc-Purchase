import { GoogleGenerativeAI } from "@google/generative-ai";
import * as mammoth from 'mammoth';

export async function getFileChunks(
  fileBuffer: ArrayBuffer, 
  fileName: string
) {
  let text = '';
  let inlineData: { data: string, mimeType: string } | null = null;

  if (fileName.toLowerCase().endsWith('.docx')) {
    const resp = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
    text = resp.value;
  } else if (fileName.toLowerCase().endsWith('.pdf')) {
    // 嘗試提取文字層
    try {
      console.log(`[Backend Parser] 啟動 PDF 文字層提取: ${fileName}`);
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
      const maxPages = Math.min(pdf.numPages, 30);
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          pdfText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        } catch (pageErr) { }
      }
      text = pdfText.trim();
    } catch (pdfErr: any) {
      console.warn(`[Backend Parser] PDF 文字提取完全失敗 (將使用純視覺模式): ${pdfErr.message}`);
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

  // 文本分塊策略 (極致切片)
  const MAX_CHUNK_LENGTH = 3000;
  const textChunks: string[] = [];
  
  if (text && text.length > MAX_CHUNK_LENGTH && !inlineData) {
    for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
      textChunks.push(text.substring(i, i + MAX_CHUNK_LENGTH));
    }
  } else {
    textChunks.push(text || '');
  }

  return { textChunks, inlineData };
}

export async function processSingleChunkBackend(
  chunkText: string,
  isMultiChunk: boolean,
  chunkIndex: number,
  totalChunks: number,
  fileName: string,
  inlineData: any,
  apiKey: string,
  targetLang: string = 'zh-TW'
) {
  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
    你是一個具備「視覺 OCR 專家級能力」與「採購技術專家」雙重身份的 AI。
    你目前正在解構一份專業的採購規範或技術標準檔案${isMultiChunk ? `的第 ${chunkIndex + 1}/${totalChunks} 個切片` : ''}。
    
    **【重要指示：思維鏈強制啟動】**
    為對抗注意力衰退，你必須先在 <thinking> 標籤內逐頁/逐章拆解原始文段落的細節。
    完成思考後，再於 <result> 標籤內輸出最終的 JSON。不准偷懶，不要過度摘要！

    **你的解析策略 (Hybrid Strategy)**：
    1. **深度掃描**：辨識所有表格參數、法規編號、施工要求或驗收標準。
    2. **絕對強制提取與零遺漏政策**：
       - 嚴禁過度摘要。請將每一個獨立的法規條款、技術規格拆解為獨立的 \`specEntries\`。
       - 數量目標：盡可能提取最多細節，包含具體數值 (mm, kg, %, V 等)。
    3. 輸出語言：優先使用「${targetLang}」。
    
    回傳格式：必須包含 <thinking> 與 <result> 標籤。
    <thinking>
    在此處寫下逐章節拆解的過程與找到的關鍵參數...
    </thinking>
    
    <result>
    {
      "docType": "Specific | Standard | Global",
      "detectedEquipment": "最相關的設備或工程名稱",
      "specEntries": [
        {"category": "技術要求/安全規範/驗收標準/材料規格...", "content": "精煉後的完整技術條目"}
      ],
      "fullJsonData": { "summary": "此切片片段的核心摘要", "keywords": ["關鍵字1", "關鍵字2"] }
    }
    </result>
    
    待分析內容：
    ${chunkText ? chunkText.substring(0, 150000) : '純視覺掃描模式（無可提取文字層）。'}
  `;

  const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
  if (inlineData && chunkIndex === 0) {
    contents[0].parts.push({ inlineData: inlineData });
  }

  const modelsToTry = [
    'gemini-2.5-flash', 
    'gemini-2.5-pro', 
    'gemini-2.0-flash-001', 
    'gemini-flash-latest'
  ];
  let result: any;
  let lastError: any;

  for (const modelId of modelsToTry) {
    try {
      console.log(`[Backend Parser] 嘗試使用 ${modelId} 解析 ${fileName} 切片 ${chunkIndex + 1}/${totalChunks}...`);
      const currentModel = genAI.getGenerativeModel({ model: modelId });
      result = await currentModel.generateContent({ contents });
      console.log(`[Backend Parser] 成功使用 ${modelId} 完成解析。`);
      break; 
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('not available')) {
        console.warn(`[Backend Parser] 型號 ${modelId} 失敗 (404)，嘗試下一個備援型號...`);
        continue;
      }
      // 如果是 429 或其他非 404 錯誤，直接拋出，不執行降級（交由 QStash 重試）
      throw err;
    }
  }

  if (!result) {
    throw lastError || new Error('所有備援模型皆不可用。');
  }
  
  const responseText = result.response.text();
  if (!responseText) {
    throw new Error('AI 回傳內容為空，可能是安全性過濾或配額耗盡。');
  }

  const resultMatch = responseText.match(/<result>([\s\S]*?)<\/result>/);
  let cleanJson = resultMatch ? resultMatch[1] : responseText;
  cleanJson = cleanJson.replace(/\`\`\`json|\`\`\`/g, '').trim();
  
  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    cleanJson = cleanJson.replace(/[\x00-\x1F]/g, '').replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e2) {
      console.warn('[Backend Parser] 區塊 JSON 解析完全失敗，使用正規備援');
      const entriesMatch = cleanJson.match(/"content":\s*"([^"]+)"/g);
      const backupEntries = entriesMatch ? entriesMatch.map(m => ({ 
        category: '自動擷取', 
        content: m.replace(/"content":\s*"/, '').replace(/"$/, '') 
      })) : [];

      parsed = {
        docType: fileName.includes('KCG') ? 'Standard' : 'Specific',
        specEntries: backupEntries.length > 0 ? backupEntries : [],
        fullJsonData: {}
      };
    }
  }

  return parsed;
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
