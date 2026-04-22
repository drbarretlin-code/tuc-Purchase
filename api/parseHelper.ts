import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function processFileBackend(
  fileBuffer: ArrayBuffer, 
  fileName: string, 
  apiKey: string, 
  equipmentName: string, 
  docId: string
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Auto select model logic simplified for backend (always use 1.5 flash for stability & context window)
  const modelId = 'gemini-1.5-flash';
  const model = genAI.getGenerativeModel({ model: modelId });

  let text = '';
  let inlineData: { data: string, mimeType: string } | null = null;
  let fileUri: string | null = null;

  try {
    if (fileName.toLowerCase().endsWith('.docx')) {
      const resp = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
      text = resp.value;
    } else if (fileName.toLowerCase().endsWith('.pdf')) {
      // PDF handling: Use Google AI File Manager to handle large PDFs (up to 30MB)
      const fileManager = new GoogleAIFileManager(apiKey);
      const tmpFilePath = path.join(os.tmpdir(), `${docId}_${Date.now()}.pdf`);
      
      // Write to temp file
      fs.writeFileSync(tmpFilePath, Buffer.from(fileBuffer));
      
      try {
        console.log(`[Backend Parser] 上傳 PDF 至 Gemini File Manager: ${fileName}`);
        const uploadResponse = await fileManager.uploadFile(tmpFilePath, {
          mimeType: "application/pdf",
          displayName: fileName,
        });
        fileUri = uploadResponse.file.uri;
        console.log(`[Backend Parser] PDF 上傳成功, URI: ${fileUri}`);
      } finally {
        // Clean up temp file
        if (fs.existsSync(tmpFilePath)) {
          fs.unlinkSync(tmpFilePath);
        }
      }
    } else {
      // Fallback binary extraction for .doc and others
      text = extractStringsFromBinary(fileBuffer);
    }

    if (!text && !fileUri) throw new Error('無法擷取檔案內容');

    const prompt = `
      你是一個「全方位知識挖掘與解構」專家。目前你正在處理一份採購規格檔案。
      你的終極任務是：完整利用並解構每一條知識資訊，絕對不允許漏掉任何具備參考價值的文字。

      請針對給定的文件，執行深度挖掘（Deep Mining）：
      1. 語意切片 (Semantic Chunking)：利用語意邏輯將內容切分為獨立的「知識點」。
      2. 知識層級 (docType)：Specific (專屬機台), Standard (跨設備標準), Global (法規)。
      3. 設備主體 (detectedEquipment)：精確辨識或根據上下文推斷。
      4. 強制條列化：將所有挖掘到的內容轉化為 specEntries。嚴禁回傳空陣列。若內容貧乏，請以「文檔段落總結」形式提供。
      
      回傳格式：嚴格純 JSON。
      {
        "docType": "Specific | Standard | Global",
        "detectedEquipment": "辨識出的設備名稱",
        "specEntries": [{"category": "知識類別", "content": "詳細內容"}],
        "fullJsonData": { ...設備名稱、需求描述、規格等... }
      }
      
      ${text ? `分析內容：\n${text.substring(0, 30000)}` : '請直接分析附加的 PDF 檔案內容。'}
    `;

    const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
    if (fileUri) {
      contents[0].parts.push({
        fileData: {
          mimeType: "application/pdf",
          fileUri: fileUri
        }
      });
    }

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();
    
    let cleanJson = responseText.replace(/```json|```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (err) {
      cleanJson = cleanJson.replace(/[\x00-\x1F]/g, '').replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e2) {
        parsed = {
          docType: 'Specific',
          specEntries: [{ category: '解析錯誤', content: responseText.substring(0, 500) }],
          fullJsonData: {}
        };
      }
    }

    // In-memory deduplication
    const uniqueItems: any[] = [];
    const seen = new Set();
    const indexData = parsed.specEntries || [];
    
    // 如果 AI 回傳空陣列，啟動最後防線
    if (indexData.length === 0) {
      indexData.push({ 
        category: '文檔核心摘要', 
        content: `(文檔來源: ${fileName}) 擷取內容可能過短或為純圖檔。` 
      });
    }

    for (const item of indexData) {
      const contentStr = item.content || '無內容摘要';
      const catStr = item.category || '未分類';
      const key = `${catStr}:::${contentStr}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push({ category: catStr, content: contentStr });
      }
    }

    return {
      success: true,
      detectedEquipment: parsed.detectedEquipment || equipmentName || '未命名設備',
      docType: parsed.docType,
      fullJsonData: parsed.fullJsonData || {},
      entries: uniqueItems
    };

  } catch (error: any) {
    console.error('[Backend Parser Error]', error);
    throw error;
  }
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
