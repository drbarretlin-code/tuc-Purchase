import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, HeadingLevel 
} from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { FormState } from '../types/form';
import { getFullSpecName, processAutoNumbering } from './specGenerator';

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
};

export const exportToWord = async (data: FormState, filename: string) => {
  // Header Section
  const headerContent = [
    new Paragraph({
      children: [new TextRun({ text: "台燿科技股份有限公司", bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "Taiwan Union Technology Corporation", size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "請購驗收規範表", bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ];

  // Body Sections
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

    // Section VI
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "六、 設計要求", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: "1. 環保要求：", bold: true }), new TextRun({ text: data.envRequirements })] }),
    ...data.envAIHints.filter(h => h.selected).map(h => new Paragraph({ children: [new TextRun({ text: `• ${h.content}`, size: 20, color: "555555" })] })),

    new Paragraph({ children: [new TextRun({ text: "2. 法規要求：", bold: true }), new TextRun({ text: data.regRequirements })] }),
    ...data.regAIHints.filter(h => h.selected).map(h => new Paragraph({ children: [new TextRun({ text: `• ${h.content}`, size: 20, color: "555555" })] })),

    new Paragraph({ children: [new TextRun({ text: "3. 維護要求：", bold: true }), new TextRun({ text: data.maintRequirements })], spacing: { after: 200 } }),

    // Section VII
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "七、 安全要求：", bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: data.safetyRequirements })] }),
    ...data.safetyAIHints.filter(h => h.selected).map(h => new Paragraph({ children: [new TextRun({ text: `• ${h.content}`, size: 20, color: "555555" })] })),

    // Section VIII
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "八、 特性要求", bold: true })], spacing: { before: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `1. 電氣特性規格: ${data.elecSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `2. 機構特性規格: ${data.mechSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `3. 物理特性要求: ${data.physSpecs}` })] }),
    new Paragraph({ children: [new TextRun({ text: `4. 信賴特性要求: ${data.relySpecs}` })] }),
    ...(data.customSpec1Name ? [new Paragraph({ children: [new TextRun({ text: `${data.customSpec1Name}: ${data.customSpec1Value}` })] })] : []),
    ...(data.customSpec2Name ? [new Paragraph({ children: [new TextRun({ text: `${data.customSpec2Name}: ${data.customSpec2Value}` })] })] : []),

    // Section IX
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "九、 安裝程序要求", bold: true })], spacing: { before: 200 } }),
    new Paragraph({ children: [new TextRun({ text: "施工標準：", bold: true })] }),
    ...processAutoNumbering(data.installStandard).split('\n').map(l => new Paragraph({ children: [new TextRun({ text: l, size: 20 })] })),
    new Paragraph({ children: [new TextRun({ text: `完工日期：${data.deliveryDate || 'NA'} | 工期（天）：${data.workPeriod || 'NA'}`, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: `驗收：${data.acceptanceDesc}` })] }),

    // Section X
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: "十、 遵守事項", bold: true })], spacing: { before: 200 } }),
    ...processAutoNumbering(data.complianceDesc).split('\n').map(l => new Paragraph({ children: [new TextRun({ text: l, size: 20 })] })),
  ];

  // Section XII Table
  const specTable = new Table({
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
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Microsoft JhengHei", size: 22 }
        }
      }
    },
    sections: [{
      properties: {},
      children: [
        ...headerContent,
        ...bodyContent,
        new Paragraph({ children: [new TextRun({ text: "十二、 請購驗收要求", bold: true, size: 24 })], spacing: { before: 400, after: 200 } }),
        specTable
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
