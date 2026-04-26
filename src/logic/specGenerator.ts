import type { FormState } from '../types/form';
import { t } from '../lib/i18n';

export const processAutoNumbering = (text: string): string => {
  if (!text) return '';
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return lines.map((line, index) => {
    const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
    return `${index + 1}. ${cleanLine}`;
  }).join('\n');
};

export const getFullSpecName = (data: FormState): string => {
  const catMap: Record<string, string> = {
    '新增': 'catNew',
    '修繕': 'catRepair',
    '整改': 'catRenovate',
    '優化': 'catOptimize',
    '購置': 'catPurchase'
  };
  const categoryTranslation = catMap[data.category] ? t(catMap[data.category], data.language) : data.category;
  return `${data.equipmentName} (${categoryTranslation})`;
};

// 此函式提供純文字版的草稿生成，用於複製或簡易預覽
export const generateDraftMarkdown = (data: FormState): string => {
  const { 
    equipmentName, requirementDesc, 
    appearance, quantityUnit,
    envRequirements, envAIHints,
    regRequirements, regAIHints,
    maintRequirements,
    safetyRequirements, safetyAIHints,
    elecSpecs, mechSpecs, physSpecs, relySpecs,
    installStandard, deliveryDate, workPeriod,
    acceptanceDesc, acceptanceAIHints, acceptanceExtra,
    complianceDesc,
    tableData
  } = data;

  const selectedEnv = envAIHints.filter(h => h.selected).map(h => `- ${h.content} ([Link](${h.link}))`).join('\n');
  const selectedReg = regAIHints.filter(h => h.selected).map(h => `- ${h.content} ([Link](${h.link}))`).join('\n');
  const selectedSafety = safetyAIHints.filter(h => h.selected).map(h => `- ${h.content} ([Link](${h.link}))`).join('\n');
  const selectedAcceptance = acceptanceAIHints.filter(h => h.selected).map(h => `- ${h.content} ([Link](${h.link}))`).join('\n');

  return `
# 台燿科技股份有限公司
## Taiwan Union Technology Corporation
## 請購驗收規範表

### 一、 名稱
${getFullSpecName(data)}

#### 需求說明
${requirementDesc}

### 二、 品相
${appearance}

### 三、 數量、單位
${quantityUnit}

### 四、 工程適用範圍
${equipmentName}

### 五、 工程適用區間
${equipmentName} 所在位置周遭區域

### 六、 設計要求
1. 環保要求：
   ${envRequirements}
${selectedEnv ? `\n   **AI 建議補充：**\n   ${selectedEnv}` : ''}

2. 法規要求：
   ${regRequirements}
${selectedReg ? `\n   **AI 建議補充：**\n   ${selectedReg}` : ''}

3. 維護要求：
   ${maintRequirements}

### 七、 安全要求
${safetyRequirements}
${selectedSafety ? `\n**AI 建議補充：**\n${selectedSafety}` : ''}

### 八、 特性要求
1. 電氣特性規格：${elecSpecs}
2. 機構特性規格：${mechSpecs}
3. 物理特性要求：${physSpecs}
4. 信賴特性要求：${relySpecs}

### 九、 安裝程序要求
#### 施工標準：
${processAutoNumbering(installStandard)}

#### 交期：${deliveryDate}
#### 工期：${workPeriod}

#### 驗收：
${acceptanceDesc}
${selectedAcceptance ? `\n**AI 建議補充：**\n${selectedAcceptance}` : ''}
${acceptanceExtra}

### 十、 遵守事項
${processAutoNumbering(complianceDesc)}

### 十二、 驗收要求表格
| 類別 | 項目 | 規格要求 | 測試方法 | 樣品數 | 確認 |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableData.map(r => `| ${r.category || ' '} | ${r.item || ' '} | ${r.spec || 'NA'} | ${r.method || 'NA'} | ${r.samples || 'NA'} | ${r.confirmation || 'NA'} |`).join('\n')}
`;
};
