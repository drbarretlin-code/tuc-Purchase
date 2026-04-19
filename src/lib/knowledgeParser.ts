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
  
  // V7.1: 優化模型列表與版本對應，解決 404 與 429 頻發問題
  const modelsToTry = [
    { id: "gemini-2.0-flash", ver: "v1beta" }, // 2.0 目前主要在 v1beta
    { id: "gemini-1.5-flash", ver: "v1" },      // 1.5 已進入 v1 穩定版
    { id: "gemini-1.5-pro", ver: "v1" }
  ];

  console.log(`[解析啟動] 準備執行。優先順序: ${modelsToTry.map(m => m.id).join(' > ')}`);

  const genAI = new GoogleGenerativeAI(finalKey);
  // ... (text extraction logic remains same)

  // ... (prompt definition remains same)

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

        // 處理頻率限制：429
        if (status === 429 || msg.includes("429")) {
          retryCount++;
          const delay = 5000 + (retryCount * 2000); // 指數退避
          console.warn(`[頻控] ${modelConfig.id} 配額滿載，等待 ${delay}ms 後重試...`);
          await wait(delay);
          continue;
        }

        // 處理模型不支援或 404
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
