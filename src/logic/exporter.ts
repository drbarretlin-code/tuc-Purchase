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
  VerticalAlign,
  PageBreak 
} from 'docx';
import type { FormState } from '../types/form';
import { t } from '../lib/i18n';
import type { Language } from '../lib/i18n';
import { getFullSpecName, processAutoNumbering } from './specGenerator';

export const exportToPDF = async (data: FormState) => {
  // 對於高品質、可搜尋、且具有完美分頁邏輯的需求，呼叫瀏覽器原生列印對話框是最穩定的方案。
  // 若傳入的 data 與當前語系不同，表示為即時轉譯版本。
  
  // 保存原標題
  const originalTitle = document.title;
  const timestamp = new Date().getTime();
  const filename = `${data.equipmentName || 'TUC_Spec'}_${timestamp}`;
  
  // 設定列印時的檔名 (透過修改 document.title)
  document.title = filename;

  // 執行列印
  window.print();

  // 恢復原標題
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
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

  const vStr = (text: string | null | undefined) => {
    if (!text) return 'NA';
    if (text.startsWith('default')) {
      if (lang === 'th-TH') {
        return `${t(text, lang)}\n${t(text, 'zh-TW')}`;
      }
      return t(text, lang);
    }
    return text;
  };

  const lStr = (key: string) => {
    if (lang === 'th-TH') {
      return `${t(key, lang)}\n${t(key, 'zh-TW')}`;
    }
    return t(key, lang);
  };

  const createMultilineParagraphs = (text: string, spacingAfter = 40, lastSpacingAfter = 200) => {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [new Paragraph({ text: 'NA', spacing: { after: lastSpacingAfter } })];
    return lines.map((l, i) => {
      const isZh = lang === 'th-TH' && /[一-龥]/.test(l);
      return new Paragraph({ 
        children: [new TextRun({ text: l, color: isZh ? "666666" : undefined, size: isZh ? 18 : undefined })], 
        spacing: { after: i === lines.length - 1 ? lastSpacingAfter : spacingAfter } 
      });
    });
  };

  const createTextRuns = (text: string, bold = false) => {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
    return lines.map((l, i) => {
      const isZh = lang === 'th-TH' && /[一-龥]/.test(l);
      return new TextRun({ text: l, bold: isZh ? false : bold, break: i > 0 ? 1 : 0, color: isZh ? "666666" : undefined, size: isZh ? 18 : undefined });
    });
  };

  const bodyContent = [
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(`${lStr('docSection1')} ${getFullSpecName(data)}`, true)] }),
    new Paragraph({ children: [...createTextRuns(`${lStr('reqDesc')}：`, true)] }),
    ...createMultilineParagraphs(data.requirementDesc || 'NA'),
    
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection2'), true)] }),
    ...createMultilineParagraphs(vStr(data.appearance)),
    
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(`${lStr('docSection3')} ${vStr(data.quantityUnit)}`, true)], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection4'), true)] }),
    new Paragraph({ children: [...createTextRuns(vStr(data.equipmentName))], spacing: { after: 200 } }),
    
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection5'), true)] }),
    ...createMultilineParagraphs(vStr(data.rangeRange)),
    
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection6'), true)] }),
    new Paragraph({ children: [...createTextRuns(lStr('docSub6_1'), true), new TextRun({ text: " " }), ...createTextRuns(vStr(data.envRequirements))] }),
    new Paragraph({ children: [...createTextRuns(lStr('docSub6_2'), true), new TextRun({ text: " " }), ...createTextRuns(vStr(data.regRequirements))] }),
    new Paragraph({ children: [...createTextRuns(lStr('docSub6_3'), true), new TextRun({ text: " " }), ...createTextRuns(vStr(data.maintRequirements))], spacing: { after: 200 } }),
    
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection7'), true)] }),
    ...createMultilineParagraphs(vStr(data.safetyRequirements)),
    
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection8'), true)], spacing: { after: 100 } }),
    new Paragraph({ children: [...createTextRuns(`${lStr('docSub8_1')} ${vStr(data.elecSpecs)}`)] }),
    new Paragraph({ children: [...createTextRuns(`${lStr('docSub8_2')} ${vStr(data.mechSpecs)}`)] }),
    new Paragraph({ children: [...createTextRuns(`${lStr('docSub8_3')} ${vStr(data.physSpecs)}`)] }),
    new Paragraph({ children: [...createTextRuns(`${lStr('docSub8_4')} ${vStr(data.relySpecs)}`)] }),
    
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection9'), true)], spacing: { before: 200, after: 100 } }),
    ...createMultilineParagraphs(processAutoNumbering(vStr(data.installStandard)), 40, 40),
    new Paragraph({ children: [...createTextRuns(`${lStr('docSub9_date')} ${data.deliveryDate || 'NA'} | ${lStr('docSub9_period')} ${data.workPeriod || 'NA'}`, true)], spacing: { before: 100, after: 100 } }),
    new Paragraph({ children: [...createTextRuns(`${lStr('docSub9_acceptance')} `, true), ...createTextRuns(vStr(data.acceptanceDesc))], spacing: { after: 200 } }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection10'), true)], spacing: { before: 200, after: 100 } }),
    ...createMultilineParagraphs(processAutoNumbering(vStr(data.complianceDesc)), 40, 40),
    
    
    // 廠商注意事項 (A4 直向整頁)
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ 
      heading: HeadingLevel.HEADING_4, 
      children: [...createTextRuns(lStr('contractorNotice'), true).map(run => ({ ...run, size: 28 }))],
      spacing: { before: 200, after: 200 }
    }),
    ...createMultilineParagraphs(vStr(data.contractorNotice), 40, 0),
  ];

  const optionalSections: (Paragraph | Table)[] = [];
  if (hasImages) {
    optionalSections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection11'), true)], spacing: { before: 400 } }),
      new Paragraph({ children: [...createTextRuns(lStr('docImgNote'))] }),
      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [...createTextRuns(lStr('docSection12'), true)], spacing: { before: 400, after: 200 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(lStr('docTblCat'), true)], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(lStr('docTblItem'), true)], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(lStr('docTblSpec'), true)], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(lStr('docTblMethod'), true)], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(lStr('docTblCount'), true)], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(lStr('docTblConfirm'), true)], alignment: AlignmentType.CENTER })], shading: { fill: "F5F5F5" } }),
            ]
          }),
          ...data.tableData.map(row => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(vStr(row.category))] })] }),
              new TableCell({ children: [new Paragraph({ children: [...createTextRuns(vStr(row.item))] })] }),
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
        new Paragraph({ text: lang === 'th-TH' ? 'Taiwan Union Technology (THAILAND) CO., LTD.' : t('docCompanyName', lang), style: "TUCMainTitle" }),
        ...(lang !== 'th-TH' ? [new Paragraph({ text: t('docCompanyEnglish', lang), style: "TUCCenter", spacing: { after: 200 } })] : []),
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
