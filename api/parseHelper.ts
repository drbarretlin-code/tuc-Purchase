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
  docId: string,
  targetLang: string = 'zh-TW'
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  // V17.6: 使用 1.5-flash 以平衡速度與長文本處理能力，適合背景大量處理
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
        
        let file = uploadResponse.file;
        console.log(`[Backend Parser] PDF 上傳成功, URI: ${file.uri}, 正在等待處理...`);
        
        // V17.6: 等待檔案處理完成 (Active 狀態)
        let attempts = 0;
        while (file.state === "PROCESSING" && attempts < 10) {
          await new Promise(r => setTimeout(r, 2000));
          file = await fileManager.getFile(file.name);
          attempts++;
        }
        
        if (file.state !== "ACTIVE") {
          throw new Error(`PDF 檔案處理逾時或失敗: ${file.state}`);
        }
        
        fileUri = file.uri;
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
      你是一個「極致知識挖掘」與「採購技術專家」。你目前正在解構一份專業的採購規範或技術標準檔案。
      你的任務是：**榨乾這份檔案的所有技術價值，絕不遺漏任何技術參數、法規編號、施工要求或驗收標準**。
      
      請依據以下分類邏輯進行深度索引：
         - Specific: 針對特定設備（如 RTO、空壓機、剪床）的專屬規格。
         - Standard: 施工法、材料標準、KCG 編號標準。
         - Global: 法令、環保規章、安全規則。
      
      規則：
      1. 必須挖掘出至少 10-15 條具備技術含量的實體條目。
      2. 內容必須包含原文中的具體數值（如：mm, kg, ℃, %）。
      3. 輸出語言：優先使用「${targetLang}」，但若文檔內容為泰文/英文且包含關鍵技術代碼，請在保持易讀性的前提下忠實呈現。
      
      回傳格式：必須是純粹的 JSON。
      {
        "docType": "Specific | Standard | Global",
        "detectedEquipment": "最相關的設備或工程名稱",
        "specEntries": [
          {"category": "技術要求/安全規範/驗收標準/材料規格...", "content": "精煉後的完整技術條目"}
        ],
        "fullJsonData": { "summary": "文檔整體核心摘要", "keywords": ["關鍵字1", "關鍵字2"] }
      }
      
      待分析內容：
      ${text ? text.substring(0, 30000) : '請深度掃描附件 PDF 並提取所有隱含的技術條目與標準。'}
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
    
    if (!responseText) {
      throw new Error('AI 回傳內容為空，可能是安全性過濾或配額耗盡。');
    }

    let cleanJson = responseText.replace(/```json|```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (err) {
      // 嘗試更激進的清洗
      cleanJson = cleanJson.replace(/[\x00-\x1F]/g, '').replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e2) {
        // 最後手段：從文字中強行擷取
        console.warn('[AI Parser] JSON 解析完全失敗，使用正規表達式備援');
        const entriesMatch = responseText.match(/"content":\s*"([^"]+)"/g);
        const backupEntries = entriesMatch ? entriesMatch.map(m => ({ 
          category: '自動擷取', 
          content: m.replace(/"content":\s*"/, '').replace(/"$/, '') 
        })) : [];

        parsed = {
          docType: fileName.includes('KCG') ? 'Standard' : 'Specific',
          specEntries: backupEntries.length > 0 ? backupEntries : [{ category: '文檔摘要', content: responseText.substring(0, 1000).replace(/\n/g, ' ') }],
          fullJsonData: { rawText: responseText.substring(0, 200) }
        };
      }
    }

    // In-memory deduplication & cleaning
    const uniqueItems: any[] = [];
    const seen = new Set();
    let indexData = parsed.specEntries || [];
    
    // 強化最後防線：確保 specEntries 永遠有內容
    if (!Array.isArray(indexData) || indexData.length === 0) {
      indexData = [{ 
        category: '文檔分析總結', 
        content: `(來源: ${fileName}) 此文檔已被處理，內容涵蓋技術規範。請查看原檔獲取詳細資訊。` 
      }];
    }

    for (const item of indexData) {
      const contentStr = (item.content || '').trim();
      const catStr = (item.category || '技術細節').trim();
      if (!contentStr) continue;
      
      const key = `${catStr}:::${contentStr}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push({ category: catStr, content: contentStr });
      }
    }

    return {
      success: true,
      detectedEquipment: parsed.detectedEquipment || equipmentName || '未命名設備',
      docType: parsed.docType || (fileName.includes('KCG') ? 'Standard' : 'Specific'),
      fullJsonData: parsed.fullJsonData || {},
      entries: uniqueItems.length > 0 ? uniqueItems : [{ category: '檔案摘要', content: `檔案 ${fileName} 已納入索引。` }]
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
