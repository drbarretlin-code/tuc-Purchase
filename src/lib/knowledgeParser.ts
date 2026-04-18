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
  
  if (!finalKey.startsWith('AIza') || finalKey.length < 30) {
    throw new Error("偵測到不正確的 API Key 格式。金鑰通常以 'AIza' 開頭，請檢查您的系統設定。");
  }

  console.log(`[診斷] 金鑰特徵: ${finalKey.substring(0, 4)}...${finalKey.substring(finalKey.length-2)} (長度: ${finalKey.length})`);
  
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

  // 多模型回退與終極連線協議機制 (V5.4 深度診斷版)
  const modelsToTry = [
    "gemini-2.0-flash", 
    "gemini-1.5-pro", 
    "gemini-1.5-flash", 
    "gemini-1.5-flash-8b", 
    "gemini-pro"
  ];
  let finalJsonResponse = '';
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const modelId of modelsToTry) {
    // 冗餘格式嘗試：同時嘗試原始 ID 與帶 models/ 前綴的 ID
    const pathFormats = [modelId, `models/${modelId}`];
    let modelSuccess = false;

    for (const finalId of pathFormats) {
      const versionsToTry: ('v1' | 'v1beta')[] = ['v1beta', 'v1'];
      for (const apiVer of versionsToTry) {
        let retryCount = 0;
        const maxRetries = 5; 
        let skipThisPath = false;

        while (retryCount < maxRetries) {
          try {
            console.log(`[連線中] 嘗試 ${finalId} (${apiVer})...`);
            const model = genAI.getGenerativeModel({ model: finalId }, { apiVersion: apiVer as any });
            const result = await model.generateContent(prompt);
            finalJsonResponse = result.response.text();
            if (finalJsonResponse) {
              modelSuccess = true;
              break; 
            }
          } catch (err: any) {
            const status = err.status || 0;
            const msg = err.message || "";

            // 429 頻率限制
            if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
              retryCount++;
              if (retryCount >= maxRetries) {
                skipThisPath = true;
                break;
              }
              const delay = Math.pow(2, retryCount) * 2000;
              console.warn(`[限流] ${finalId} 繁忙，重試第 ${retryCount} 次...`);
              await wait(delay);
              continue;
            }

            // 404 情形下，嘗試下一路徑格式或版本
            console.warn(`[排除路徑] ${finalId} (${apiVer}) 狀態: ${status}`);
            skipThisPath = true;
            break;
          }
        }
        if (modelSuccess) break;
        if (skipThisPath) continue;
      }
      if (modelSuccess) break;
    }
    if (finalJsonResponse) break; 
  }

  if (!finalJsonResponse) {
    console.error("[核心導航失敗] 掃描了所有模型格局與 2 套協議均無效。這代表 API Key 可能失效或專案未開通。");
    throw new Error("AI 解析服務連線失敗。請確認您的 API Key 是否正確？以及 Google AI Studio 的專案是否正常。");
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
