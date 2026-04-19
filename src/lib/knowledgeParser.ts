import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 設定 PDF.js Worker (V9.3: 切換至 unpkg 並修正 v5+ 要求的 .mjs 擴展)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;


export const processFileToKnowledge = async (file: File, apiKey?: string, equipmentName?: string) => {
  const rawKey = apiKey || import.meta.env.VITE_GEMINI_KEY || '';
  const finalKey = rawKey.trim();
  
  if (!finalKey) throw new Error('缺少 Gemini API Key，請在系統設定中輸入。');
  
  if (!finalKey.startsWith('AIza') || finalKey.length < 30) {
    throw new Error("偵測到不正確的 API Key 格式。金鑰通常以 'AIza' 開頭，請檢查您的系統設定。");
  }

  console.log(`[診斷] 金鑰特徵: ${finalKey.substring(0, 4)}...${finalKey.substring(finalKey.length-2)} (長度: ${finalKey.length})`);
  
  // V8.8: 升級至 Gemini 3 Flash 世代，修復 404 報錯
  const modelsToTry = [
    { id: "gemini-3-flash-preview", ver: "v1beta" }, // 最新 Gemini 3 預覽版
    { id: "gemini-2.0-flash", ver: "v1beta" }, 
    { id: "gemini-1.5-flash", ver: "v1beta" }, 
    { id: "gemini-1.5-pro", ver: "v1beta" }
  ];

  console.log(`[解析啟動] 準備執行。優先順序: ${modelsToTry.map(m => m.id).join(' > ')}`);

  const genAI = new GoogleGenerativeAI(finalKey);
  let text = '';
  
  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else if (file.name.endsWith('.doc')) {
    // V9.1: 針對舊版 .doc 的二進位文字勘探 (Binary Scavenging)
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    
    // 試圖從二進位數據中提取可讀字串 (包含 CJK 字元與 ASCII)
    // 雖然會包含雜訊，但 Gemini 的抗噪能力足以處理這些數據
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawContent = decoder.decode(uint8);
    
    // 僅保留可列印字元與常見中文區間
    // 正則表達式：保留中標、英數、標點，過濾大量控制字碼
    text = rawContent.replace(/[^\x20-\x7E\u4E00-\u9FA5\u3000-\u303F\uFF00-\uFFEF]/g, ' ');
    console.log(`[解析輔助] .doc 二進位提取完成，長度: ${text.length}`);
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

  // V8.0: 提示詞升級，強制要求辨識設備名稱
  const prompt = `
    你是一個專業的採購規範專家。請分析以下文字內容，完成兩件事：
    1. 辨別出這份技術規範所描述的「設備主體名稱」(比如：RTO蓄熱式焚化爐、冷卻水塔、高壓變壓器等)。
    2. 從內容中提取「技術要求」並分類。

    分類標準如下：
    - appearance: 外觀、顏色、材質
    - environmental: 環保、節能、廢棄物
    - compliance: 遵守事項、工地規定
    - safety: 安全裝置、防護要求
    - installation: 施工標準、程序要求
    - technical: 特性規格、電氣機構要求
  
    回傳格式：嚴格純 JSON 物件。
    {
      "detectedEquipment": "辨識出的設備名稱",
      "specEntries": [{"category": "類別", "content": "規範文字"}]
    }
    
    內容：
    ${text.substring(0, 5000)}
  `;

  let finalJsonResponse = '';
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const modelConfig of modelsToTry) {
    let retryCount = 0;
    const maxRetries = 2; 

    while (retryCount <= maxRetries) {
      try {
        console.log(`[執行解析] 嘗試機型: ${modelConfig.id} (${modelConfig.ver}) | 剩餘重試: ${maxRetries-retryCount}`);
        const model = genAI.getGenerativeModel({ model: modelConfig.id }, { apiVersion: modelConfig.ver as any });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        if (responseText) {
          finalJsonResponse = responseText;
          break; 
        }
      } catch (err: any) {
        const status = err.status || 0;
        const msg = err.message || "";

        if (status === 429 || msg.includes("429")) {
          retryCount++;
          // V8.6: 指數型退避等待 (10s, 20s, 40s)
          const delay = Math.pow(2, retryCount) * 5000; 
          console.warn(`[配額限制] ${modelConfig.id} 達到頻率上限(429)，將在 ${delay/1000} 秒後進行第 ${retryCount} 次重試...`);
          await wait(delay);
          continue;
        }

        console.warn(`[跳過過] ${modelConfig.id} 無法使用 (${status})，切換下一個機型。`);
        break; 
      }
    }
    if (finalJsonResponse) break; 
  }

  if (!finalJsonResponse) {
    throw new Error("AI 解析服務連線失敗。請確認金鑰權限或稍後再試。");
  }
  
  // 清理 JSON 文字
  const cleanJson = finalJsonResponse.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  
  const detectedEq = parsed.detectedEquipment || equipmentName || '未命名設備';
  const indexData = parsed.specEntries || [];

  if (!supabase) return { added: 0, skipped: 0, detectedEquipment: detectedEq };

  let addedCount = 0;
  let skippedCount = 0;
  
  for (const item of indexData) {
    const { data: existing } = await supabase
      .from('tuc_history_knowledge')
      .select('id')
      .eq('category', item.category)
      .eq('content', item.content)
      .contains('metadata', { equipment_name: detectedEq })
      .maybeSingle();

    if (existing) {
      skippedCount++;
      continue;
    }

    const { error } = await supabase.from('tuc_history_knowledge').insert({
      category: item.category,
      content: item.content,
      source_file_name: file.name,
      metadata: { equipment_name: detectedEq }
    });

    if (!error) addedCount++;
  }
  
  return { added: addedCount, skipped: skippedCount, detectedEquipment: detectedEq };
};

/**
 * 計算加權相似度 (設備名稱 30% / 需求說明 70%)
 * V7.0: 加入「內容聚焦度」係數，讓短且精確的匹配獲得更高分數
 */
export const calculateWeightedSimilarity = (
  content: string, 
  eqKeywords: string = '', 
  reqKeywords: string = ''
) => {
  const tokenize = (str: string) => {
    if (!str) return [];
    return str.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g) || [];
  };

  const calculateOverlap = (tokens: string[], target: string) => {
    if (tokens.length === 0) return 0;
    const uniqueTokens = Array.from(new Set(tokens));
    const matches = uniqueTokens.filter(t => target.toLowerCase().includes(t.toLowerCase())).length;
    
    // 基礎重合率
    const baseScore = matches / uniqueTokens.length;
    
    // 聚焦度係數：如果目標內容非常長但匹配極少，分數應適度衰減
    const targetTokens = tokenize(target);
    const focusPenalty = targetTokens.length > 0 ? Math.min(1, (matches * 5) / targetTokens.length) : 1;
    
    return baseScore * (0.8 + 0.2 * focusPenalty); // 賦予聚焦度 20% 的影響力
  };

  const eqTokens = tokenize(eqKeywords);
  const reqTokens = tokenize(reqKeywords);

  const scoreEq = eqTokens.length > 0 ? calculateOverlap(eqTokens, content) : 1;
  const scoreReq = reqTokens.length > 0 ? calculateOverlap(reqTokens, content) : 1;

  return (scoreEq * 0.3) + (scoreReq * 0.7);
};

export const getHistorySuggestions = async (
  category: string, 
  eqKeywords: string = '', 
  reqKeywords: string = ''
) => {
  if (!supabase) return [];
  
  const { data: candidates, error } = await supabase
    .from('tuc_history_knowledge')
    .select('id, content, source_file_name, metadata')
    .eq('category', category)
    .limit(100)
    .order('created_at', { ascending: false });
    
  if (error || !candidates) {
    console.error('History fetch error:', error);
    return [];
  }

  const scoredData = candidates.map(item => ({
    ...item,
    score: calculateWeightedSimilarity(
      item.content + (item.metadata?.equipment_name || ''), 
      eqKeywords, 
      reqKeywords
    )
  }));

  // V7.0: 嚴格門檻模式，不達 80% 不顯示 (移除保底機制)
  const finalResults = scoredData
    .filter(item => item.score >= 0.8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  return finalResults.map((item) => ({
    id: item.id.toString(),
    content: item.content,
    selected: false,
    source: item.source_file_name
  }));
};
