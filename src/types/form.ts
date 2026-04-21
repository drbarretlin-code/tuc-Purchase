export type 工程類別 = '新增' | '修繕' | '整改' | '優化' | '購置';

export interface AIHintSelection {
  id: string;
  content: string;
  link?: string;
  selected: boolean;
  source?: string; // 來源檔案名稱
  docType: string; // V12: 新增文檔類型區分 (Specific/Standard/Global)
}

export interface SpecImage {
  id: string;
  url: string; // Base64
  caption: string;
}

export interface TableRowData {
  category: string;
  item: string;
  spec: string;
  method: string;
  samples: string;
  confirmation: string;
}

export interface FormState {
  // 基本資訊
  docId: string; // 隱藏識別碼，用於同步覆蓋校準
  department: string;
  requester: string;
  extension: string;
  
  // 請購項目
  equipmentName: string;
  model: string;
  category: 工程類別;
  
  // 一. 名稱與需求
  requirementDesc: string; // 必填
  requirementDescHistoryHints: AIHintSelection[];
  requirementDescRegHints: AIHintSelection[];
  
  // 二. 品相
  appearance: string;
  appearanceHistoryHints: AIHintSelection[];
  appearanceRegHints: AIHintSelection[];
  
  // 三. 數量與單位
  quantityUnit: string;
  
  // 四. 適用範圍
  equipmentScope: string;
  
  // 五. 適用區間
  rangeRange: string;
  rangeHistoryHints: AIHintSelection[];
  rangeRegHints: AIHintSelection[];
  
  // 六. 設計要求
  envRequirements: string;
  envAIHints: AIHintSelection[];
  envHistoryHints: AIHintSelection[];
  envRegHints: AIHintSelection[];
  
  regRequirements: string;
  regAIHints: AIHintSelection[];
  regHistoryHints: AIHintSelection[];
  regRegHints: AIHintSelection[];
  
  maintRequirements: string;
  maintHistoryHints: AIHintSelection[];
  maintRegHints: AIHintSelection[];
  
  // 七. 安全要求
  safetyRequirements: string;
  safetyAIHints: AIHintSelection[];
  safetyHistoryHints: AIHintSelection[];
  safetyRegHints: AIHintSelection[];
  
  // 八. 特性要求
  elecSpecs: string;
  elecHistoryHints: AIHintSelection[];
  elecRegHints: AIHintSelection[];
  mechSpecs: string;
  mechHistoryHints: AIHintSelection[];
  mechRegHints: AIHintSelection[];
  physSpecs: string;
  physHistoryHints: AIHintSelection[];
  physRegHints: AIHintSelection[];
  relySpecs: string;
  relyHistoryHints: AIHintSelection[];
  relyRegHints: AIHintSelection[];
  customSpec1Name: string;
  customSpec1Value: string;
  customSpec2Name: string;
  customSpec2Value: string;
  
  // 九. 安裝程序
  installStandard: string;
  installAIHints: AIHintSelection[];
  installHistoryHints: AIHintSelection[];
  installRegHints: AIHintSelection[];
  deliveryDate: string;
  workPeriod: string;
  acceptanceDesc: string;
  acceptanceAIHints: AIHintSelection[];
  acceptanceHistoryHints: AIHintSelection[];
  acceptanceRegHints: AIHintSelection[];
  acceptanceExtra: string;
  
  // 十. 遵守事項
  complianceDesc: string;
  complianceAIHints: AIHintSelection[];
  complianceHistoryHints: AIHintSelection[];
  complianceRegHints: AIHintSelection[];
  
  // 十一. 圖說
  images: SpecImage[];
  
  // 十二. 驗收要求表格
  tableData: TableRowData[];

  // 規格確認及會簽
  applicantName: string;
  deptHeadName: string;
  signOffGrid: string[][]; // 3 rows x 6 columns
  searchStatus: Record<string, 'pending' | 'success' | 'no_key' | 'ai_error' | 'empty' | 'none'>;
  matchThresholdHistory: number; // V15: 歷史資料匹配門檻 (0~1)
  matchThresholdReg: number;     // V15: 技術法令匹配門檻 (0~1)
  needsDrawing: 'YES' | 'NO' | ''; // 是否需要檢附圖面
}

export const INITIAL_FORM_STATE: FormState = {
  docId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
  department: localStorage.getItem('tuc_dept') || '',
  requester: '',
  extension: '',
  equipmentName: '',
  model: '',
  category: '新增',
  requirementDesc: '',
  requirementDescHistoryHints: [],
  requirementDescRegHints: [],
  appearance: '',
  appearanceHistoryHints: [],
  appearanceRegHints: [],
  quantityUnit: '',
  equipmentScope: '依請購內容而定',
  rangeRange: '依請購內容而定',
  rangeHistoryHints: [],
  rangeRegHints: [],
  envRequirements: '依台燿規定(承攬商管理規範、承攬商安全衛生管理規則、承攬商作業危害因素告知單等)',
  envAIHints: [],
  envHistoryHints: [],
  envRegHints: [],
  regRequirements: '符合國家法規',
  regAIHints: [],
  regHistoryHints: [],
  regRegHints: [],
  maintRequirements: '依台燿規定',
  maintHistoryHints: [],
  maintRegHints: [],
  safetyRequirements: '設計與安裝符合職業安全衛生法令規範',
  safetyAIHints: [],
  safetyHistoryHints: [],
  safetyRegHints: [],
  elecSpecs: '依台燿規定',
  elecHistoryHints: [],
  elecRegHints: [],
  mechSpecs: '依台燿規定',
  mechHistoryHints: [],
  mechRegHints: [],
  physSpecs: '依台燿規定',
  physHistoryHints: [],
  physRegHints: [],
  relySpecs: '依台燿規定',
  relyHistoryHints: [],
  relyRegHints: [],
  customSpec1Name: '',
  customSpec1Value: '',
  customSpec2Name: '',
  customSpec2Value: '',
  installStandard: `1. PLC以及人機程式修改，施工當天即提供修改前後程式備份
2. PLC程式修改，原則保留原始程式，另新增輔助接點作新舊功能切替使用，達到可快速復原功能
3. 工程依職業安全衛生法令規範作業
4. 工程固定安全衛生管理監工乙員，現場無監工不得作業
5. 工程完工符合人員安全操作及維修方便性，承包商自行評估進來
6. 本案工程以功能符合需求、責任施工，承包商不得追加費用
7. 工程完工設施整體須整齊、美觀、安全。未經核須不得使用葫蘆吊
8. 手閥把手顏色依操作方式裝設。常開(藍色)/常閉(紅色)/調整(黃色)
9. 金屬管、支架屬sus亮面材質
10. 現場施工需維護環境及設備整潔
11. 工程施工每一階段會監工人員查看拍照，未會同造成後續驗收作業問題，承包商自行承擔
12. 工程施工進行符合職業安全衛生法及tuc協力廠商環安衛管理規則，相關作業費用已包含於工程內
13. 施工日期須配合業主許可日期進行
14. 本工程金屬類廢棄物須清運至tuc指定位置，其餘非金屬類廢棄物承包商須負責處理
15. 承包工程當訂單確定後須提供進廠相關資料，如附件內容`,
  installAIHints: [],
  installHistoryHints: [],
  installRegHints: [],
  deliveryDate: '',
  workPeriod: '',
  acceptanceDesc: '完工後會同勘查(須缺失改善完成及運作) 1個月後辦理驗收',
  acceptanceAIHints: [],
  acceptanceHistoryHints: [],
  acceptanceRegHints: [],
  acceptanceExtra: '補充說明',
  complianceDesc: `1. 工程設施驗收後保固一年，工程費用含萬分之7工程保險
2. 施工配合本公司安排日期((不含例假日))，施工期間遇有臨時問題需停工配合本公司安排
3. 有動火,高架,吊掛,危險管路，等特殊作業須作業表單流程核准後方可施工，作業時需有tuc監工人員在場，tuc監工人員未在場施作特殊作業，依規定罰款
4. 施工區域有安全疑慮時，圍出管制作業區域，防止人員車輛進入
5. 液體管路拆卸須使用盛盤承接，造成危害及損壞依價賠償
6. 危害性化學物質作業，須配戴個人防護器具
7. 廠區禁攜帶打火機、砂輪切割機(廠內現場)，廠區內切割使用線鋸機
8. 施工區域標示及警示(以警示帶或圍籬)，區分隔開，夜間裝警示閃光燈
9. 厂內天花板動手過需擦拭乾淨或更新
10. 危險管路拆卸備護目鏡(罩)、膠手套、防護衣、氣密式防毒口罩
11. 施工臨時電線跨走道地面，使用斑馬膠帶黏貼警示
12. 施工當日收工清潔環境並將垃圾載走，違反開單罰款
13. 施工人員進廠全程戴工程帽作業，禁止外籍勞工入廠作業(有內政部核准文件:外籍勞工可移動工作場所，檢覆文件辦理)
14. 進廠人員不得有宿醉或酒氣情況，違者人員須離廠禁止作業
15. 屋頂、侷限空間作業須符合職業安全衛生設施規則，且於施工前3日提出作業申請(附上作業方法及防護器具清冊文件，相關作業儀器須定期第三方檢測合格標章)
16. 電力/電控盤與旋轉/傳動機構張貼警告標語
17. 因本工程造成設施(備)損(傷)壞須賠償。`,
  complianceAIHints: [],
  complianceHistoryHints: [],
  complianceRegHints: [],
  images: [],
  tableData: [
    { category: '功能', item: '運轉測試', spec: 'NA', method: 'NA', samples: 'NA', confirmation: 'NA' },
    { category: '品質', item: '外觀檢驗', spec: 'NA', method: 'NA', samples: 'NA', confirmation: 'NA' },
    { category: '產能', item: '出力測速', spec: 'NA', method: 'NA', samples: 'NA', confirmation: 'NA' },
  ],
  applicantName: '',
  deptHeadName: '',
  signOffGrid: Array(3).fill(null).map(() => Array(6).fill('')),
  searchStatus: {},
  matchThresholdHistory: 0.6,
  matchThresholdReg: 0.2,
  needsDrawing: ''
};
