import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableCell, 
  TableRow, 
  WidthType, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle, 
  VerticalAlign 
} from 'docx';
import type { FormState } from '../types/form';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';
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

export const exportToWord = async (data: FormState, lang: Language) => {
  const timestamp = formatDate(new Date());
  const filename = `${data.equipmentName || 'TUC_Spec'}_${timestamp}`;
  const hasImages = data.images.length > 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === 'en-US' ? 'en-US' : (lang === 'th-TH' ? 'th-TH' : (lang === 'zh-CN' ? 'zh-CN' : 'zh-TW')));

  const bodyContent = [
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: `${t('docSection1', lang)}${getFullSpecName(data)}`, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: `${t('reqDesc', lang)}：`, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.requirementDesc || 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection2', lang), bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.appearance || 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: `${t('docSection3', lang)}${data.quantityUnit || 'NA'}`, bold: true })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection4', lang), bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.equipmentName || 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection5', lang), bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.equipmentScope || 'NA' })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection6', lang), bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: t('docSub6_1', lang), bold: true }), new TextRun({ text: data.envRequirements })] }),
    new Paragraph({ children: [new TextRun({ text: t('docSub6_2', lang), bold: true }), new TextRun({ text: data.regRequirements })] }),
    new Paragraph({ children: [new TextRun({ text: t('docSub6_3', lang), bold: true }), new TextRun({ text: data.maintRequirements })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection7', lang), bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.safetyRequirements })], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection8', lang), bold: true })], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: `${t('docSub8_1', lang)} ${data.elecSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `${t('docSub8_2', lang)} ${data.mechSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `${t('docSub8_3', lang)} ${data.physSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `${t('docSub8_4', lang)} ${data.relySpecs}` })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection9', lang), bold: true })], spacing: { before: 200 } }),
    ...processAutoNumbering(data.installStandard).split('\n').map(l => new Paragraph({ children: [new TextRun({ text: l })] })),
    new Paragraph({ children: [new TextRun({ text: `${t('docSub9_date', lang)} ${data.deliveryDate || 'NA'} | ${t('docSub9_period', lang)} ${data.workPeriod || 'NA'}`, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: `${t('docSub9_acceptance', lang)} `, bold: true }), new TextRun({ text: data.acceptanceDesc })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection10', lang), bold: true })], spacing: { before: 200 } }),
    ...processAutoNumbering(data.complianceDesc).split('\n').map(l => new Paragraph({ children: [new TextRun({ text: l })] })),
  ];

  const optionalSections: (Paragraph | Table)[] = [];
  if (hasImages) {
    optionalSections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection11', lang), bold: true })], spacing: { before: 400 } }),
      new Paragraph({ text: t('docImgNote', lang) }),
      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: t('docSection12', lang), bold: true })], spacing: { before: 400, after: 200 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('docTblCat', lang), bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('docTblItem', lang), bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('docTblSpec', lang), bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('docTblMethod', lang), bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('docTblCount', lang), bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('docTblConfirm', lang), bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
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

  // V9.9: 規格確認及會簽表格重構已移至下方 infoTable 之後，此處僅保留邏輯佔位符以進行結構替換

  // V9.9: 修復頂部資訊列表擠壓 (DXA 為單位，總長約 9066)
  const infoTable = new Table({
    width: { size: 9066, type: WidthType.DXA },
    columnWidths: [3022, 3022, 3022],
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${t('docDept', lang)}${data.department || 'NA'}`, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${t('docRequester', lang)}${data.requester || 'NA'} (${data.extension || ''})`, size: 20 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${t('docDate', lang)}${dateStr}`, size: 20 })], alignment: AlignmentType.RIGHT })] }),
        ]
      })
    ]
  });

  // V9.9: 重構規格確認及會簽表格 (符合打勾圖示格式)
  // Grid: 6 columns
  const colSize = Math.floor(9066 / 6);
  const signOffTable = new Table({
    width: { size: 9066, type: WidthType.DXA },
    columnWidths: [colSize, colSize, colSize, colSize, colSize, colSize],
    rows: [
      // Row 1: 申請人(1) | 姓名(2) | 申請單位主管(1) | 姓名(2)
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: t('docSignApplicant', lang), bold: true })], alignment: AlignmentType.CENTER })], 
            shading: { fill: "F5F5F5" }, verticalAlign: VerticalAlign.CENTER 
          }),
          new TableCell({ 
            children: [new Paragraph({ text: data.applicantName, alignment: AlignmentType.CENTER })], 
            columnSpan: 2, verticalAlign: VerticalAlign.CENTER 
          }),
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: t('docSignDeptHead', lang), bold: true })], alignment: AlignmentType.CENTER })], 
            shading: { fill: "F5F5F5" }, verticalAlign: VerticalAlign.CENTER 
          }),
          new TableCell({ 
            children: [new Paragraph({ text: data.deptHeadName, alignment: AlignmentType.CENTER })], 
            columnSpan: 2, verticalAlign: VerticalAlign.CENTER 
          }),
        ]
      }),
      // Rows 2-4: 左側 4 欄為 Grid，右側 2 欄垂直合併為「廠商確認」
      ...[0, 1, 2].map(rowIndex => {
        const rowData = data.signOffGrid[rowIndex] || ["", "", "", "", "", ""];
        const cells = [
          // 左側 4 欄
          ...[0, 1, 2, 3].map(colIndex => new TableCell({
            children: [new Paragraph({ text: rowData[colIndex] || "", alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
            width: { size: colSize, type: WidthType.DXA }
          })),
          // 右側 2 欄 (垂直合併)
          new TableCell({
            children: rowIndex === 0 ? [new Paragraph({ children: [new TextRun({ text: t('docSignVendor', lang), bold: true })], alignment: AlignmentType.CENTER })] : [new Paragraph({ text: "" })],
            columnSpan: 2,
            verticalMerge: rowIndex === 0 ? "restart" : "continue" as any,
            shading: rowIndex === 0 ? { fill: "F5F5F5" } : undefined,
            verticalAlign: VerticalAlign.CENTER
          })
        ];
        return new TableRow({ children: cells });
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
        new Paragraph({ text: t('docCompanyName', lang), style: "TUCMainTitle" }),
        new Paragraph({ text: t('docCompanyEnglish', lang), style: "TUCCenter", spacing: { after: 200 } }),
        new Paragraph({ 
          children: [new TextRun({ text: t('docTitle', lang), bold: true, size: 36, underline: { color: "000000" } })], 
          style: "TUCCenter", 
          spacing: { before: 200, after: 300 } 
        }),
        infoTable,
        new Paragraph({ text: "", spacing: { after: 400 } }),
        ...bodyContent,
        ...optionalSections,
        new Paragraph({ 
          children: [new TextRun({ text: t('docSignTitle', lang), bold: true })], 
          style: "TUCCenter", 
          spacing: { before: 400, after: 200 } 
        }),
        signOffTable,
        new Paragraph({ 
          children: [new TextRun({ text: t('docBottomNote1', lang), color: "E60012", size: 18, bold: true })], 
          spacing: { before: 400, after: 100 } 
        }),
        new Paragraph({ 
          children: [
            new TextRun({ text: `${t('docBottomNote2', lang)}  `, size: 22 }),
            new TextRun({ text: data.needsDrawing === 'YES' ? `☑${t('yes', lang)}` : `□${t('yes', lang)}`, size: 22 }),
            new TextRun({ text: "    ", size: 22 }),
            new TextRun({ text: data.needsDrawing === 'NO' ? `☑${t('no', lang)}` : `□${t('no', lang)}`, size: 22 })
          ], 
          spacing: { after: 200 } 
        })
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
