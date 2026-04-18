import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, HeadingLevel, VerticalAlign, BorderStyle
} from 'docx';
import type { FormState } from '../types/form';
import { getFullSpecName, processAutoNumbering } from './specGenerator';

export const exportToPDF = async (_elementId: string, _data: FormState) => {
  // 對於高品質、可搜尋、且具有完美分頁邏輯的需求，呼叫瀏覽器原生列印對話框是最穩定的方案。
  // 注意：CSS 的 @media print 樣式已在 index.css 中配置完成。
  window.print();
};

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}${s}`;
};

export const exportToWord = async (data: FormState) => {
  const timestamp = formatDate(new Date());
  const filename = `${data.equipmentName || 'TUC_Spec'}_${timestamp}`;
  const hasImages = data.images.length > 0;

  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  const bodyContent = [
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: `一、 名稱：${getFullSpecName(data)}`, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: "需求說明：", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.requirementDesc || 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "二、 品相：", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.appearance || 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: `三、 數量、單位：${data.quantityUnit || 'NA'}`, bold: true })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "四、 工程(或設備)適用範圍(Scope)：", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.equipmentName || 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "五、 工程(或設備)適用區間(Range)：", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.equipmentName ? `${data.equipmentName} 所在位置周遭區域` : 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "六、 設計要求", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: "1. 環保要求：", bold: true }), new TextRun({ text: data.envRequirements })] }),
    new Paragraph({ children: [new TextRun({ text: "2. 法規要求：", bold: true }), new TextRun({ text: data.regRequirements })] }),
    new Paragraph({ children: [new TextRun({ text: "3. 維護要求：", bold: true }), new TextRun({ text: data.maintRequirements })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "七、 安全要求：", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.safetyRequirements })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "八、 特性要求", bold: true })], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: `1. 電氣特性規格: ${data.elecSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `2. 機構特性規格: ${data.mechSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `3. 物理特性要求: ${data.physSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `4. 信賴特性要求: ${data.relySpecs}` })] }),
    ...(data.customSpec1Name ? [new Paragraph({ children: [new TextRun({ text: `${data.customSpec1Name}: ${data.customSpec1Value}` })] })] : []),
    ...(data.customSpec2Name ? [new Paragraph({ children: [new TextRun({ text: `${data.customSpec2Name}: ${data.customSpec2Value}` })] })] : []),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "九、 安裝程序要求", bold: true })], spacing: { before: 200 } }),
    ...processAutoNumbering(data.installStandard).split('\n').map(l => new Paragraph({ children: [new TextRun({ text: l })] })),
    new Paragraph({ children: [new TextRun({ text: `完工日期：${data.deliveryDate || 'NA'} | 工期（天）：${data.workPeriod || 'NA'}`, bold: true })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "十、 遵守事項", bold: true })], spacing: { before: 200 } }),
    ...processAutoNumbering(data.complianceDesc).split('\n').map(l => new Paragraph({ children: [new TextRun({ text: l })] })),
  ];

  const optionalSections: (Paragraph | Table)[] = [];
  if (hasImages) {
    optionalSections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "十一、 圖說", bold: true })], spacing: { before: 400 } }),
      new Paragraph({ text: "[圖片由於格式限制，請參考預覽界面或 PDF 匯出版]" }),
      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "十二、 請購驗收要求", bold: true })], spacing: { before: 400, after: 200 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "類別", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "項目", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "規格要求", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "測試方法", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "樣品數", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "確認", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
            ]
          }),
          ...data.tableData.map(row => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: row.category })] }),
              new TableCell({ children: [new Paragraph({ text: row.item })] }),
              new TableCell({ children: [new Paragraph({ text: row.spec })] }),
              new TableCell({ children: [new Paragraph({ text: row.method })] }),
              new TableCell({ children: [new Paragraph({ text: row.samples, alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ text: row.confirmation, alignment: AlignmentType.CENTER })] }),
            ]
          }))
        ]
      })
    );
  }

  // Flattened Sign-off Table (Fixed structure with Twips for maximum stability)

  // Flattened Sign-off Table (Highly Stable with Table-level ColumnWidths)
  const twipsPerCol = 1511; // 9066 total
  const signOffTable = new Table({
    width: { size: twipsPerCol * 6, type: WidthType.DXA },
    columnWidths: [twipsPerCol, twipsPerCol, twipsPerCol, twipsPerCol, twipsPerCol, twipsPerCol],
    rows: [
      // Row 1: Applicant / Dept Head (Mapped to 6-col grid [1, 1, 1, 3])
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: "申請人", bold: true })], alignment: AlignmentType.CENTER })], 
            shading: { fill: "F9F9F9" }, 
            verticalAlign: VerticalAlign.CENTER 
          }),
          new TableCell({ 
            children: [new Paragraph({ text: data.applicantName, alignment: AlignmentType.CENTER })], 
            verticalAlign: VerticalAlign.CENTER 
          }),
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: "單位主管", bold: true })], alignment: AlignmentType.CENTER })], 
            shading: { fill: "F9F9F9" }, 
            verticalAlign: VerticalAlign.CENTER 
          }),
          new TableCell({ 
            children: [new Paragraph({ text: data.deptHeadName, alignment: AlignmentType.CENTER })], 
            columnSpan: 3, 
            verticalAlign: VerticalAlign.CENTER 
          }),
        ]
      }),
      // Main 3x6 Sign-off Matrix Rows
      ...data.signOffGrid.map(row => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ text: cell, alignment: AlignmentType.CENTER })],
          verticalAlign: VerticalAlign.CENTER
        }))
      })),
      // Final Vendor Confirmation Row
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: "廠商確認", bold: true })], alignment: AlignmentType.CENTER })], 
            shading: { fill: "F9F9F9" }, 
            verticalAlign: VerticalAlign.CENTER 
          }),
          new TableCell({ 
            children: [new Paragraph({ text: " " }), new Paragraph({ text: " " })], 
            columnSpan: 5, 
            verticalAlign: VerticalAlign.CENTER 
          })
        ]
      })
    ]
  });

  // Header Info Table (To ensure Unit, Requester, Date are on one row)
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `申請單位：${data.department || 'NA'}`, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `申請人員：${data.requester || 'NA'} (${data.extension || ''})`, size: 20 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `申請日期：${dateStr}`, size: 20 })], alignment: AlignmentType.RIGHT })] }),
        ]
      })
    ]
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Microsoft JhengHei", size: 22 }
        }
      },
      paragraphStyles: [
        {
          id: "TUCMainTitle",
          name: "TUC Main Title",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 40, bold: true, font: "Microsoft JhengHei" },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 } }
        },
        {
          id: "TUCCenter",
          name: "TUC Center",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 22, font: "Microsoft JhengHei" },
          paragraph: { alignment: AlignmentType.CENTER }
        }
      ]
    },
    sections: [{
      children: [
        new Paragraph({ text: "台燿科技股份有限公司", style: "TUCMainTitle" }),
        new Paragraph({ text: "Taiwan Union Technology Corporation", style: "TUCCenter", spacing: { after: 200 } }),
        new Paragraph({ 
          children: [new TextRun({ text: "請購驗收規範表", bold: true, size: 36, underline: { color: "000000" } })], 
          style: "TUCCenter", 
          spacing: { before: 200, after: 300 } 
        }),
        infoTable,
        new Paragraph({ text: "", spacing: { after: 400 } }),
        ...bodyContent,
        ...optionalSections,
        new Paragraph({ 
          children: [new TextRun({ text: "規格確認及會簽", bold: true })], 
          style: "TUCCenter", 
          spacing: { before: 400, after: 200 } 
        }),
        signOffTable
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
