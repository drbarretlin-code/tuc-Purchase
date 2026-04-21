import type { Language } from '../lib/i18n';
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
  searchStatus: Record<string, 'pending' | 'translating' | 'success' | 'no_key' | 'ai_error' | 'empty' | 'none'>;
  matchThresholdHistory: number; // V15: 歷史資料匹配門檻 (0~1)
  matchThresholdReg: number;     // V15: 技術法令匹配門檻 (0~1)
  needsDrawing: 'YES' | 'NO' | ''; // 是否需要檢附圖面
  language: Language; // V16: 全域語系設定
}

export const INITIAL_FORM_STATE: FormState = {
  language: (localStorage.getItem('tuc_ui_lang') as Language) || 'zh-TW',
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
  equipmentScope: 'defaultDependingOnProcurement',
  rangeRange: 'defaultDependingOnProcurement',
  rangeHistoryHints: [],
  rangeRegHints: [],
  envRequirements: 'defaultAccordingToTuc',
  envAIHints: [],
  envHistoryHints: [],
  envRegHints: [],
  regRequirements: 'defaultNationalRegs',
  regAIHints: [],
  regHistoryHints: [],
  regRegHints: [],
  maintRequirements: 'defaultAccordingToTucShort',
  maintHistoryHints: [],
  maintRegHints: [],
  safetyRequirements: 'defaultSafetyRegs',
  safetyAIHints: [],
  safetyHistoryHints: [],
  safetyRegHints: [],
  elecSpecs: 'defaultAccordingToTucShort',
  elecHistoryHints: [],
  elecRegHints: [],
  mechSpecs: 'defaultAccordingToTucShort',
  mechHistoryHints: [],
  mechRegHints: [],
  physSpecs: 'defaultAccordingToTucShort',
  physHistoryHints: [],
  physRegHints: [],
  relySpecs: 'defaultAccordingToTucShort',
  relyHistoryHints: [],
  relyRegHints: [],
  customSpec1Name: '',
  customSpec1Value: '',
  customSpec2Name: '',
  customSpec2Value: '',
  installStandard: 'defaultInstallStd',
  installAIHints: [],
  installHistoryHints: [],
  installRegHints: [],
  deliveryDate: '',
  workPeriod: '',
  acceptanceDesc: 'defaultAcceptance',
  acceptanceAIHints: [],
  acceptanceHistoryHints: [],
  acceptanceRegHints: [],
  acceptanceExtra: 'defaultAcceptanceExtra',
  complianceDesc: 'defaultCompliance',
  complianceAIHints: [],
  complianceHistoryHints: [],
  complianceRegHints: [],
  images: [],
  tableData: [
    { category: 'defaultTblFunctional', item: 'defaultTblRuntest', spec: 'NA', method: 'NA', samples: 'NA', confirmation: 'NA' },
    { category: 'defaultTblQuality', item: 'defaultTblAppearance', spec: 'NA', method: 'NA', samples: 'NA', confirmation: 'NA' },
    { category: 'defaultTblCapacity', item: 'defaultTblOutput', spec: 'NA', method: 'NA', samples: 'NA', confirmation: 'NA' },
  ],
  applicantName: '',
  deptHeadName: '',
  signOffGrid: Array(3).fill(null).map(() => Array(6).fill('')),
  searchStatus: {},
  matchThresholdHistory: 0.6,
  matchThresholdReg: 0.2,
  needsDrawing: ''
};

export const BOILERPLATE_KEYS = [
  'defaultDependingOnProcurement',
  'defaultAccordingToTuc',
  'defaultAccordingToTucShort',
  'defaultNationalRegs',
  'defaultSafetyRegs',
  'defaultInstallStd',
  'defaultAcceptance',
  'defaultAcceptanceExtra',
  'defaultCompliance',
  'defaultTblFunctional',
  'defaultTblQuality',
  'defaultTblCapacity',
  'defaultTblRuntest',
  'defaultTblAppearance',
  'defaultTblOutput'
];
