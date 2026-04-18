import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 設定 PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const processFileToKnowledge = async (file: File, apiKey?: string, equipmentName?: string) => {
  const rawKey = apiKey || import.meta.env.VITE_GEMINI_KEY || '';
  const finalKey = rawKey.trim();
  
  if (!finalKey) throw new Error('缺少 Gemini API Key，請在系統設定中輸入。');
  
  const genAI = new GoogleGenerativeAI(finalKey);
  let text = '';
  
  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
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
    你是一個專業的採購規範專家。請分析以下文字內容，從中提取「技術要求」並將其分類。
    分類標準如下：
    - appearance: 外觀、顏色、材質
    - environmental: 環保、節能、廢棄物
    - compliance: 遵守事項、工地規定
    - safety: 安全裝置、防護要求
    - installation: 施工標準、程序要求
    - technical: 特性規格、電氣機構要求

    請回傳 JSON 格式陣列，結構如下：
    [{"category": "類別名稱", "content": "提取出的單條技術規範文字"}]
    
    待處理內容：
    ${text.substring(0, 5000)}
  `;

  // 多模型回退與終極頻率限制重試機制 (V4.8)
  const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
  let finalJsonResponse = '';
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const modelId of modelsToTry) {
    let retryCount = 0;
    const maxRetries = 5; // 提升重試極限
    let fallbackNeeded = false;

    while (retryCount < maxRetries) {
      try {
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(prompt);
        finalJsonResponse = result.response.text();
        break; 
      } catch (err: any) {
        const status = err.status || 0;
        const msg = err.message || "";

        // 如果是 429 頻率限制，執行更深度的指數退避重試
        if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
          retryCount++;
          // 指數退避 sequence: 4s, 8s, 16s, 32s, 64s
          const delay = Math.pow(2, retryCount) * 2000;
          console.warn(`[深度重試] 模型 ${modelId} 觸發頻率限制，將在 ${delay}ms 後進行第 ${retryCount}/5 次嘗試...`);
          await wait(delay);
          continue;
        }

        // 只有 404 或明確的模型錯誤才進行 Fallback
        if (status === 404 || msg.includes("404") || msg.includes("not found")) {
          console.warn(`[跳轉] 模型 ${modelId} 不存在 (404)，嘗試切換下一個模型...`);
          fallbackNeeded = true;
          break;
        }

        // 其他嚴重錯誤
        if (modelId === modelsToTry[modelsToTry.length - 1]) throw err;
        fallbackNeeded = true;
        break;
      }
    }

    if (finalJsonResponse) break; 
    if (!fallbackNeeded) break; 
  }

  if (!finalJsonResponse) {
    throw new Error("AI 解析服務暫時無法使用，請檢查 API Key 或稍後再試。");
  }
  
  // 簡單清理 JSON 字符串
  const cleanJson = finalJsonResponse.replace(/```json|```/g, '').trim();
  const indexData = JSON.parse(cleanJson);

  if (!supabase) return { added: 0, skipped: 0 };

  let addedCount = 0;
  let skippedCount = 0;
  
  // 逐條檢查重複
  const targetEq = equipmentName || '未命名設備';
  for (const item of indexData) {
    const { data: existing } = await supabase
      .from('tuc_history_knowledge')
      .select('id')
      .eq('category', item.category)
      .eq('content', item.content)
      // 使用現有的 metadata 欄位來存放並檢查設備名稱，確保去重精準度
      .contains('metadata', { equipment_name: targetEq })
      .maybeSingle();

    if (existing) {
      skippedCount++;
      continue;
    }

    const { error } = await supabase.from('tuc_history_knowledge').insert({
      category: item.category,
      content: item.content,
      source_file_name: file.name,
      metadata: { equipment_name: targetEq }
    });

    if (!error) addedCount++;
  }
  
  return { added: addedCount, skipped: skippedCount };
};

export const getHistorySuggestions = async (category: string) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tuc_history_knowledge')
    .select('content, source_file_name')
    .eq('category', category)
    .limit(5);
    
  if (error) return [];
  return data.map((item, idx) => ({
    id: `hist-${idx}`,
    content: item.content,
    selected: false,
    source: item.source_file_name
  }));
};
