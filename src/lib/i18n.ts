export const translations: Record<string, any> = {
  'zh-TW': {
    'systemTitle': '採購驗收規範建置表',
    'langName': '繁體中文',
    'settings': '系統設定',
    'userManual': '操作說明',
    'viewManual': '檢視手冊',
    'export': '匯出檔案',
    'import': '上傳資料庫',
    'history': '儀表板',

    'officialPreview': '規格校正區',
    'sidebarTitle': '功能選單',
    'sidebarSubtitle': 'TUC 規範產生器',
    'tabBasic': '基本資訊',
    'sectionBasicHeader': '專案基本資訊',
    'tabHardware': '技術規格',
    'tabConstruction': '安裝標準',
    'tabDrawings': '圖面表格',
    'tabSignOff': '會簽與核准',
    'dept': '申購單位',
    'requester': '申購人',
    'ext': '分機',
    'equipName': '設備名稱',
    'model': '型號 (Model)',
    'category': '採購類別',
    'reqDesc': '需求說明',
    'appearance': '品相要求',
    'quantity': '數量單位',
    'scope': '適用範圍',
    'envReq': '環境要求',
    'regReq': '法現要求',
    'maintReq': '維護要求',
    'safetyReq': '安全要求',
    'elecSpec': '電力特性',
    'mechSpec': '機械特性',
    'physSpec': '物理特性',
    'relySpec': '可靠度要求',
    'installStd': '安裝標準',
    'deliveryDate': '交貨日期',
    'workPeriod': '施工天數',
    'acceptanceDesc': '驗收描述',
    'compliance': '遵守事項',
    'contractorNotice': '廠商注意事項',
    'drawings': '是否提供圖面',
    'tabHardwareTitle': '技術規格與設計要求',
    'tabConstructionTitle': '安裝程序與法規遵循',
    'tabDrawingsTitle': '工程圖面與驗收表格',
    'tabSignOffTitle': '規格確認與電子簽名',
    'signOffGrid': '簽核表格區域',
    'deptCode': '單位',
    'signOff': '簽名欄',
    'chooseDept': '選擇單位',
    'dept_Production': '生產部',
    'dept_Engineering': '工程部',
    'dept_Safety': '工安部',
    'dept_Equipment': '設備部',
    'dept_Quality': '品保部',
    'dept_RD': '研發部',
    'dept_PRD': 'PRD',
    'dept_Purchasing': '採購部',
    'safetyContent': '安全規範細節',
    'finishDate': '完工日期',
    'workPeriodDays': '天數 (Days)',
    'tableAcceptance': '驗收描述表格',
    'manager': '直屬主管',
    
    'catNew': '新增',
    'catRepair': '修繕',
    'catRenovate': '整改',
    'catOptimize': '優化',
    'catPurchase': '購置',
    'fileOptions': '檔案操作選項',
    'downloadJson': '下載規範 JSON',
    'importCloud': '從雲端載入',
    'loadLocal': '載入本地 JSON',
    'aiHistory': '參考 TUC 歷史規範',
    'aiReg': '法規與業界標準',
    'aiGen': 'AI 全新生成',
    'translating': 'AI 翻譯同步中...',
    'noHints': '暫無 AI 建議',
    'thresholdHistory': '歷史資料匹配門檻',
    'thresholdReg': '法規標準匹配門檻',
    'aiAnalyzeRange': '開始分析此區塊',
    'aiGenerating': 'AI 生成中...',
    'aiAbort': '停止生成',
    'save': '儲存',
    'reset': '重置',
    'delete': '刪除',
    'batchDelete': '批次刪除',
    'regenerate': '重新生成',
    'confirm': '確認',
    'cancel': '取消',
    'yes': '是',
    'no': '否',
    'rangeRange': '適用區間',
    'deptLabel': '申請單位',
    'applicantLabel': '申請人員',
    'extLabel': '分機',
    'validationComplete': '✅ 規範編校完成',
    'syncDescription': '您可以點擊下方按鈕將此份規範同步至雲端知識庫。<br/>系統將自動執行 AI 標籤校準，並根據文件隱碼覆蓋舊有資料。',
    'finalizeSync': '完稿並同步至知識庫',
    'syncing': '同步中，請稍候...',
    'success': '成功',
    'error': '錯誤',
    'prev': '上一步',
    'next': '下一步',
    'page': '頁數',
    'section': '章節',
    'parsedCount': '已解析',
    'viewFull': '開新分頁檢視',
    'invalidJson': '無效的 JSON 檔案',
    'confirmReset': '確定要清除所有欄位並恢復預設完整版面嗎？(此操作不可還原)',
    'resetSuccess': '✅ 資料已重置為預設狀態',
    'syncErrorReq': '請至少填寫設備名稱與需求說明再進行同步。',
    'syncSuccessBatch': '✅ 同步成功！已更新 {n} 條技術條文至知識庫。 (隱碼: {id}...)',
    'syncFail': '❌ 同步失敗:',
    'dbClean': '目前資料庫非常整潔，未偵測到任何重複檔案。',
    'cleanSuccess': '清理完成！已移除 {n} 筆重複紀錄。',
    'cleanError': '清理過程發生錯誤:',
    'tagUpdateFail': '標籤更新失敗:',
    'confirmCalibrate': '系統將分析全課檔案內容，自動辨別並校準正確的「設備標籤」。\n這將修正如「大明剪床」被誤植至 RTO 等錯誤關聯，確定執行嗎？',
    'deleteRecord': '刪除紀錄',
    'exportPdf': '匯出 PDF',
    'itemsSuffix': '條',
    'resourceUsage': '資源水位預警',
    'knowledgeEntries': '知識庫條目數 (筆)',
    'storageFiles': '儲存空間總量',
    'safeLimit': '安全水位 (免費額度)',
    'warningHighUsage': '⚠️ 警告：資源使用量已接近免費額度上限，請及時清理重複或老舊檔案。',
    'cleanupLargeFiles': '清理大檔案',
    'sizeLimitLabel': '刪除大於',
    'confirmDeleteLarge': '您確定要刪除所有大於 {n} MB 的檔案嗎？\n(系統偵測到共計 {count} 個檔案)',

    // Boilerplate Defaults
    'defaultDependingOnProcurement': '依請購內容而定',
    'defaultAccordingToTuc': '依台燿規定',
    'defaultAccordingToTucShort': '依台燿規定',
    'defaultNationalRegs': '符合國家法規',
    'defaultSafetyRegs': '依台燿規定',
    'defaultInstallStd': `1. PLC以及人機程式修改，施工當天即提供修改前後程式備份
2. PLC程式修改，原則保留原始程式，另新增輔助接點作新舊功能切替使用，達到可快速復原功能
3. 工程依職業安全衛生法令規範作業
4. 工程固定安全衛生管理監工乙員，現場無監工不得作業
5. 工程完工符合人員安全操作及維修方便性，承包商自行評估進來
6. 本案工程以功能符合需求、責任施工，承包商不得追加費用
7. 工程完工設施整體須整齊、美觀、安全。未經核須不得使用葫蘆吊
8. 手閥把手顏色依操作方式裝設。常開(藍色)/常閉(紅色)/調整(黃色)
9. 金屬管、支架屬SUS亮面材質
10. 現場施工需維護環境及設備整潔
11. 工程施工每一階段會監工人員查看拍照，未會同造成後續驗收作業問題，承包商自行承擔
12. 工程施工進行符合職業安全衛生法及TUC協力廠商環安衛管理規則，相關作業費用已包含於工程內
13. 施工日期須配合業主許可日期進行
14. 本工程金屬類廢棄物須清運至TUC指定位置，其餘非金屬類廢棄物承包商須負責處理
15. 承包工程當訂單確定後須提供進廠相關資料，如附件內容`,
    'defaultAcceptance': '完工後會同勘查(須缺失改善完成及運做) 1個月後辦理驗收',
    'defaultAcceptanceExtra': '補充說明',
    'defaultCompliance': `1. 工程設施驗收後保固一年，工程費用含萬分之7工程保險
2. 施工配合本公司安排日期((不含例假日))，施工期間遇有臨時問題需停工配合本公司安排
3. 有動火,高架,吊掛,危險管路，等特殊作業須作業表單流程核准後方可施工，作業時需有TUC監工人員在場，TUC監工人員未在場施作特殊作業，依規定罰款
4. 施工區域有安全疑慮時，圍出管制作業區域，防止人員車輛進入
5. 液體管路拆卸須使用盛盤承接，造成危害及損壞依價賠償
6. 危害性化學物質作業，須佩戴個人防護器具
7. 廠區禁攜帶打火機、砂輪切割機(廠內現場)，廠區內切割使用線鋸機
8. 施工區域標示及警示(以警示帶或圍欄)，區隔分開，夜間裝警示閃光燈
9. 廠內天花板動手過需擦拭乾淨或更新
10. 危險管路拆卸備護目鏡(罩)、膠手套、防護服、氣密式防毒口罩
11. 施工臨時電線跨走道地面，使用斑馬膠帶黏貼警示
12. 施工當日收工清潔環境並將垃圾載走，違反開單罰款
13. 施工人員進廠全程戴工程帽作業，禁止外籍勞工人廠作業(有內政部核准文件:外籍勞工可移動工作場所，檢覆文件辦理)
14. 進廠人員不得有宿醉或酒氣情況，違者人員須離廠禁止作業
15. 屋頂、局限空間作業須符合職業安全衛生設施規則，且於施工前3日提出作業申請(附上作業方法及防護器具清冊文件，相關作業儀器須定期第三方檢測合格標章)
16. 電力/電控盤與旋轉/傳動機構張貼警告標語
17. 因本工程造成設施(備)損(傷)壞須賠償。`,
    'defaultContractorNotice': `注意：承包商承包工程，必須遵守提供以下資料提供，缺一不可，如無法配合勿承接案件，以免日後有爭議。
（只要工程項目、工作地點、施工人員與提交人員名冊不符均需重新繳交資料並重新上課）

1. 協力廠商環安衛管理切結書 (ESHP-11-00101)
2. 工作環境危害因素告知單 (ESHP-11-00102)
3. 職安人員、營造、有害作業主管證書及回訓證明或特殊、特種作業相關證書副本
   甲、特殊作業：如吊掛、動火、高架、局限及危險管路等
   乙、相關證照：如：一機三證、缺氧作業主管等等
4. 協力廠商進廠施工人員名冊 (ESHP-11-00103) 及以下施工人員相關資料：
   甲、個資蒐集告知聲明暨同意書 (ESHP-11-00104)，務必請個人親筆簽名。
   乙、(1) 勞工保險、(2) 社會保險、(3) 意外保險 (NTD 500 萬元以上或 RMB 45 萬元以上/每人) *副本 3 擇 1
   丙、員工健康體檢資料 (2 年內) *副本
   丁、委外或自行辦理之職業安全衛生教育訓練證明 (3 年 6 小時)
   戊、非本籍 (中華民國籍) 施工人員需檢附居留證副本
5. 協議組織會議簽到及紀錄表 (ESHP-11-00111)
6. 協力廠商環安衛管理規則 (ESHP-11-00113)
7. 協力廠商一般施工申請單 (ESHP-11-00115)
8. 協力廠商內部危害因素告知單 (ESHP-11-00118)
9. 協力廠商再承攬證明書 (ESHP-11-00119)

另外安全培訓課程說明如下：
1. 日期：每週四 (如遇國定假日或當日有其他重要會議如安委會等即取消)。
2. 時間：09:00~10:30 (含測試)。
3. 人數：30 人/堂 (最多)。報名人數達 10 人 (含) 以上即開課。
4. 地點：B1 教育訓練室。
5. 方式：採報名方式填寫協力廠商環安衛訓練講習報名表 (如附件)。
6. 報名：廠商需要上課者，提前一週報名。

如於執行流程有任何建議或疑慮之處，煩請回覆此 MAIL。`,
    'defaultTblFunctional': '功能',
    'defaultTblQuality': '品質',
    'defaultTblCapacity': '產能',
    'defaultTblRuntest': '運轉測試',
    'defaultTblAppearance': '外觀檢驗',
    'defaultTblOutput': '出力測速',
    
    // V6.1 Cloud Inspector Labels
    'cloudInspector': '雲端歷史查閱器',
    'displayName': '文件顯示名稱',
    'status': '解析狀態',
    'createdAt': '上傳日期',
    'actions': '執行操作',
    'exportCsv': '匯出 CSV',
    'num': '序號',
    'uploader': '上傳者',
    'date': '日期',
    'cleanup': '重複資料清理',
    'reparseAll': '全面重新解析',
    'labelFix': '標籤描述修正',
    'changePassword': '變更密碼',
    'resetAndReparseAll': '全量重置並重新解析',
    'confirmResetAndReparse': '確定要「清空所有已解析條目」並將所有檔案「重新送進佇列」解析嗎？\n此操作將會徹底清除現有知識庫，請務必確認解析邏輯已更新。',
    'resetting': '重置中...',
    'processing': '處理中',
    'progress': '進度',
    'minToBack': '縮小至背景',
    'forceReparse': '強制再解析',
    'noFiles': '尚未在系統中發現任何歷史文件文件',
    'docOfficialPreview': '預覽',
    'docAutoFit': '自動寬度',
    'docExportWord': '匯出 Word',
    'docExportPdf': '匯出 PDF',
    'docCompanyName': '台燿科技股份有限公司',
    'docCompanyEnglish': 'Taiwan Union Technology Corporation',
    'docTitle': '採購規格暨驗收內容',
    'docDate': '日期：',
    'docPage': '頁次：',
    'docDept': '申購單位：',
    'docRequester': '申購人：',
    'docExtension': '分機：',
    'docSection1': '一、 設備名稱與需求：',
    'docSection2': '二、 品相：',
    'docSection3': '三、 數量單位：',
    'docSection4': '四、 適用範圍 (Scope)：',
    'docSection5': '五、 適用區間 (Range)：',
    'docSection6': '六、 設計要求',
    'docSub6_1': '1. 環境要求：',
    'docSub6_2': '2. 法規要求：',
    'docSub6_3': '3. 維護要求：',
    'docSection7': '七、 安全要求：',
    'docSection8': '八、 特性要求',
    'docSub8_1': '1. 電力規格：',
    'docSub8_2': '2. 機械規格：',
    'docSub8_3': '3. 物理規格：',
    'docSub8_4': '4. 可靠度規格：',
    'docSection9': '九、 安裝程序：',
    'docSub9_date': '交貨日期：',
    'docSub9_period': '施工天數：',
    'docSub9_acceptance': '驗收描述：',
    'docSection10': '十、 遵守事項：',
    'docSection11': '十一、 圖說：',
    'docSection12': '十二、 驗收要求表格：',
    'docTblCat': '類別',
    'docTblItem': '檢驗項目',
    'docTblSpec': '技術規範',
    'docTblMethod': '檢驗方法',
    'docTblCount': '樣本數量',
    'docTblConfirm': '確認',
    'docSignTitle': '規格確認與電子簽名區',
    'docSignApplicant': '申購人',
    'docSignDeptHead': '單位主管',
    'docSignVendor': '廠商簽字確認',
    'docBottomNote1': '* 規格應詳細開列，以便採購人員詢價與議價',
    'docBottomNote2': '* 本採購案是否有檢附圖面之必要性？',
    'docImgNote': '[圖片檔案限制：請參閱完整 PDF 下載檔]',
    
    'inputPlaceholder': '請輸入',
    'aiSearchPending': '🔍 AI 正在背景搜尋中...',
    'aiNoKey': '⚠️ 尚未配置 API 金鑰',
    'aiNoKeyDesc': '請在設定中輸入 VITE_GEMINI_KEY 以開啟語義分析功能',
    'aiError': '❌ AI 分析錯誤',
    'aiErrorDesc': 'API 配額超出或網路問題，建議精確縮小關鍵字範圍',
    'hintSelectHistory': '選擇歷史條文內容以載入...',
    'hintSelectReg': '選擇法規條文內容以載入...',
    'hintSelectGen': '選擇 AI 建議內容以載入...',
    'source': '來源',
    'unknown': '未知',
    
    // UI - DatabaseImportModal
    'importCloudTitle': '從雲端知識庫載入',
    'searchEqPlaceholder': '搜尋設備名稱...',
    'loadingCloud': '載入雲端清單中...',
    'noCloudMatch': '未發現匹配的雲端文件',
    'needAiAssemble': '[需 AI 組組裝]',
    'aiAssembleTip': '提示：若文件右側顯示 [需 AI 組裝]，系統將自動啟動 Gemini 反向還原編輯欄位。',
    'aiAssembleFail': 'AI 反向組裝失敗，該文件可能缺少關鍵條文。',
    'parseError': '解析過程發生錯誤',
    'unnamedDoc': '未命名文件',
    'unnamedEq': '未命名設備',
    
    // UI - UploadModal
    'wizardTitle': '智慧解析與規範歸納',
    'wizardDesc': '上傳歷史 PDF/圖片 規範，AI 將自動萃取技術要點存入知識庫',
    'minimizeTip': '縮小至背景執行',
    'selectFile': '選取檔案',
    'supportFiles': '支援多檔案併行解析：PDF, Word (.doc/.docx), 圖片格式',
    'aiParsing': 'AI 解析中...',
    'queueRemaining': '隊列中剩餘：',
    'items': '個任務',
    'totalProgress': '總體進度',
    'recentUploads': '最近上傳成果',
    'noRecentRecords': '暫無近期歸納紀錄',
    'viewOriginal': '查看原始檔',
    'expertTip': '專家提醒：',
    'jsonStored': '系統已將檔案轉為結構化 JSON 儲存。',
    'loadAiResultPrefix': '🚀 載入「',
    'loadAiResultSuffix': '」的 AI 解析結果',
    'uploadComplete': '檔案上傳解析完成！',
    'successCount': '成功',
    'skippedCount': '跳過',
    'interrupted': '程序中斷',
    
    // UI - SpecTable & ImageUpload
    'addRow': '新增列',
    'maxImages': '最多上傳 6 張圖片',
    'captionPlaceholder': '輸入圖說...',
    'clickToUpload': '點擊上傳圖片',
    'languageLabel': '語系:',
    
    // Additional App labels
    'noEntries': '未偵測到條目',
    'editTab': '編輯內容',
    'previewTab': '查看預覽',
    'clickToEditTags': '點擊編輯標籤',
    'newTagHint': '點擊新增標籤...',
    'noReqDesc': '無需求說明',
    'systemSubtitle': '採購規範產生器',

    // Queue Status Dashboard
    'queueOverview': '佇列狀態總覽',
    'allFiles': '全部',
    'autoRefreshHint': '背景處理中，每 15 秒自動更新',
    'queueParsed': '已解析',
    'queuePending': '等待中',
    'queueProcessing': '解析中',
    'queueFailed': '失敗',
    'unparsed': '未解析',
    'tabUnlabeled': '標籤修正',
    'completionRate': '總完成率',
    'enqueueUnparsed': '解析失敗/未解析送入佇列',
    'batchReparse': '批次重新解析',
    'confirmReparseBatch': '確定要將這 {n} 筆檔案送入雲端背景重新解析嗎？\n(系統將分批送出，避免逾時)',
    'statusPending': '等待佇列中',
    'statusProcessing': '伺服器解析中',
    'statusFailed': '解析失敗',
    'aiTranslatingContent': 'AI 深度轉譯中...',
    'aiTranslatingHint': '正在將雲端紀錄內容轉譯為您的介面語系，請稍候',
    'viewDiagnostic': '查看診斷報告',
    'changeAdminPwd': '變更管理員密碼',
    'adminAuth': '管理員身份驗證',
    'newPwdHint': '請輸入新密碼 (至少 6 位數)',
    'enterPwdHint': '此區域受保護，請輸入管理員密碼',
    'newPwdPlaceholder': '新密碼...',
    'pwdPlaceholder': '請輸入密碼...',
    'saveNewPwd': '儲存新密碼'
  },
  'zh-CN': {
    'systemTitle': '采购验收规范建置表',
    'langName': '简体中文',
    'settings': '系统设置',
    'userManual': '操作说明',
    'viewManual': '查看手册',
    'export': '导出文件',
    'import': '上传数据库',
    'history': '仪表板',

    'officialPreview': '规格校正区',
    'sidebarTitle': '功能菜单',
    'sidebarSubtitle': 'TUC 规范生成器',
    'tabBasic': '基本信息',
    'sectionBasicHeader': '项目基本信息',
    'tabHardware': '技术规格',
    'tabConstruction': '安装标准',
    'tabDrawings': '图面表格',
    'tabSignOff': '会签与核准',
    'dept': '申购单位',
    'requester': '申购人',
    'ext': '分机',
    'equipName': '设备名称',
    'model': '型号 (Model)',
    'category': '采购类别',
    'reqDesc': '需求说明',
    'appearance': '品相要求',
    'quantity': '数量单位',
    'scope': '适用范围',
    'envReq': '环境要求',
    'regReq': '法现要求',
    'maintReq': '维护要求',
    'safetyReq': '安全要求',
    'elecSpec': '电力特性',
    'mechSpec': '机械特性',
    'physSpec': '物理特性',
    'relySpec': '可靠度要求',
    'installStd': '安装标准',
    'deliveryDate': '交货日期',
    'workPeriod': '施工天数',
    'acceptanceDesc': '验收描述',
    'compliance': '遵守事项',
    'drawings': '是否提供图面',
    'tabHardwareTitle': '技术规格与设计要求',
    'tabConstructionTitle': '安装程序与法规遵循',
    'tabDrawingsTitle': '工程图面与验收表格',
    'tabSignOffTitle': '规格确认与电子签名',
    'signOffGrid': '签核表格区域',
    'deptCode': '单位',
    'signOff': '签名栏',
    'chooseDept': '选择单位',
    'dept_Production': '生产部',
    'dept_Engineering': '工程部',
    'dept_Safety': '工安部',
    'dept_Equipment': '设备部',
    'dept_Quality': '品保部',
    'dept_RD': '研发部',
    'dept_PRD': 'PRD',
    'dept_Purchasing': '采购部',
    'safetyContent': '安全规范细节',
    'finishDate': '完工日期',
    'workPeriodDays': '天数 (Days)',
    'tableAcceptance': '验收描述表格',
    'manager': '直属主管',
    
    'catNew': '新增',
    'catRepair': '修缮',
    'catRenovate': '整改',
    'catOptimize': '优化',
    'catPurchase': '购置',
    'fileOptions': '文件操作选项',
    'downloadJson': '下载规范 JSON',
    'importCloud': '从云端载入',
    'loadLocal': '载入本地 JSON',
    'aiHistory': '参考 TUC 历史规范',
    'aiReg': '法规与业界标准',
    'aiGen': 'AI 全新生成',
    'translating': 'AI 翻译同步中...',
    'noHints': '暂无 AI 建议',
    'thresholdHistory': '历史资料匹配门槛',
    'thresholdReg': '法规标准匹配门槛',
    'aiAnalyzeRange': '开始分析此区块',
    'aiGenerating': 'AI 生成中...',
    'aiAbort': '停止生成',
    'save': '儲存',
    'reset': '重置',
    'delete': '删除',
    'batchDelete': '批量删除',
    'regenerate': '重新生成',
    'confirm': '确认',
    'cancel': '取消',
    'yes': '是',
    'no': '否',
    'rangeRange': '适用区间',
    'deptLabel': '申请单位',
    'applicantLabel': '申请人员',
    'extLabel': '分机',
    'validationComplete': '✅ 规范编校完成',
    'syncDescription': '您可以点击下方按钮将此份规范同步至云端知识库。<br/>系统将自动执行 AI 标签校准，并根据文件隐码覆盖旧有资料。',
    'finalizeSync': '完稿并同步至知识库',
    'syncing': '同步中，请稍候...',
    'success': '成功',
    'error': '错误',
    'prev': '上一步',
    'next': '下一步',
    'page': '页数',
    'section': '章节',

    // Boilerplate Defaults
    'defaultDependingOnProcurement': '依请购内容而定',
    'defaultAccordingToTuc': '依台燿规定',
    'defaultAccordingToTucShort': '依台燿规定',
    'defaultNationalRegs': '符合国家法规',
    'defaultSafetyRegs': '依台燿规定',
    'defaultInstallStd': `1. PLC以及人机程序修改，施工当天即提供修改前後程序备份
2. PLC程序修改，原则保留原始程序，另新增辅助接点作新旧功能切替使用，达到可快速复原功能
3. 工程依职业安全卫生法令规范作业
4. 工程固定安全卫生管理监工乙员，现场无监工不得作业
5. 工程完工符合人员安全操作及维修方便性，承包商自行评估进来
6. 本案工程以功能符合需求、责任施工，承包商不得追加费用
7. 工程完工设施整体须整齐、美觀、安全。未经核須不得使用葫芦吊
8. 手閥把手颜色依操作方式装设。常开(蓝色)/常闭(红色)/调整(黄色)
9. 金属管、支架属SUS亮面材质
10. 现场施工需维护环境及设备整洁
11. 工程施工每一阶段会监工人员查看拍照，未会同造成后续验收作业问题，承包商自行承担
12. 工程施工进行符合职业安全卫生法及TUC协力厂商环安卫管理规则，相关作业费用已包含于工程内
13. 施工日期须配合业主许可日期进行
14. 本工程金属类废弃物须清运至TUC指定位置，其余非金属类废弃物承包商须负责处理
15. 承包工程当订单确定后须提供进厂相关资料，如附件内容`,
    'defaultAcceptance': '完工后会同勘查(须缺失改善完成及运做) 1个月后办理验收',
    'defaultAcceptanceExtra': '补充说明',
    'defaultCompliance': `1. 工程设施验收后保固一年，工程费用含万分之7工程保险
2. 施工配合本公司安排日期((不含例假日))，施工期间遇有临时问题需停工配合本公司安排
3. 有动火,高架,吊挂,危险管路，等特殊作业须作业表單流程核准后方可施工，作业时需有TUC监工人員在場，TUC監工人員未在場施作特殊作業，依規定罰款
4. 施工区域有安全疑虑时，围出管制作业区域，防止人员车辆进入
5. 液体管路拆卸须使用盛盘承接，造成危害及损坏依价赔偿
6. 危害性化学物质作业，须佩戴个人防护器具
7. 厂区禁携带打火机、砂轮切割机(厂内现场)，厂区内切割使用线锯机
8. 施工区域标示及警示(以警示带或围欄)，区分隔开，夜間裝警示閃光燈
9. 厂内天花板动手过需擦拭干净或更新
10. 危险管路拆卸备护目镜(罩)、胶手套、防护服、气密式防毒口罩
11. 施工临时电线跨走道地面，使用斑马胶带粘贴警示
12. 施工当日收工清洁环境并将垃圾載走，违反开单罚款
13. 施工人员进厂全程戴工程帽作業，禁止外籍劳工人厂作业(有内政部核准文件:外籍劳工可移动工作场所，检覆文件办理)
14. 进厂人员不得有宿醉或酒气情况，违者人员须离厂禁止作业
15. 屋顶、局限空间作业须符合职业安全卫生设施规则，且于施工前3日提出作业申请(附上作业方法及防护器具清册文件，相关作业仪器须定期第三方检测合格标章)
16. 电力/电控盘与旋转/传动机构张贴警告标语
17. 因本工程造成设施(備)損(傷)壞須賠償。`,
    'defaultTblFunctional': '功能',
    'defaultTblQuality': '质量',
    'defaultTblCapacity': '产能',
    'defaultTblRuntest': '运转测试',
    'defaultTblAppearance': '外观检验',
    'defaultTblOutput': '出力测速',
    
    // V6.1 Cloud Inspector Labels
    'cloudInspector': '云端历史查阅器',
    'displayName': '文件显示名称',
    'status': '解析状态',
    'createdAt': '上传日期',
    'actions': '执行操作',
    'exportCsv': '导出 CSV',
    'num': '序号',
    'uploader': '上传者',
    'date': '日期',
    'cleanup': '重复数据清理',
    'reparseAll': '全面重新解析',
    'labelFix': '标签描述修正',
    'changePassword': '变更密码',
    'resetAndReparseAll': '全量重置并重新解析',
    'confirmResetAndReparse': '确定要「清空所有已解析条目」并将所有文件「重新送进队列」解析吗？\n此操作将会彻底清除现有知识库，请务必确认解析逻辑已更新。',
    'resetting': '重置中...',
    'processing': '处理中',
    'progress': '进度',
    'minToBack': '缩小至背景',
    'forceReparse': '强制再解析',
    'noFiles': '尚未在系统中发现任何历史文档文件',
    'docOfficialPreview': '预览',
    'docAutoFit': '自动宽度',
    'docExportWord': '导出 Word',
    'docExportPdf': '导出 PDF',
    'docCompanyName': '台燿科技股份有限公司',
    'docCompanyEnglish': 'Taiwan Union Technology Corporation',
    'docTitle': '采购规格暨验收内容',
    'docDate': '日期：',
    'docPage': '页次：',
    'docDept': '申购单位：',
    'docRequester': '申购人：',
    'docExtension': '分机：',
    'docSection1': '一、 设备名称与需求：',
    'docSection2': '二、 品相：',
    'docSection3': '三、 数量单位：',
    'docSection4': '四、 适用范围 (Scope)：',
    'docSection5': '五、 适用区间 (Range)：',
    'docSection6': '六、 设计要求',
    'docSub6_1': '1. 环境要求：',
    'docSub6_2': '2. 法规要求：',
    'docSub6_3': '3. 维护要求：',
    'docSection7': '七、 安全要求：',
    'docSection8': '八、 特性要求',
    'docSub8_1': '1. 电力规格：',
    'docSub8_2': '2. 机械规格：',
    'docSub8_3': '3. 物理规格：',
    'docSub8_4': '4. 可靠度规格：',
    'docSection9': '九、 安装程序：',
    'docSub9_date': '交货日期：',
    'docSub9_period': '施工天数：',
    'docSub9_acceptance': '验收描述：',
    'docSection10': '十、 遵守事项：',
    'docSection11': '十一、 图说：',
    'docSection12': '十二、 验收要求表格：',
    'docTblCat': '类别',
    'docTblItem': '检验项目',
    'docTblSpec': '技术规范',
    'docTblMethod': '检验方法',
    'docTblCount': '样本数量',
    'docTblConfirm': '确认',
    'docSignTitle': '规格确认与电子签名区',
    'docSignApplicant': '申购人',
    'docSignDeptHead': '单位主管',
    'docSignVendor': '厂商签字确认',
    'docBottomNote1': '* 规格应详细开列，以便采购人员询价与议价',
    'docBottomNote2': '* 本采购案是否有检附图面之必要性？',
    'docImgNote': '[图片文件限制：请参阅完整 PDF 下载档]',
    
    'inputPlaceholder': '请输入',
    'aiSearchPending': '🔍 AI 正在背景搜尋中...',
    'aiNoKey': '⚠️ 尚未配置 API 密钥',
    'aiNoKeyDesc': '请在设置中输入 VITE_GEMINI_KEY 以开启语义分析功能',
    'aiError': '❌ AI 分析错误',
    'aiErrorDesc': 'API 配额超出或网络问题，建议精确缩小关键字范围',
    'hintSelectHistory': '选择历史条文内容以载入...',
    'hintSelectReg': '选择法规条文内容以载入...',
    'hintSelectGen': '选择 AI 建议内容以载入...',
    'source': '来源',
    'unknown': '未知',
    
    // UI - DatabaseImportModal
    'importCloudTitle': '从云端知识库载入',
    'searchEqPlaceholder': '搜尋設備名稱...',
    'loadingCloud': '载入云端清单中...',
    'noCloudMatch': '未发现匹配的云端文件',
    'needAiAssemble': '[需 AI 組組裝]',
    'aiAssembleTip': '提示：若文件右侧显示 [需 AI 組裝]，系统将自动启动 Gemini 反向还原编辑栏目。',
    'aiAssembleFail': 'AI 反向组装失败，该文件可能缺少关键条文。',
    'parseError': '解析过程发生错误',
    'unnamedDoc': '未命名文件',
    'contractorNotice': '厂商注意事项',
    'defaultContractorNotice': `注意：承包商承包工程，必须遵守提供以下资料提供，缺一不可，如无法配合勿承接案件，以免日后有争议。
（只要工程项目、工作地点、施工人员与提交人员名册不符均需重新缴交资料并重新上课）

1. 协作厂商环安卫管理切结书 (ESHP-11-00101)
2. 工作环境危害因素告知单 (ESHP-11-00102)
3. 职安人员、营造、有害作业主管证书及回训证明或特殊、特种作业相关证书副本
   甲、特殊作业：如吊挂、动火、高架、局限及危险管路等
   乙、相关证照：如：一机三证、缺氧作业主管等等
4. 协作厂商进厂施工人员名册 (ESHP-11-00103) 及以下施工人员相关资料：
   甲、个资搜集告知声明暨同意书 (ESHP-11-00104)，务必请个人亲笔签名。
   乙、(1) 劳工保险、(2) 社会保险、(3) 意外保险 (NTD 500 万元以上或 RMB 45 万元以上/每人) *副本 3 择 1
   丙、员工健康体检资料 (2 年内) *副本
   丁、委外或自行办理之职业安全卫生教育训练证明 (3 年 6 小时)
   戊、非本籍 (中华人民共和国籍) 施工人员需检附居留证副本
5. 协议组织会议签到及纪录表 (ESHP-11-00111)
6. 协作厂商环安卫管理规则 (ESHP-11-00113)
7. 协作廠商一般施工申请单 (ESHP-11-00115)
8. 协作厂商内部危害因素告知单 (ESHP-11-00118)
9. 协作厂商再承揽证明书 (ESHP-11-00119)

另外安全培训课程说明如下：
1. 日期：每周四 (如遇国定假日或当日有其他重要会议如安委会等即取消)。
2. 时间：09:00~10:30 (含测试)。
3. 人数：30 人/堂 (最多)。报名人数达 10 人 (含) 以上即开课。
4. 地点：B1 教育训练室。
5. 方式：采报名方式填写协作厂商环安卫训练讲习报名表 (如附件)。
6. 报名：厂商需要上课者，提前一周报名。

如于执行流程有任何建议或疑慮之处，烦请回复此 MAIL。`,
    'unnamedEq': '未命名设备',
    
    // UI - UploadModal
    'wizardTitle': '智慧解析与规范归纳',
    'wizardDesc': '上传历史 PDF/图片 规范，AI 将自动萃取技术要点存入知识库',
    'minimizeTip': '缩小至背景执行',
    'selectFile': '选取文件',
    'supportFiles': '支持多文件并行解析：PDF, Word (.doc/.docx), 图片格式',
    'aiParsing': 'AI 解析中...',
    'queueRemaining': '队列中剩余：',
    'items': '个任务',
    'totalProgress': '总体进度',
    'recentUploads': '最近上传成果',
    'noRecentRecords': '暂无近期归纳记录',
    'viewOriginal': '查看原始文件',
    'expertTip': '专家提醒：',
    'jsonStored': '系统已将文件转为结构化 JSON 存储。',
    'loadAiResultPrefix': '🚀 加载“',
    'loadAiResultSuffix': '”的 AI 解析结果',
    'uploadComplete': '文件上传解析完成！',
    'successCount': '成功',
    'skippedCount': '跳过',
    'interrupted': '程序中断',
    
    // UI - SpecTable & ImageUpload
    'addRow': '新增行',
    'maxImages': '最多上傳 6 張圖片',
    'captionPlaceholder': '输入图说...',
    'clickToUpload': '点击上传图片',
    
    'languageLabel': '语言:',
    'parsedCount': '已解析',
    'viewFull': '在新标签页查看',
    'invalidJson': '无效的 JSON 文件',
    'confirmReset': '确定要清除所有字段并恢复默认完整版面吗？(此操作不可还原)',
    'resetSuccess': '✅ 数据已重置为默认状态',
    'syncErrorReq': '请至少填写设备名称与需求说明再进行同步。',
    'syncSuccessBatch': '✅ 同步成功！已更新 {n} 条技术条文至知识库。 (隐码: {id}...)',
    'syncFail': '❌ 同步失败:',
    'dbClean': '目前数据库非常整洁，未检测到任何重复文件。',
    'cleanSuccess': '清理完成！已移除 {n} 条重复记录。',
    'cleanError': '清理过程发生错误:',
    'tagUpdateFail': '标签更新失败:',
    'confirmCalibrate': '系统将分析全课档案内容，自动辨别并校正正确的「设备标签」。\n这将修正如「大明剪床」被误植至 RTO 等错误关联，确定执行吗？',
    'deleteRecord': '删除纪录',
    'exportPdf': '导出 PDF',
    'itemsSuffix': '條',
    'resourceUsage': '资源水位预警',
    'knowledgeEntries': '知识库条目数 (条)',
    'storageFiles': '储存空间总量',
    'safeLimit': '安全水位 (免费额度)',
    'warningHighUsage': '⚠️ 警告：资源使用量已接近免费额度上限，请及时清理重复或老旧文件。',
    'cleanupLargeFiles': '清理大文件',
    'sizeLimitLabel': '删除大于',
    'confirmDeleteLarge': '您确定要删除所有大于 {n} MB 的文件吗？\n(系统检测到共计 {count} 个文件)',

    // Queue Status Dashboard
    'queueOverview': '队列状态总览',
    'allFiles': '全部',
    'autoRefreshHint': '后台处理中，每 15 秒自动更新',
    'queueParsed': '已解析',
    'queuePending': '等待中',
    'queueProcessing': '解析中',
    'queueFailed': '失败',
    'unparsed': '未解析',
    'tabUnlabeled': '标签修正',
    'completionRate': '总完成率',
    'enqueueUnparsed': '解析失败/未解析送入队列',
    'batchReparse': '批量重新解析',
    'confirmReparseBatch': '确定要将这 {n} 筆档案送入云端背景重新解析吗？\n(系统将分批送出，避免超时)',
    'statusPending': '等待队列中',
    'statusProcessing': '服务器解析中',
    'statusFailed': '解析失敗',
    'aiTranslatingContent': 'AI 深度转译中...',
    'aiTranslatingHint': '正在將雲端紀錄内容转译为您的界面语系，请稍候',
    'viewDiagnostic': '查看诊断报告',
    'changeAdminPwd': '变更管理员密码',
    'adminAuth': '管理员身份验证',
    'newPwdHint': '请输入新密码 (至少 6 位数)',
    'enterPwdHint': '此区域受保护，请输入管理员密码',
    'newPwdPlaceholder': '新密码...',
    'pwdPlaceholder': '请输入密码...',
    'saveNewPwd': '储存新密码'
  },
  'en-US': {
    'systemTitle': 'Procurement Spec Builder',
    'langName': 'English',
    'settings': 'Settings',
    'userManual': 'User Manual',
    'viewManual': 'View Manual',
    'export': 'Export',
    'import': 'Upload Database',
    'history': 'Dashboard',

    'officialPreview': 'Official Preview',
    'sidebarTitle': 'Menu',
    'sidebarSubtitle': 'TUC Spec Tool',
    'tabBasic': 'Basic Info',
    'sectionBasicHeader': 'Basic Information',
    'tabHardware': 'Tech Specs',
    'tabConstruction': 'Construction',
    'tabDrawings': 'Tables & Drawings',
    'tabSignOff': 'Approval',
    'dept': 'Dept',
    'requester': 'Requester',
    'ext': 'Ext',
    'equipName': 'Equip Name',
    'model': 'Model',
    'category': 'Category',
    'reqDesc': 'Req Description',
    'appearance': 'Appearance',
    'quantity': 'Qty & Unit',
    'scope': 'Scope',
    'envReq': 'Env Requirements',
    'regReq': 'Regulatory',
    'maintReq': 'Maintenance',
    'safetyReq': 'Safety',
    'elecSpec': 'Electrical',
    'mechSpec': 'Mechanical',
    'physSpec': 'Physical',
    'relySpec': 'Reliability',
    'installStd': 'Install Standard',
    'deliveryDate': 'Delivery',
    'workPeriod': 'Work Period',
    'acceptanceDesc': 'Acceptance',
    'compliance': 'Compliance',
    'drawings': 'Has Drawings',
    'tabHardwareTitle': 'Technical & Design Requirements',
    'tabConstructionTitle': 'Installation & Compliance',
    'tabDrawingsTitle': 'Drawings & Acceptance Table',
    'tabSignOffTitle': 'Confirmation & E-Signature',
    'signOffGrid': 'Sign-off Grid',
    'deptCode': 'Unit',
    'signOff': 'Signature',
    'chooseDept': 'Choose Unit',
    'dept_Production': 'Production',
    'dept_Engineering': 'Engineering',
    'dept_Safety': 'Safety',
    'dept_Equipment': 'Equipment',
    'dept_Quality': 'Quality Assurance',
    'dept_RD': 'R&D',
    'dept_PRD': 'PRD',
    'dept_Purchasing': 'Purchasing',
    'safetyContent': 'Safety Specs',
    'finishDate': 'Finish Date',
    'workPeriodDays': 'Days',
    'tableAcceptance': 'Acceptance Table',
    'manager': 'Manager',
    
    'catNew': 'New',
    'catRepair': 'Repair',
    'catRenovate': 'Renovate',
    'catOptimize': 'Optimize',
    'catPurchase': 'Purchase',
    'fileOptions': 'File Options',
    'downloadJson': 'Download JSON',
    'importCloud': 'Cloud Import',
    'loadLocal': 'Load Local JSON',
    'aiHistory': 'TUC History Reference',
    'aiReg': 'Regulatory & Industry',
    'aiGen': 'AI Generate New',
    'translating': 'AI Syncing...',
    'noHints': 'No Hints',
    'thresholdHistory': 'History Match Threshold',
    'thresholdReg': 'Regulatory Match Threshold',
    'aiAnalyzeRange': 'Analyze this tab',
    'aiGenerating': 'Generating...',
    'aiAbort': 'Stop',
    'save': 'Save',
    'reset': 'Reset',
    'delete': 'Delete',
    'batchDelete': 'Batch Delete',
    'regenerate': 'Regenerate',
    'confirm': 'Confirm',
    'cancel': 'Cancel',
    'yes': 'Yes',
    'no': 'No',
    'rangeRange': 'Operating Interval',
    'deptLabel': 'Department',
    'applicantLabel': 'Applicant',
    'extLabel': 'Ext',
    'validationComplete': '✅ Validation Complete',
    'syncDescription': 'Sync this spec to cloud knowledge. AI will auto-calibrate tags.',
    'finalizeSync': 'Finalize & Sync',
    'syncing': 'Syncing...',
    'success': 'Success',
    'error': 'Error',
    'prev': 'Prev',
    'next': 'Next',
    'page': 'Page',
    'section': 'Section',

    // Boilerplate Defaults
    'defaultDependingOnProcurement': 'Depending on procurement content',
    'defaultAccordingToTuc': 'According to TUC regulations (Vendor mgmt, safety rules, etc.)',
    'defaultAccordingToTucShort': 'According to TUC regulations',
    'defaultNationalRegs': 'Compliant with national regulations',
    'defaultSafetyRegs': 'According to TUC regulations',
    'defaultInstallStd': `1. Backup PLC/HMI programs before and after modification on construction day.
2. Maintain original PLC logic; use auxiliary relay for new features for quick restoration.
3. Operations follow occupational safety laws.
4. One safety supervisor required; no work without supervision.
5. Ensure personnel safety and easy maintenance.
6. Responsible construction; no extra cost allowed.
7. Neatly organized/safe setup. Use of hoists requires approval.
8. Valve handle color code: Open(Blue) / Closed(Red) / Adjust(Yellow).
9. Metal pipes/supports use SUS bright finish.
10. Maintain cleanliness during work.
11. Photos required at each stage; vendor liable for validation issues if skipped.
12. Follow labor safety and TUC vendor safety rules; costs included in bid.
13. Schedule per owner approval.
14. Metal waste to TUC designated spot; others handled by vendor.
15. Provide factory entry info after PO confirmation.`,
    'defaultAcceptance': 'Validation after 1 month of trouble-free operation after joint inspection.',
    'defaultAcceptanceExtra': 'Extra notes',
    'defaultCompliance': `1. 1-year warranty after validation; insurance included.
2. Follow TUC schedule; work may pause based on TUC needs.
3. Special work (fire, heights, etc.) requires approved permits and TUC supervision.
4. Mark hazardous areas; prevent unauthorized entry.
5. Use trays for pipe disassembly to prevent damage/leaks.
6. Use PPE for hazardous chemical work.
7. No lighters/grinders; use reciprocating saws indoors.
8. Mark work zone with tape/fences; warning lights at night.
9. Ceilings must be cleaned or updated if touched.
10. PPE (goggles, gloves, suit, mask) for hazardous pipe work.
11. Protect temporary cables on walkways with zebra tape.
12. Clean site daily; fines apply for violations.
13. Helmets required; no illegal foreign workers.
14. Workers must be sober; intoxicated ones will be removed.
15. High-risk work permits submitted 3 days early with PPE list.
16. Warning signs on electrical panels and rotating machinery.
17. Compensation required for facilities damaged during work.`,
    'defaultTblFunctional': 'Function',
    'defaultTblQuality': 'Quality',
    'defaultTblCapacity': 'Capacity',
    'defaultTblRuntest': 'Running Test',
    'defaultTblAppearance': 'Appearance Check',
    'defaultTblOutput': 'Output Speed',
    
    // V6.1 Cloud Inspector Labels
    'cloudInspector': 'Cloud Inspector',
    'displayName': 'Display Name',
    'status': 'Status',
    'createdAt': 'Uploaded At',
    'actions': 'Actions',
    'exportCsv': 'Export CSV',
    'num': 'No.',
    'uploader': 'Uploader',
    'date': 'Date',
    'cleanup': 'Cleanup Duplicates',
    'reparseAll': 'Reparse All',
    'labelFix': 'Label Fix',
    'changePassword': 'Change Password',
    'resetAndReparseAll': 'Reset & Reparse All',
    'confirmResetAndReparse': 'Are you sure you want to "clear all parsed entries" and "re-enqueue all files" for parsing? This will completely clear the existing knowledge base, please ensure the parsing logic has been updated.',
    'resetting': 'Resetting...',
    'processing': 'Processing',
    'progress': 'Progress',
    'minToBack': 'Minimize',
    'forceReparse': 'Force Reparse',
    'noFiles': 'No history files found in system',
    'docOfficialPreview': 'Preview',
    'docAutoFit': 'Auto Width',
    'docExportWord': 'Export Word',
    'docExportPdf': 'Export PDF',
    'docCompanyName': 'Taiwan Union Technology Corp',
    'docCompanyEnglish': 'Taiwan Union Technology Corporation',
    'docTitle': 'Procurement Spec & Acceptance',
    'docDate': 'Date: ',
    'docPage': 'Page: ',
    'docDept': 'Dept: ',
    'docRequester': 'Requester: ',
    'docExtension': 'Ext: ',
    'docSection1': '1. Equipment Name & Req: ',
    'docSection2': '2. Appearance: ',
    'docSection3': '3. Qty & Unit: ',
    'docSection4': '4. Scope: ',
    'docSection5': '5. Range: ',
    'docSection6': '6. Design Requirements',
    'docSub6_1': '1. Env Req: ',
    'docSub6_2': '2. Legal Req: ',
    'docSub6_3': '3. Maint Req: ',
    'docSection7': '7. Safety Req: ',
    'docSection8': '8. Characteristic Specs',
    'docSub8_1': '1. Electrical Specs: ',
    'docSub8_2': '2. Mechanical Specs: ',
    'docSub8_3': '3. Physical Specs: ',
    'docSub8_4': '4. Reliability Specs: ',
    'docSection9': '9. Installation Procedure: ',
    'docSub9_date': 'Delivery Date: ',
    'docSub9_period': 'Work Period: ',
    'docSub9_acceptance': 'Acceptance: ',
    'docSection10': '10. Compliance: ',
    'docSection11': '11. Drawings: ',
    'docSection12': '12. Acceptance Table: ',
    'docTblCat': 'Category',
    'docTblItem': 'Item',
    'docTblSpec': 'Spec',
    'docTblMethod': 'Method',
    'docTblCount': 'Samples',
    'docTblConfirm': 'Confirm',
    'docSignTitle': 'Confirmation & Sign-off Area',
    'docSignApplicant': 'Applicant',
    'docSignDeptHead': 'Dept Head',
    'docSignVendor': 'Vendor Confirmation',
    'docBottomNote1': '* Specs must be detailed for purchasing/negotiation',
    'docBottomNote2': '* Is drawing attachment necessary for this purchase?',
    'docImgNote': '[Image limit: See full PDF for diagrams]',
    'contractorNotice': 'Contractor Notice',
    'defaultContractorNotice': `Note: Contractors must provide the following documents. Failure to comply will result in non-acceptance of the project.
(Inconsistencies in project items, location, or personnel list will require re-submission and re-training)

1. Vendor ESH Management Affidavit (ESHP-11-00101)
2. Notification of Hazardous Factors in Work Environment (ESHP-11-00102)
3. Certificates for Safety Officers, Construction, or Hazardous Operation Supervisors (including refresher training)
   A. Special operations: e.g., hoisting, hot work, heights, confined space, hazardous piping.
   B. Related licenses: e.g., machine licenses, oxygen deficiency supervisor.
4. Contractor Personnel List (ESHP-11-00103) and individual data:
   A. Personal Data Collection Statement & Consent (ESHP-11-00104), must be signed in person.
   B. Insurance: Labor, Social, or Accident Insurance (min NTD 5M or RMB 450K per person) *Copy (1 of 3)
   C. Employee health check records (within 2 years) *Copy
   D. Occupational safety and health training certificate (6 hours every 3 years)
   E. For non-ROC citizens, a copy of the residence permit is required.
5. Agreement Organization Meeting Sign-in & Records (ESHP-11-00111)
6. Vendor ESH Management Rules (ESHP-11-00113)
7. Vendor General Construction Application Form (ESHP-11-00115)
8. Vendor Internal Hazard Notification Form (ESHP-11-00118)
9. Vendor Re-contracting Certificate (ESHP-11-00119)

Safety Training Course Details:
1. Date: Every Thursday (cancelled on public holidays or major TUC committee meetings).
2. Time: 09:00~10:30 (including test).
3. Capacity: Max 30 people/session. Class opens if 10+ participants registered.
4. Location: B1 Training Room.
5. Registration: Fill out the ESH Training Seminar Form (see attachment).
6. Deadline: Register at least one week in advance.

If you have any suggestions or concerns regarding the process, please reply to this MAIL.`,
    
    'inputPlaceholder': 'Please enter ',
    'aiSearchPending': '🔍 AI searching...',
    'aiNoKey': '⚠️ No API Key',
    'aiNoKeyDesc': 'Enter Gemini Key in Settings to enable AI analysis',
    'aiError': '❌ AI Analysis Error',
    'aiErrorDesc': 'Quota exceeded or network issue',
    'hintSelectHistory': 'Select history content...',
    'hintSelectReg': 'Select regulatory content...',
    'hintSelectGen': 'Select AI suggestions...',
    'source': 'Source',
    'unknown': 'Unknown',
    
    // UI - DatabaseImportModal
    'importCloudTitle': 'Load from Cloud',
    'searchEqPlaceholder': 'Search equip name...',
    'loadingCloud': 'Loading cloud list...',
    'noCloudMatch': 'No matching documents',
    'needAiAssemble': '[AI Reconstruct]',
    'aiAssembleTip': 'Tip: Docs with [AI Reconstruct] will use Gemini to restore fields',
    'aiAssembleFail': 'AI reconstruction failed',
    'parseError': 'Parsing error occurred',
    'unnamedEq': 'Unnamed Equipment',
    
    // UI - UploadModal
    
    // UI - UploadModal
    'wizardTitle': 'Smart Analysis & Induction',
    'wizardDesc': 'Upload legacy PDF/Images, AI extracts tech points',
    'minimizeTip': 'Minimize to Background',
    'selectFile': 'Select Files',
    'supportFiles': 'Supports PDF, Word, Images',
    'aiParsing': 'AI Parsing...',
    'queueRemaining': 'Remaining in queue: ',
    'items': ' items',
    'totalProgress': 'Total Progress',
    'recentUploads': 'Recent Results',
    'noRecentRecords': 'No recent records found',
    'viewOriginal': 'View Original',
    'expertTip': 'Expert Tip: ',
    'jsonStored': 'System saved data as structured JSON.',
    'loadAiResultPrefix': '🚀 Load AI result of "',
    'loadAiResultSuffix': '"',
    'uploadComplete': 'Upload & Analysis Complete!',
    'successCount': 'Success',
    'skippedCount': 'Skipped',
    'interrupted': 'Interrupted',
    
    'addRow': 'Add Row',
    'maxImages': 'Max 6 images allowed',
    'captionPlaceholder': 'Enter caption...',
    'clickToUpload': 'Click to upload image',
    
    'languageLabel': 'Language:',
    'parsedCount': 'Parsed',
    'viewFull': 'View in new tab',
    'invalidJson': 'Invalid JSON file',
    'confirmReset': 'Are you sure you want to clear all fields and restore default? (Cannot be undone)',
    'resetSuccess': '✅ Data has been reset to default',
    'syncErrorReq': 'Please fill in equipment name and requirement description before syncing.',
    'syncSuccessBatch': '✅ Sync Success! Updated {n} technical entries. (ID: {id}...)',
    'syncFail': '❌ Sync Failed:',
    'dbClean': 'Database is very clean, no duplicate files detected.',
    'cleanSuccess': 'Cleanup complete! Removed {n} duplicate records.',
    'cleanError': 'Cleanup failed:',
    'tagUpdateFail': 'Tag update failed:',
    'confirmCalibrate': 'System will analyze all document contents to automatically identify and calibrate correct "Equipment Tags".\nThis will fix incorrect associations, confirm execution?',
    'deleteRecord': 'Delete Record',
    'exportPdf': 'Export PDF',
    'itemsSuffix': 'entries',
    'resourceUsage': 'Resource Usage Monitor',
    'knowledgeEntries': 'Knowledge Entries (items)',
    'storageFiles': 'Stored Files (count)',
    'safeLimit': 'Safe Limit (Free Tier)',
    'warningHighUsage': '⚠️ Warning: Resource usage is approaching the free tier limit. Please clean up old files soon.',
    'cleanupLargeFiles': 'Cleanup Large Files',
    'sizeLimitLabel': 'Delete larger than',
    'confirmDeleteLarge': 'Are you sure you want to delete all files larger than {n} MB?\n(Detected {count} files total)',
    'apiKeyLabel': 'Gemini API Key (for AI hints)',
    'apiKeyPlaceholder': 'Paste your API key here...',
    'changeAdminPwd': 'Change Admin Password',
    'adminAuth': 'Admin Authentication',
    'newPwdHint': 'Enter new password (min 6 digits)',
    'enterPwdHint': 'Enter admin access password',
    'newPwdPlaceholder': 'New password...',
    'pwdPlaceholder': 'Enter password...',
    'saveNewPwd': 'Save New Password',
    'minimizeToBg': 'Minimize to Background',
    'noEntries': 'No entries detected',
    'editTab': 'Edit',
    'previewTab': 'Preview',
    'clickToEditTags': 'Click to edit tags',
    'newTagHint': 'Add tag...',
    'noReqDesc': 'No requirement description',
    'systemSubtitle': 'TUC Procurement Spec Generator',

    // Queue Status Dashboard
    'queueOverview': 'Queue Status',
    'allFiles': 'All',
    'autoRefreshHint': 'Processing in background, auto-refresh every 15s',
    'queueParsed': 'Parsed',
    'queuePending': 'Pending',
    'queueProcessing': 'Processing',
    'queueFailed': 'Failed',
    'unparsed': 'Unparsed',
    'tabUnlabeled': 'Fix Labels',
    'completionRate': 'Completion',
    'enqueueUnparsed': 'Enqueue Failed/Unparsed',
    'batchReparse': 'Batch Reparse',
    'confirmReparseBatch': 'Are you sure you want to send these {n} files for background re-parsing?\n(System will send in batches to avoid timeout)',
    'statusPending': 'Pending in Queue',
    'statusProcessing': 'Server Processing',
    'statusFailed': 'Parsing Failed',
    'aiTranslatingContent': 'AI Deep Translating...',
    'aiTranslatingHint': 'Translating cloud content to your interface language, please wait.',
    'viewDiagnostic': 'View Diagnostic'
  },
  'th-TH': {
    'systemTitle': 'แบบฟอร์มการสร้างข้อกำหนดการจัดซื้อและการรับมอบ',
    'langName': 'ภาษาไทย',
    'settings': 'ตั้งค่าระบบ',
    'userManual': 'คู่มือการใช้งาน',
    'viewManual': 'ดูคู่มือ',
    'export': 'ส่งออก',
    'import': 'อัปโหลดฐานข้อมูล',
    'history': 'ประวัติไฟล์',

    'officialPreview': 'พื้นที่ตรวจสอบความถูกต้อง',
    'sidebarTitle': 'เมนูจัดการ',
    'sidebarSubtitle': 'TUC เครื่องมือสร้างข้อกำหนด',
    'tabBasic': 'ข้อมูลพื้นฐาน',
    'sectionBasicHeader': 'ตั้งค่าข้อมูลพื้นฐาน',
    'tabHardware': 'ข้อมูลทางเทคนิค',
    'tabConstruction': 'งานก่อสร้าง',
    'tabDrawings': 'แบบและตาราง',
    'tabSignOff': 'ลงนามยืนยัน',
    'dept': 'แผนกที่ขอ',
    'requester': 'ผู้ยื่นคำขอ',
    'ext': 'เบอร์ภายใน',
    'equipName': 'ชื่ออุปกรณ์',
    'model': 'รุ่น (Model)',
    'category': 'ประเภทการซื้อ',
    'reqDesc': 'รายละเอียดความต้องการ',
    'appearance': 'สภาพแวดล้อมและรูปลักษณ์',
    'quantity': 'จำนวนและหน่วย',
    'scope': 'ขอบเขตการใช้งาน',
    'envReq': 'ข้อกำหนดสาธารณูปโภคและสิ่งแวดล้อม',
    'regReq': 'ข้อกำหนดทางกฎหมายและมาตรฐาน',
    'maintReq': 'ข้อกำหนดการบำรุงรักษา',
    'safetyReq': 'ข้อกำหนดด้านความปลอดภัย',
    'elecSpec': 'ข้อมูลทางไฟฟ้า',
    'mechSpec': 'ข้อมูลทางกล',
    'physSpec': 'ข้อมูลทางกายภาพ',
    'relySpec': 'ข้อกำหนดความน่าเชื่อถือ',
    'installStd': 'มาตรฐานการติดตั้ง',
    'deliveryDate': 'วันส่งมอบ',
    'workPeriod': 'ระยะเวลาดำเนินงาน',
    'acceptanceDesc': 'รายละเอียดการรับมอบ',
    'compliance': 'ข้อควรปฏิบัติ',
    'drawings': 'แนบแบบวาดหรือไม่',
    'tabHardwareTitle': 'ข้อกำหนดด้านเทคนิคและการออกแบบ體',
    'tabConstructionTitle': 'การติดตั้งและการปฏิบัติตามข้อกำหนด',
    'tabDrawingsTitle': 'แบบวาดและตาราง',
    'tabSignOffTitle': 'การยืนยันและการลงนามอนุมัติ',
    'signOffGrid': 'ตารางประสานงานการลงนาม',
    'deptCode': 'รหัสหน่วยงาน',
    'signOff': 'การอนุมัติ',
    'chooseDept': 'เลือกหน่วยงาน',
    'safetyContent': 'รายละเอียดความปลอดภัย',
    'finishDate': 'วันที่เสร็จสิ้น',
    'workPeriodDays': 'ระยะเวลา (วัน)',
    'tableAcceptance': 'ตารางรายละเอียดการรับมอบ',
    'manager': 'หัวหน้างาน',
    
    'catNew': 'ใหม่',
    'catRepair': 'ซ่อมแซม',
    'catRenovate': 'ปรับปรุง',
    'catOptimize': 'เพิ่มประสิทธิภาพ',
    'catPurchase': 'จัดซื้อ',
    'fileOptions': 'ตัวเลือกไฟล์',
    'downloadJson': 'ดาวน์โหลด JSON',
    'importCloud': 'นำเข้าจากคลาวด์',
    'loadLocal': 'โหลดไฟล์ JSON',
    'aiHistory': 'คำแนะนำจากประวัติ TUC',
    'aiReg': 'มาตรฐานและข้อบังคับ',
    'aiGen': 'ข้อเสนอแนะจาก AI',
    'translating': 'AI กำลังแปลคำศัพท์...',
    'noHints': 'ไม่มีข้อเสนอแนะ',
    'thresholdHistory': 'เกณฑ์การเปรียบเทียบประวัติ',
    'thresholdReg': 'เกณฑ์การเปรียบเทียบข้อบังคับ',
    'aiAnalyzeRange': 'เริ่มการวิเคราะห์แท็บนี้',
    'aiGenerating': 'กำลังสร้างใหม่...',
    'aiAbort': 'หยุด',
    'save': 'บันทึก',
    'reset': 'รีเซ็ต',
    'delete': 'ลบ',
    'batchDelete': 'ลบแบบกลุ่ม',
    'regenerate': 'AI สร้างใหม่',
    'confirm': 'ยืนยัน',
    'cancel': 'ยกเลิก',
    'yes': 'ใช่',
    'no': 'ไม่',
    'rangeRange': 'ช่วงเวลาที่ใช้งาน',
    'deptLabel': 'หน่วยงานที่สมัคร',
    'applicantLabel': 'ผู้สมัคร',
    'extLabel': 'เบอร์ต่อ',
    'validationComplete': '✅ ตรวจสอบข้อกำหนดเสร็จสิ้น',
    'syncDescription': 'คลิกด้านล่างเพื่อซิงค์ข้อกำหนดนี้กับความรู้บนคลาวด์ AI จะปรับเทียบแท็กโดยอัตโนมัติตามรหัสลับในเอกสาร',
    'finalizeSync': 'เสร็จสิ้นและซิงค์กับฐานความรู้',
    'syncing': 'กำลังซิงค์...',
    'success': 'สำเร็จ',
    'error': 'ข้อผิดพลาด',
    'prev': 'ก่อนหน้า',
    'next': 'ถัดไป',
    'page': 'หน้า',
    'section': 'หัวข้อ',

    // Boilerplate Defaults
    'defaultDependingOnProcurement': 'ขึ้นอยู่กับเนื้อหาการจัดซื้อ',
    'defaultAccordingToTuc': 'ตามข้อกำหนดของ Taiwan Union (การจัดการผู้รับเหมา, กฎความปลอดภัย, ฯลฯ)',
    'defaultAccordingToTucShort': 'ตามข้อกำหนดของ Taiwan Union',
    'defaultNationalRegs': 'ปฏิบัติตามกฎหมายระดับประเทศ',
    'defaultSafetyRegs': 'ตามกฎระเบียบของ TUC',
    'defaultInstallStd': `1. ต้องจัดเตรียมข้อมูลสำรองของโปรแกรม PLC และ HMI ก่อนและหลังการแก้ไขในวันที่ก่อสร้าง
2. โดยหลักการแล้ว ให้รักษาโปรแกรม PLC เดิมไว้ และใช้จุดช่วยสำหรับฟังก์ชันใหม่เพื่อให้สามารถกู้คืนได้อย่างรวดเร็ว
3. การก่อสร้างต้องเป็นไปตามกฎระเบียบด้านความปลอดภัยและอาชีวอนามัย
4. ต้องมีหัวหน้างานด้านความปลอดภัยประจำจุดหนึ่งคน ไม่อนุญาตให้ทำงานโดยไม่มีการควบคุมดูแล
5. การติดตั้งต้องมั่นใจในความปลอดภัยของบุคลากรและความสะดวกในการบำรุงรักษา
6. โครงการนี้มีไว้สำหรับการปฏิบัติตามหน้าที่ ไม่อนุญาตให้มีค่าใช้จ่ายเพิ่มเติม
7. สิ่งอำนวยความสะดวกโดยรวมต้องเป็นระเบียบ สวยงาม และปลอดภัย การใช้รอกต้องได้รับการอนุมัติ
8. มือจับวาล์วรหัสสีตามการใช้งาน: NO (สีน้ำเงิน) / NC (สีแดง) / ปรับ (สีเหลือง)
9. ท่อโลหะและฉากยึดทำจากวัสดุ SUS ผิวมัน
10. รักษาสภาพแวดล้อมและอุปกรณ์ให้สะอาดในระหว่างการก่อสร้าง
11. การก่อสร้างแต่ละขั้นตอนต้องมีการถ่ายภาพร่วมกับหัวหน้างาน ผู้รับเหมาต้องรับผิดชอบต่อปัญหาความถูกต้องหากไม่ได้รับการตรวจสอบ
12. งานต้องเป็นไปตามกฎหมายความปลอดภัยแรงงานและกฎการจัดการความปลอดภัยในสิ่งแวดล้อมของ TUC ค่าใช้จ่ายรวมอยู่ในสัญญาแล้ว
13. วันก่อสร้างต้องได้รับอนุมัติจากเจ้าของ
14. ขยะโลหะไปยังพื้นที่ที่ TUC กำหนด ผู้รับเหมาเป็นผู้รับผิดชอบขยะที่ไม่ใช่โลหะ
15. ให้ข้อมูลการเข้าโรงงานและสิ่งที่แนบมาเมื่อยืนยันการสั่งซื้อแล้ว`,
    'defaultAcceptance': 'การตรวจสอบความถูกต้องหลังจากใช้งานได้ 1 เดือนโดยไม่มีปัญหาหลังจากซูเปอร์ไวเซอร์ตรวจสอบร่วมกัน',
    'defaultAcceptanceExtra': 'บันทึกเพิ่มเติม',
    'defaultCompliance': `1. รับประกันหนึ่งปีหลังจากตรวจสอบความถูกต้อง รวมค่าประกัน
2. การก่อสร้างเป็นไปตามกำหนดเวลาของ TUC งานอาจถูกระงับตามความต้องการของ TUC
3. งานพิเศษ (ไฟ, ที่สูง, ฯลฯ) ต้องมีใบอนุญาตที่ได้รับอนุมัติและการดูแลของ TUC
4. ต้องทำเครื่องหมายพื้นที่อันตราย ป้องกันการเข้าโดยไม่ได้รับอนุญาต
5. การถอดท่อต้องใช้ถาดรองเพื่อป้องกันความเสียหาย/รอยรั่ว
6. งานสารเคมีอันตรายต้องใช้อุปกรณ์ป้องกันส่วนบุคคล (PPE)
7. ห้ามใช้ไฟแช็กและเครื่องตัดขัดสี ให้ใช้เลื่อยชักภายในอาคาร
8. เขตงานทำเครื่องหมายด้วยเทป/รั้ว จำเป็นต้องมีไฟเตือนในตอนกลางคืน
9. ฝ้าเพดานต้องทำความสะอาดหรืออัปเดตหากมีการสัมผัส
10. จำเป็นต้องมี PPE (แว่นตา, ถุงมือ, ชุด, หน้ากาก) สำหรับงานท่อที่เป็นอันตราย
11. สายเคเบิลชั่วคราวบนทางเดินป้องกันด้วยเทปม้าลาย
12. ต้องทำความสะอาดไซต์งานทุกวัน มีโทษปรับสำหรับผู้ฝ่าฝืน
13. ต้องสวมหมวกนิรภัย ไม่อนุญาตให้ใช้แรงงานต่างด้าวผิดกฎหมาย
14. คนงานในไซต์งานต้องมีสติ ผู้ที่มึนเมาจะถูกเชิญออกจากพื้นชุด
15. ใบอนุญาตทำงานที่มีความเสี่ยงสูงยื่นล่วงหน้า 3 วันพร้อมรายการ PPE
16. ป้ายเตือนบนแผงไฟฟ้าและเครื่องจักรที่หมุนได้
17. จำเป็นต้องได้รับการชดเชยสำหรับสิ่งอำนวยความสะดวกที่ได้รับความเสียหายในระหว่างการก่อสร้าง`,
    'defaultTblFunctional': 'ฟังก์ชันการทำงาน',
    'defaultTblQuality': 'คุณภาพ',
    'defaultTblCapacity': 'ความจุ',
    'defaultTblRuntest': 'การทดสอบการทำงาน',
    'defaultTblAppearance': 'การตรวจสอบลักษณะภายนอก',
    'defaultTblOutput': 'ความเร็วเอาต์พุต',
    'cloudInspector': 'ตัวแสดงประวัติบนคลาวด์',
    'displayName': 'ชื่อที่แสดง',
    'status': 'สถานะ',
    'createdAt': 'อัปโหลดเมื่อ',
    'actions': 'การดำเนินการ',
    'exportCsv': 'ส่งออก CSV',
    'num': 'ลำดับ',
    'uploader': 'ผู้อัปโหลด',
    'date': 'วันที่',
    'cleanup': 'ล้างข้อมูลซ้ำ',
    'reparseAll': 'เริ่มการวิเคราะห์ใหม่ทั้งหมด',
    'labelFix': 'แก้ไขคำอธิบายป้ายกำกับ',
    'changePassword': 'เปลี่ยนรหัสผ่าน',
    'processing': 'กำลังดำเนินการ',
    'progress': 'ความคืบหน้า',
    'minToBack': 'ย่อหน้าต่าง',
    'noFiles': 'ไม่พบไฟล์ประวัติในระบบ',
    'docOfficialPreview': 'ตัวอย่างฉบับทางการ',
    'docAutoFit': 'ปรับขนาดอัตโนมัติ',
    'docExportWord': 'ส่งออก Word',
    'docExportPdf': 'ส่งออก PDF',
    'docCompanyName': 'Taiwan Union Technology Corporation',
    'docCompanyEnglish': 'Taiwan Union Technology Corporation',
    'docTitle': 'แบบฟอร์มข้อกำหนดการจัดซื้อและการรับมอบ',
    'docDate': 'วันที่: ',
    'docPage': 'หน้า: ',
    'docDept': 'แผนกที่ขอ: ',
    'docRequester': 'ผู้ยื่นคำขอ: ',
    'docExtension': 'เบอร์ภายใน',
    'docSection1': '๑. ชื่ออุปกรณ์: ',
    'docSection2': '๒. สภาพแวดล้อม: ',
    'docSection3': '๓. จำนวนและหน่วย: ',
    'docSection4': '๔. ขอบเขต (Scope): ',
    'docSection5': '๕. ช่วงการใช้งาน (Range): ',
    'docSection6': '๖. ข้อกำหนดการออกแบบ',
    'docSub6_1': '๑. ข้อกำหนดสิ่งแวดล้อม: ',
    'docSub6_2': '๒. ข้อกำหนดทางกฎหมาย: ',
    'docSub6_3': '๓. ข้อกำหนดการบำรุงรักษา: ',
    'docSection7': '๗. ข้อกำหนดด้านความปลอดภัย: ',
    'docSection8': '๘. ข้อกำหนดคุณลักษณะ',
    'docSub8_1': '๑. ข้อมูลทางไฟฟ้า: ',
    'docSub8_2': '๒. ข้อมูลทางกล: ',
    'docSub8_3': '๓. ข้อมูลทางกายภาพ: ',
    'docSub8_4': '๔. ข้อมูลความน่าเชื่อถือ: ',
    'docSection9': '๙. ข้อกำหนดการติดตั้ง: ',
    'docSub9_date': 'วันส่งมอบ: ',
    'docSub9_period': 'ระยะเวลา (วัน): ',
    'docSub9_acceptance': 'การรับมอบ: ',
    'docSection10': '๑๐. ข้อควรปฏิบัติ: ',
    'docSection11': '๑๑. แบบวาด',
    'docSection12': '๑๒. ข้อกำหนดการรับมอบ',
    'docTblCat': 'หมวดหมู่',
    'docTblItem': 'รายการ',
    'docTblSpec': 'ข้อกำหนดทางเทคนิค',
    'docTblMethod': 'วิธีการทดสอบ',
    'docTblCount': 'จำนวนตัวอย่าง',
    'docTblConfirm': 'ยืนยัน',
    'docSignTitle': 'การยืนยันและการลงนามอนุมัติ',
    'docSignApplicant': 'ผู้ขอ',
    'docSignDeptHead': 'หัวหน้าแผนก',
    'docSignVendor': 'ผู้ขายยืนยัน',
    'docBottomNote1': '* ข้อกำหนดนี้ต้องระบุโดยละเอียดเพื่อใช้ในการต่อรองราคา',
    'docBottomNote2': '* พัสดุรายการนี้มีความจำเป็นต้องใช้แบบวาดประกอบหรือไม่?',
    'docImgNote': '[ข้อจำกัดของไฟล์: โปรดดูรูปภาพในไฟล์ PDF]',
    'contractorNotice': 'ข้อควรระวังสำหรับผู้รับเหมา',
    'defaultContractorNotice': `หมายเหตุ: ผู้รับเหมาต้องจัดเตรียมเอกสารต่อไปนี้ให้ครบถ้วน หากไม่สามารถปฏิบัติตามได้ จะไม่ได้รับการพิจารณาจ้างงาน
(หากข้อมูลโครงการ สถานที่ หรือรายชื่อบุคลากรไม่ตรงกัน จะต้องยื่นเอกสารใหม่และเข้าอบรมใหม่)

1. หนังสือรับรองการจัดการด้านความปลอดภัย อาชีวอนามัย และสิ่งแวดล้อม (ESHP-11-00101)
2. ใบแจ้งปัจจัยอันตรายในสภาพแวดล้อมการทำงาน (ESHP-11-00102)
3. ใบรับรองเจ้าหน้าที่ความปลอดภัย หรือผู้ควบคุมงานอันตราย (รวมถึงหลักฐานการอบรมทบทวน)
   ก. งานพิเศษ: เช่น งานยก, งานที่เกิดความร้อน, งานบนที่สูง, งานในที่อับอากาศ, งานท่ออันตราย
   ข. ใบอนุญาตที่เกี่ยวข้อง: เช่น ใบอนุญาตควบคุมเครื่องจักร, ผู้ควบคุมงานในที่ขาดออกซิเจน
4. รายชื่อบุคลากรผู้รับเหมา (ESHP-11-00103) และข้อมูลส่วนบุคคล:
   ก. คำแถลงและหนังสือยินยอมการเก็บรวบรวมข้อมูลส่วนบุคคล (ESHP-11-00104) ต้องลงนามด้วยตนเอง
   ข. ประกันภัย: ประกันสังคม หรือประกันอุบัติเหตุ (วงเงินขั้นต่ำ 5 ล้าน NTD หรือ 450,000 RMB ต่อคน) *สำเนา
   ค. บันทึกการตรวจสุขภาพพนักงาน (ไม่เกิน 2 ปี) *สำเนา
   ง. ใบรับรองการฝึกอบรมด้านความปลอดภัยและอาชีวอนามัย (6 ชั่วโมง ทุก 3 ปี)
   จ. สำหรับผู้ที่ไม่ได้ถือสัญชาติ ROC ต้องแนบสำเนาใบอนุญาตพำนัก (Residence Permit)
5. บันทึกการประชุมองค์กรข้อตกลง (ESHP-11-00111)
6. กฎระเบียบการจัดการด้านความปลอดภัยสำหรับผู้รับเหมา (ESHP-11-00113)
7. ใบสมัครงานก่อสร้างทั่วไป (ESHP-11-00115)
8. แบบฟอร์มแจ้งเตือนอันตรายภายในของผู้รับเหมา (ESHP-11-00118)
9. หนังสือรับรองการจ้างช่วงต่อ (ESHP-11-00119)

รายละเอียดการอบรมความปลอดภัย:
1. วันที่: ทุกวันพฤหัสบดี (ยกเว้นวันหยุดนักขัตฤกษ์ หรือวันที่มีการประชุมสำคัญของ TUC)
2. เวลา: 09:00~10:30 (รวมการทดสอบ)
3. จำนวน: สูงสุด 30 คนต่อรอบ (เปิดสอนหากมีผู้ลงทะเบียน 10 คนขึ้นไป)
4. สถานที่: ห้องอบรม ชั้น B1
5. การลงทะเบียน: กรอกแบบฟอร์มสัมมนาการฝึกอบรม ESH (ดูเอกสารแนบ)
6. กำหนดการ: ลงทะเบียนล่วงหน้าอย่างน้อยหนึ่งสัปดาห์

หากคุณมีข้อเสนอแนะหรือข้อสงสัยเกี่ยวกับขั้นตอน โปรดตอบกลับอีเมลนี้`,
    
    'inputPlaceholder': 'โปรดป้อน ',
    'aiSearchPending': '🔍 AI กำลังค้นหาในพื้นหลัง...',
    'aiNoKey': '⚠️ ไม่พบคีย์ API',
    'aiNoKeyDesc': 'โปรดป้อน VITE_GEMINI_KEY ในการตั้งค่าเพื่อเปิดใช้งานการวิเคราะห์เชิงความหมาย',
    'aiError': '❌ ข้อผิดพลาดในการวิเคราะห์ AI',
    'aiErrorDesc': 'โควต้า API เกินหรือปัญหาเครือข่าย ความแม่นยำอาจลดลง',
    'hintSelectHistory': 'เลือกเนื้อหาประวัติเพื่อนำเข้า...',
    'hintSelectReg': 'เลือกเนื้อหากฎระเบียบเพื่อนำเข้า...',
    'hintSelectGen': 'เลือกเนื้อหาคำแนะนำเพื่อนำเข้า...',
    'source': 'แหล่งที่มา',
    'unknown': 'ไม่ทราบ',
    
    'importCloudTitle': 'โหลดจากฐานความรู้คลาวด์',
    'searchEqPlaceholder': 'ค้นหาชื่ออุปกรณ์...',
    'loadingCloud': 'กำลังโหลดรายการคลาวด์...',
    'noCloudMatch': 'ไม่พบเอกสารคลาวด์ที่ตรงกัน',
    'needAiAssemble': '[ต้องการการประกอบ AI]',
    'aiAssembleTip': 'เคล็ดลับ: เอกสารที่ทำเครื่องหมายว่า [ต้องการการประกอบ AI] จะใช้ Gemini เพื่อกู้คืนฟิลด์',
    'aiAssembleFail': 'การประกอบ AI ล้มเหลว ข้อความสำคัญอาจหายไป',
    'parseError': 'เกิดข้อผิดพลาดระหว่างการแยกวิเคราะห์',
    'unnamedEq': 'อุปกรณ์นิรนาม',
    
    'wizardTitle': 'การวิเคราะห์อัจฉริยะและการเหนี่ยวนำข้อมูลจำเพาะ',
    'wizardDesc': 'อัปโหลด PDF/รูปภาพ รุ่นเก่า AI จะดึงเนื้อหาเทคนิคเข้าสู่ฐานความรู้',
    'minimizeTip': 'ย่อไว้ที่พื้นหลัง',
    'selectFile': 'เลือกไฟล์',
    'supportFiles': 'รองรับ: PDF, Word (.doc/.docx), รูปภาพ',
    'aiParsing': 'AI กำลังแยกวิเคราะห์...',
    'queueRemaining': 'เหลืออยู่ในคิว: ',
    'items': ' รายการ',
    'totalProgress': 'ความคืบหน้าทั้งหมด',
    'recentUploads': 'ผลลัพธ์ล่าสุด',
    'noRecentRecords': 'ไม่พบประวัติล่าสุด',
    'viewOriginal': 'ดูไฟล์ต้นฉบับ',
    'expertTip': 'คำแนะนำจากผู้เชี่ยวชาญ: ',
    'jsonStored': 'ระบบบันทึกข้อมูลเป็น JSON ที่มีโครงสร้าง',
    'loadAiResultPrefix': '🚀 โหลดผลลัพธ์ AI ของ "',
    'loadAiResultSuffix': '"',
    'uploadComplete': 'การอัปโหลดและการวิเคราะห์เสร็จสมบูรณ์!',
    'successCount': 'สำเร็จ',
    'skippedCount': 'ข้าม',
    'interrupted': 'กระบวนการขัดข้อง',
    
    'addRow': 'เพิ่มแถว',
    'maxImages': 'อัปโหลดได้สูงสุด 6 รูป',
    'captionPlaceholder': 'ป้อนคำอธิบายภาพ...',
    'clickToUpload': 'คลิกเพื่ออัปโหลดรูปภาพ',
    
    'languageLabel': 'ภาษา:',
    'deleteRecord': 'ลบบันทึก',
    'exportPdf': 'ส่งออก PDF',
    'itemsSuffix': 'รายการ',
    'resourceUsage': 'ตรวจสอบการใช้ทรัพยากร',
    'knowledgeEntries': 'จำนวนรายการความรู้ (รายการ)',
    'storageFiles': 'จำนวนไฟล์ที่จัดเก็บ (ไฟล์)',
    'safeLimit': 'ขีดจำกัดที่ปลอดภัย (ฟรี)',
    'warningHighUsage': '⚠️ คำเตือน: การใช้ทรัพยากรใกล้ถึงขีดจำกัดแล้ว โปรดล้างข้อมูลเก่าออกบ้าง',
    'cleanupLargeFiles': 'ล้างไฟล์ขนาดใหญ่',
    'sizeLimitLabel': 'ลบไฟล์ที่ใหญ่กว่า',
    'confirmDeleteLarge': 'คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ทั้งหมดที่ใหญ่กว่า {n} MB?\n(ตรวจพบทั้งหมด {count} ไฟล์)',
    'noReqDesc': 'ไม่มีรายละเอียดความต้องการ',
    'systemSubtitle': 'เครื่องมือสร้างข้อกำหนดการจัดซื้อ TUC',
    'parsedCount': 'วิเคราะห์แล้ว',
    'viewFull': 'ดูในแท็บใหม่',
    'invalidJson': 'ไฟล์ JSON ไม่ถูกต้อง',
    'confirmReset': 'คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด? (ไม่สามารถย้อนกลับได้)',
    'resetSuccess': '✅ ข้อมูลถูกรีเซ็ตเป็นค่าเริ่มต้นแล้ว',
    'syncErrorReq': 'กรุณากรอกชื่ออุปกรณ์และคำอธิบายความต้องการก่อนทำการซิงค์',
    'syncSuccessBatch': '✅ ซิงค์สำเร็จ! อัปเดต {n} รายการทางเทคนิค (ID: {id}...)',
    'syncFail': '❌ การซิงค์ล้มเหลว:',
    'dbClean': 'ฐานข้อมูลสะอาดมาก ไม่พบไฟล์ที่ซ้ำกัน',
    'cleanSuccess': 'ล้างข้อมูลเสร็จสิ้น! ลบเรคคอร์ดที่ซ้ำกัน {n} รายการ',
    'cleanError': 'การล้างข้อมูลล้มเหลว:',
    'tagUpdateFail': 'การอัปเดตแท็กฟล้มเหลว:',
    'confirmCalibrate': 'ระบบจะวิเคราะห์เนื้อหาเอกสารทั้งหมดเพื่อระบุและปรับเทียบ "แท็กอุปกรณ์" ที่ถูกต้องโดยอัตโนมัติ\nซึ่งจะช่วยแก้ไขความเชื่อมโยงที่ผิดพลาด ยืนยันการดำเนินการ?',
    'forceReparse': 'บังคับวิเคราะห์ใหม่',

    // Queue Status Dashboard
    'queueOverview': 'สถานะคิว',
    'allFiles': 'ทั้งหมด',
    'autoRefreshHint': 'กำลังประมวลผลเบื้องหลัง อัปเดตทุก 15 วินาที',
    'queueParsed': 'วิเคราะห์แล้ว',
    'queuePending': 'รอดำเนินการ',
    'queueProcessing': 'กำลังวิเคราะห์',
    'queueFailed': 'ล้มเหลว',
    'unparsed': 'ยังไม่วิเคราะห์',
    'tabUnlabeled': 'แก้ไขแท็ก',
    'completionRate': 'อัตราสำเร็จ',
    'enqueueUnparsed': 'ส่งรายการล้มเหลว/ยังไม่วิเคราะห์เข้าคิว',
    'batchReparse': 'วิเคราะห์ซ้ำแบบกลุ่ม',
    'confirmReparseBatch': 'คุณแน่ใจหรือไม่ว่าต้องการส่งไฟล์ {n} รายการเหล่านี้เพื่อวิเคราะห์ใหม่ในพื้นหลัง?\n(ระบบจะส่งเป็นชุดเพื่อหลีกเลี่ยงการหมดเวลา)',
    'statusPending': 'อยู่ในคิว',
    'statusProcessing': 'เซิร์ฟเวอร์กำลังวิเคราะห์',
    'statusFailed': 'วิเคราะห์ล้มเหลว',
    'aiTranslatingContent': 'AI กำลังแปลเชิงลึก...',
    'aiTranslatingHint': 'กำลังแปลเนื้อหาจากคลาวด์เป็นภาษาที่คุณเลือก โปรดรอสักครู่',
    'changeAdminPwd': 'เปลี่ยนรหัสผ่านผู้ดูแลระบบ',
    'adminAuth': 'การยืนยันตัวตนผู้ดูแลระบบ',
    'newPwdHint': 'ป้อนรหัสผ่านใหม่ (อย่างน้อย 6 หลัก)',
    'enterPwdHint': 'พื้นที่นี้ได้รับการคุ้มครอง โปรดป้อนรหัสผ่านผู้ดูแลระบบ',
    'newPwdPlaceholder': 'รหัสผ่านใหม่...',
    'pwdPlaceholder': 'ป้อนรหัสผ่าน...',
    'saveNewPwd': 'บันทึกรหัสผ่านใหม่'
  }
};

export type Language = 'zh-TW' | 'zh-CN' | 'en-US' | 'th-TH';

export const t = (key: string, lang: Language): string => {
  return translations[lang]?.[key] || key;
};
