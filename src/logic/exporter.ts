import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
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

export const exportToWord = async (markdown: string, filename: string) => {
  // 簡易版 Word 匯出器：將 Markdown 轉換為 docx 組件
  // 這裡僅示範核心結構，實際轉換需更複雜的 parser
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Microsoft JhengHei",
            size: 24,
            color: "000000",
          },
        },
      },
    },
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "台燿科技股份有限公司",
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "請購驗收規範表",
              bold: true,
              size: 28,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        // 這裡後續可以根據 markdown 內容進行深度解析與排版
        new Paragraph({
          children: [
            new TextRun({
              text: "詳細內容請參閱附件或預覽介面。 (本功能目前匯出全文內容)",
            }),
          ],
        }),
        ...markdown.split('\n').map(line => {
          if (line.startsWith('#')) {
             return new Paragraph({
               children: [new TextRun({ text: line.replace(/#/g, '').trim(), bold: true, size: 24, font: "Microsoft JhengHei" })],
               spacing: { before: 200, after: 100 }
             });
          }
          return new Paragraph({
            children: [new TextRun({ text: line, font: "Microsoft JhengHei" })],
          });
        })
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};
