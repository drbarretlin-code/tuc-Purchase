export interface AIHint {
  section: 'environmental' | 'regulations' | 'safety' | 'acceptance';
  title: string;
  content: string;
  link: string;
}

export const getAIHints = (equipmentName: string, category: string): AIHint[] => {
  // 這裡模擬 AI 即時檢索邏輯，初版根據關鍵字提供預設建議
  const hints: AIHint[] = [
    {
      section: 'environmental',
      title: '環保與能源效率建議',
      content: `針對 ${equipmentName}，建議優先採購具備環保標章或節能標章之產品。需符合「節能減碳設施補助」相關規範。`,
      link: 'https://www.moeaea.gov.tw/ecw/populace/home/Home.aspx'
    },
    {
      section: 'regulations',
      title: '工程類別法規參考',
      content: `此 ${category} 類工程需符合「營造安全衛生設施標準」以及台燿廠內機電工程管理規範。`,
      link: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?PCode=N0060014'
    },
    {
      section: 'safety',
      title: '職業安全衛生法具體細則',
      content: `作業人員需具備相關證照（如特定瓦斯、電氣作業主管），並於施工前完成風險評估與教育訓練。`,
      link: 'https://www.osha.gov.tw/'
    },
    {
      section: 'acceptance',
      title: '驗收重點與關注內容',
      content: `重點檢查防震基座安裝、洩漏檢測機制以及與 PLC 系統整合之訊號正確性。應檢附測試報告與校驗記錄。`,
      link: 'https://www.pcc.gov.tw/'
    }
  ];

  return hints;
};
