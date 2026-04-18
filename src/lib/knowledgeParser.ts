import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 設定 PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * 測試 API 連通性並檢查可用模型
 */
export const checkGeminiConnectivity = async (apiKey: string) => {
  const finalKey = apiKey.trim();
  if (!finalKey) throw new Error("API Key 為空");
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${finalKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.status === 200) {
      // 提取完整的模型名稱 (例如 models/gemini-1.5-flash)
      const modelNames = data.models?.map((m: any) => m.name.replace('models/', '')) || [];
      return {
        success: true,
        count: modelNames.length,
        models: modelNames,
        message: `連線成功！發現 ${modelNames.length} 個模型：${modelNames.slice(0, 3).join(', ')}...`
      };
    } else {
      return {
        success: false,
        status: response.status,
        message: `連線失敗 (${response.status}): ${data.error?.message || '未知錯誤'}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `網路連線異常: ${err.message}`
    };
  }
};

export const processFileToKnowledge = async (file: File, apiKey?: string, equipmentName?: string) => {
  const rawKey = apiKey || import.meta.env.VITE_GEMINI_KEY || '';
  const finalKey = rawKey.trim();
  
  if (!finalKey) throw new Error('缺少 Gemini API Key，請在系統設定中輸入。');
  
  if (!finalKey.startsWith('AIza') || finalKey.length < 30) {
    throw new Error("偵測到不正確的 API Key 格式。金鑰通常以 'AIza' 開頭，請檢查您的系統設定。");
  }

  console.log(`[診斷] 金鑰特徵: ${finalKey.substring(0, 4)}...${finalKey.substring(finalKey.length-2)} (長度: ${finalKey.length})`);
  
  // V5.6 智慧機型嗅探
  console.log("[智慧探測] 正在動態獲取可用模型清單...");
  const connCheck = await checkGeminiConnectivity(finalKey);
  
  // 優先使用探測到的模型，若探測失敗則使用預設清單
  const discoveredModels = connCheck.success ? connCheck.models.filter((m: string) => m.includes('gemini')) : [];
  const defaultModels = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
  const modelsToTry = discoveredModels.length > 0 ? discoveredModels : defaultModels;

  console.log(`[探測完成] 準備使用 ${modelsToTry.length} 個候選機型執行解析。清單: ${modelsToTry.join(', ')}`);

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
  
    回傳格式：純 JSON 陣列。
    [{"category": "類別名稱", "content": "提取出的單條技術規範文字"}]
    
    內容：
    ${text.substring(0, 5000)}
  `;

  let finalJsonResponse = '';
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const modelId of modelsToTry) {
    const versionsToTry: ('v1' | 'v1beta')[] = ['v1beta', 'v1'];
    let modelSuccess = false;

    for (const apiVer of versionsToTry) {
      let retryCount = 0;
      const maxRetries = 3; // 縮短重試次數，加快切換
      let skipThisVersion = false;

      while (retryCount < maxRetries) {
        try {
          console.log(`[執行解析] 正與 ${modelId} (${apiVer}) 通訊...`);
          const model = genAI.getGenerativeModel({ model: modelId }, { apiVersion: apiVer as any });
          const result = await model.generateContent(prompt);
          finalJsonResponse = result.response.text();
          if (finalJsonResponse) {
            modelSuccess = true;
            break; 
          }
        } catch (err: any) {
          const status = err.status || 0;
          const msg = err.message || "";

          if (status === 429 || msg.includes("429")) {
            retryCount++;
            const delay = 4000;
            console.warn(`[頻控] ${modelId} 忙碌中，等待 ${delay}ms...`);
            await wait(delay);
            continue;
          }

          console.warn(`[跳過] ${modelId} (${apiVer}) 報錯: ${status}`);
          skipThisVersion = true;
          break;
        }
      }
      if (modelSuccess) break;
      if (skipThisVersion) continue;
    }
    if (finalJsonResponse) break; 
  }

  if (!finalJsonResponse) {
    if (connCheck.success && connCheck.count === 0) {
      throw new Error("連線成功但您的 API Key 下找不到任何可用模型。請檢查 Google AI Studio 專案權限。");
    }
    throw new Error("AI 解析服務連線失敗。請確認金鑰權限或稍後再試。");
  }
  
  // 清理 JSON 文字
  const cleanJson = finalJsonResponse.replace(/```json|```/g, '').trim();
  const indexData = JSON.parse(cleanJson);

  if (!supabase) return { added: 0, skipped: 0 };

  let addedCount = 0;
  let skippedCount = 0;
  
  const targetEq = equipmentName || '未命名設備';
  for (const item of indexData) {
    const { data: existing } = await supabase
      .from('tuc_history_knowledge')
      .select('id')
      .eq('category', item.category)
      .eq('content', item.content)
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
