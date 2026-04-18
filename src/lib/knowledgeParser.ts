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
    // 使用 REST 直接獲取模型列表，這是最權威的權限診斷方式
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${finalKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.status === 200) {
      const modelNames = data.models?.map((m: any) => m.name.replace('models/', '')) || [];
      return {
        success: true,
        count: modelNames.length,
        models: modelNames,
        message: `連線成功！共發現 ${modelNames.length} 個可用模型。`
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
      message: `網路請求錯誤: ${err.message}`
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

  // 多模型回退與終極連線協議機制 (V5.5 診斷修復版)
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
    // 修正 V5.4 的冗餘 bug，恢復單一路徑格式，SDK 會自動處理前綴
    const versionsToTry: ('v1' | 'v1beta')[] = ['v1beta', 'v1'];
    let modelSuccess = false;

    for (const apiVer of versionsToTry) {
      let retryCount = 0;
      const maxRetries = 5; 
      let skipThisVersion = false;

      while (retryCount < maxRetries) {
        try {
          console.log(`[解析中] 正在嘗試模型: ${modelId} (${apiVer})...`);
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

          // 429 頻率限制
          if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
            retryCount++;
            if (retryCount >= maxRetries) {
              skipThisVersion = true;
              break;
            }
            const delay = Math.pow(2, retryCount) * 2000;
            console.warn(`[頻控] ${modelId} 限流，等待 ${delay}ms...`);
            await wait(delay);
            continue;
          }

          // 404 或其他錯誤
          console.warn(`[無效] ${modelId} (${apiVer}) 狀態: ${status}`);
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
    console.error("[核心導航失敗] 掃描了 5 個備援模型均回報不可用。這通常與 API Key 的權限或 Google 服務配額有關。");
    throw new Error("AI 解析服務連線失敗。請確認您的 API Key 是否正確？以及專案是否已在 Google AI Studio 開通。");
  }
  
  // 簡單清理 JSON 字符串
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
