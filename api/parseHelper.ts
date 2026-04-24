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

    // 文本分塊策略 (Chunking)
    const MAX_CHUNK_LENGTH = 15000;
    const textChunks: string[] = [];
    
    // 注意：若帶有 inlineData (如 15MB PDF Base64)，為避免配額爆炸與傳輸過載，不進行分塊，改以強思維鏈深度提取。
    if (text && text.length > MAX_CHUNK_LENGTH && !inlineData) {
      console.log(`[Backend Parser] 文本長度 (${text.length}) 超過閥值，啟動自動切片機制...`);
      for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
        textChunks.push(text.substring(i, i + MAX_CHUNK_LENGTH));
      }
      console.log(`[Backend Parser] 共切分為 ${textChunks.length} 個區塊進行遞迴解析。`);
    } else {
      textChunks.push(text || '');
    }

    let allSpecEntries: any[] = [];
    let finalDocType = fileName.includes('KCG') ? 'Standard' : 'Specific';
    let finalDetectedEq = equipmentName || '未命名設備';
    let finalFullJsonData = {};

    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      const isMultiChunk = textChunks.length > 1;
      
      const prompt = `
        你是一個具備「視覺 OCR 專家級能力」與「採購技術專家」雙重身份的 AI。
        你目前正在解構一份專業的採購規範或技術標準檔案${isMultiChunk ? `的第 ${i + 1}/${textChunks.length} 個切片` : ''}。
        
        **【重要指示：思維鏈強制啟動】**
        為對抗注意力衰退，你必須先在 <thinking> 標籤內逐頁/逐章拆解原始文段落的細節。
        完成思考後，再於 <result> 標籤內輸出最終的 JSON。不准偷懶，不要過度摘要！

        **你的解析策略 (Hybrid Strategy)**：
        1. **深度掃描**：辨識所有表格參數、法規編號、施工要求或驗收標準。
        2. **絕對強制提取與零遺漏政策**：
           - 嚴禁過度摘要。請將每一個獨立的法規條款、技術規格拆解為獨立的 \`specEntries\`。
           - 數量目標：盡可能提取最多細節，通常為 15-40 條。包含具體數值 (mm, kg, %, V 等)。
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
      if (inlineData && i === 0) {
        // inlineData 僅在第一個 Chunk (或唯一 Chunk) 時附帶，避免重複傳輸巨大圖檔
        contents[0].parts.push({ inlineData: inlineData });
      }

      console.log(`[Backend Parser] 正在請求 Gemini 模型解析區塊 ${i + 1}/${textChunks.length}...`);
      const result = await model.generateContent({ contents }).catch(err => {
        // QStash 依賴 HTTP 狀態碼進行退避重試
        // 我們在此確保將 429 向上拋出，讓 worker.ts 返回 500
        console.error(`[Backend Parser] 模型回應錯誤 (可能為 429 配額耗盡):`, err.message);
        throw err; 
      });
      
      const responseText = result.response.text();
      
      if (!responseText) {
        throw new Error('AI 回傳內容為空，可能是安全性過濾或配額耗盡。');
      }

      // 提取 <result> 內的 JSON 內容
      const resultMatch = responseText.match(/<result>([\s\S]*?)<\/result>/);
      let cleanJson = resultMatch ? resultMatch[1] : responseText;
      cleanJson = cleanJson.replace(/```json|```/g, '').trim();
      
      let parsed: any;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (err) {
        // 激進清洗
        cleanJson = cleanJson.replace(/[\x00-\x1F]/g, '').replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
        try {
          parsed = JSON.parse(cleanJson);
        } catch (e2) {
          console.warn('[Backend Parser] 區塊 JSON 解析完全失敗，使用正規表達式備援');
          const entriesMatch = cleanJson.match(/"content":\s*"([^"]+)"/g);
          const backupEntries = entriesMatch ? entriesMatch.map(m => ({ 
            category: '自動擷取', 
            content: m.replace(/"content":\s*"/, '').replace(/"$/, '') 
          })) : [];

          parsed = {
            docType: fileName.includes('KCG') ? 'Standard' : 'Specific',
            specEntries: backupEntries.length > 0 ? backupEntries : [{ category: '文檔摘要', content: cleanJson.substring(0, 1000).replace(/\n/g, ' ') }],
            fullJsonData: { rawText: cleanJson.substring(0, 200) }
          };
        }
      }

      // 合併每個 Chunk 的資料
      if (parsed.docType && parsed.docType !== 'Specific') finalDocType = parsed.docType;
      // 傾向採用 AI 發現的有意義設備名稱
      if (parsed.detectedEquipment && !['', '未命名設備'].includes(parsed.detectedEquipment)) {
        finalDetectedEq = parsed.detectedEquipment;
      }
      if (parsed.specEntries && Array.isArray(parsed.specEntries)) {
        allSpecEntries.push(...parsed.specEntries);
      }
      if (parsed.fullJsonData) {
        finalFullJsonData = { ...finalFullJsonData, ...parsed.fullJsonData };
      }
    }

    // In-memory deduplication & cleaning for the composite entries
    const uniqueItems: any[] = [];
    const seen = new Set();
    
    // 強化最後防線：確保至少有內容
    if (allSpecEntries.length === 0) {
      allSpecEntries = [{ 
        category: '文檔分析總結', 
        content: `(來源: ${fileName}) 此文檔已被處理，內容涵蓋技術規範。請查看原檔獲取詳細資訊。` 
      }];
    }

    for (const item of allSpecEntries) {
      const contentStr = (item.content || '').trim();
      const catStr = (item.category || '技術細節').trim();
      if (!contentStr) continue;
      
      const key = `${catStr}:::${contentStr}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push({ category: catStr, content: contentStr });
      }
    }

    console.log(`[Backend Parser] 檔案 ${fileName} 所有分塊解析完畢，共萃取出 ${uniqueItems.length} 條獨立知識點。`);

    return {
      success: true,
      detectedEquipment: finalDetectedEq,
      docType: finalDocType,
      fullJsonData: finalFullJsonData,
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
