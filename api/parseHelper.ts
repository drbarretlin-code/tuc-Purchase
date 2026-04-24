import { GoogleGenerativeAI } from "@google/generative-ai";
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
  // V19.5: 升級至 2.0-flash 以獲得更強的邏輯解析與長文本細節提取能力
  const modelId = 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({ model: modelId });

  let text = '';
  let inlineData: { data: string, mimeType: string } | null = null;
  let fileUri: string | null = null;

  try {
    if (fileName.toLowerCase().endsWith('.docx')) {
      const resp = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
      text = resp.value;
    } else if (fileName.toLowerCase().endsWith('.pdf')) {
      // V20.1: 強化混合動力解析的容錯性
      try {
        // 嘗試提取文字層，若失敗則僅記錄警告但不中斷流程
        console.log(`[Backend Parser] 啟動 PDF 文字層提取: ${fileName}`);
        // @ts-ignore - 避開 Vercel 環境下的模組解析警告
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
        const loadingTask = pdfjsLib.getDocument({ 
          data: new Uint8Array(fileBuffer),
          useSystemFonts: true,
          disableFontFace: true,
          isEvalSupported: false
        });
        
        const pdf = await loadingTask.promise;
        let pdfText = '';
        const maxPages = Math.min(pdf.numPages, 30); // 稍微調降頁數以確保穩定性
        
        for (let i = 1; i <= maxPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            pdfText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
          } catch (pageErr) {
            console.warn(`[Backend Parser] PDF Page ${i} 提取失敗:`, pageErr);
          }
        }
        text = pdfText.trim();
        console.log(`[Backend Parser] PDF 文字層提取完成，長度: ${text.length}`);
      } catch (pdfErr: any) {
        // 重要：文字提取失敗僅作為警告，不拋出錯誤，讓流程繼續走視覺路徑
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
      // Fallback binary extraction for .doc and others
      text = extractStringsFromBinary(fileBuffer);
    }

    if (!text && !inlineData) throw new Error('無法擷取檔案內容');

    const prompt = `
      你是一個具備「視覺 OCR 專家級能力」與「採購技術專家」雙重身份的 AI。
      你目前正在解構一份專業的採購規範或技術標準檔案。
      
      **你的解析策略 (Hybrid Strategy)**：
      1. **視覺比對**：請深度掃描附件 PDF 的每一頁。辨識所有表格、圖形、標註以及文字排列。
      2. **文字對照**：我會提供從檔案中提取出的原始文字內容（若有），請結合視覺佈局，確保即使是表格中的細小參數也能精準對應。
      3. **OCR 模式啟動**：若檔案是掃描圖檔，請發動最強的視覺辨識能力，將所有模糊或手寫內容轉譯。

      你的任務是：**榨乾這份檔案的所有技術價值，絕不遺漏任何技術參數、法規編號、施工要求或驗收標準**。
      
      請依據以下分類邏輯進行深度索引：
         - Specific: 針對特定設備（如 RTO、空壓機、剪床）的專屬規格。
         - Standard: 施工法、材料標準、KCG 編號標準。
         - Global: 法令、環保規章、安全規則。
      
      **絕對強制提取與零遺漏政策**：
      1. **嚴禁過度摘要**。請將每一個獨立的法規條款、技術規格或性能指標拆解為獨立的條目。
      2. 對於長篇文件，請務必產出與原文長度成比例的條目數量（**目標 20-50 條**），確保技術細節不被遺漏。
      3. 內容必須包含原文中的具體數值（如：mm, kg, ℃, %, V, kW 等）。
      4. 輸出語言：優先使用「${targetLang}」，但若文檔內容為泰文/英文且包含關鍵技術代碼，請在保持易讀性的前提下忠實呈現。
      
      回傳格式：必須是純粹的 JSON。
      {
        "docType": "Specific | Standard | Global",
        "detectedEquipment": "最相關的設備或工程名稱",
        "specEntries": [
          {"category": "技術要求/安全規範/驗收標準/材料規格...", "content": "精煉後的完整技術條目"}
        ],
        "fullJsonData": { "summary": "文檔整體核心摘要", "keywords": ["關鍵字1", "關鍵字2"] }
      }
      
      待分析內容 (文字層)：
      ${text ? text.substring(0, 150000) : '純視覺掃描模式（無可提取文字層）。'}
    `;

    const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
    if (inlineData) {
      contents[0].parts.push({
        inlineData: inlineData
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
