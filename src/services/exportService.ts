/**
 * Export Service
 * 
 * Handles exporting essays to DOCX and PDF formats with proper academic formatting.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import jsPDF from 'jspdf';

export interface ExportOptions {
  title: string;
  content: string;
  prompt?: string;
  wordLimit?: number;
}

export class ExportService {
  /**
   * Convert HTML content to plain text for document generation
   */
  private static htmlToPlainText(html: string): string {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extract text content and clean up
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up extra whitespace and normalize line breaks
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/\n\s*\n/g, '\n\n'); // Double line breaks for paragraphs
    
    return text;
  }

  /**
   * Split text into paragraphs for proper formatting
   */
  private static splitIntoParagraphs(text: string): string[] {
    // Split by double line breaks or paragraph tags
    return text.split(/\n\s*\n/).filter(para => para.trim().length > 0);
  }

  /**
   * Export essay as DOCX with academic formatting
   */
  static async exportToDOCX(options: ExportOptions): Promise<void> {
    const { title, content, prompt, wordLimit } = options;
    
    // Convert HTML to plain text
    const plainText = this.htmlToPlainText(content);
    const paragraphs = this.splitIntoParagraphs(plainText);
    
    // Create document sections
    const docSections = [];
    
    // Title
    docSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 24,
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400, // Space after title
        }
      })
    );
    
    // Prompt section (if provided)
    if (prompt) {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Essay Prompt:',
              bold: true,
              size: 12,
              font: 'Times New Roman'
            })
          ],
          spacing: {
            before: 200,
            after: 200,
          }
        })
      );
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: prompt,
              size: 12,
              font: 'Times New Roman',
              italics: true
            })
          ],
          spacing: {
            after: 400,
          }
        })
      );
    }
    
    // Essay content
    paragraphs.forEach(paragraph => {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph.trim(),
              size: 12,
              font: 'Times New Roman'
            })
          ],
          spacing: {
            after: 240, // Double spacing (12pt * 2 = 24pt = 240 twips)
          }
        })
      );
    });
    
    // Word count footer (if word limit provided)
    if (wordLimit) {
      const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Word Count: ${wordCount}/${wordLimit}`,
              size: 10,
              font: 'Times New Roman',
              italics: true
            })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: {
            before: 400,
          }
        })
      );
    }
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: docSections,
      }],
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24, // 12pt
            },
            paragraph: {
              spacing: {
                line: 480, // Double spacing (24pt * 2 = 48pt = 480 twips)
              },
            },
          },
        },
      },
    });
    
    // Generate and download
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export essay as PDF with academic formatting
   */
  static async exportToPDF(options: ExportOptions): Promise<void> {
    const { title, content, prompt, wordLimit } = options;
    
    // Convert HTML to plain text
    const plainText = this.htmlToPlainText(content);
    const paragraphs = this.splitIntoParagraphs(plainText);
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });
    
    // Set font to Times New Roman (default font in jsPDF)
    pdf.setFont('times', 'normal');
    
    // Page dimensions
    const pageWidth = 8.5;
    const pageHeight = 11;
    const margin = 1;
    const contentWidth = pageWidth - (2 * margin);
    
    let yPosition = margin;
    const lineHeight = 0.5; // Double spacing (12pt * 2 = 24pt = 0.5 inches)
    const fontSize = 12;
    
    // Helper function to add text with word wrapping
    const addText = (text: string, isBold = false, isItalic = false, alignment: 'left' | 'center' | 'right' = 'left') => {
      pdf.setFont('times', isBold ? 'bold' : isItalic ? 'italic' : 'normal');
      pdf.setFontSize(fontSize);
      
      const lines = pdf.splitTextToSize(text, contentWidth);
      
      lines.forEach((line: string) => {
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        let xPosition = margin;
        if (alignment === 'center') {
          xPosition = pageWidth / 2;
        } else if (alignment === 'right') {
          xPosition = pageWidth - margin;
        }
        
        pdf.text(line, xPosition, yPosition, { align: alignment });
        yPosition += lineHeight;
      });
    };
    
    // Title
    pdf.setFontSize(16);
    addText(title, true, false, 'center');
    yPosition += 0.3; // Extra space after title
    
    // Prompt section (if provided)
    if (prompt) {
      yPosition += 0.2;
      addText('Essay Prompt:', true);
      yPosition += 0.1;
      addText(prompt, false, true);
      yPosition += 0.2;
    }
    
    // Essay content
    paragraphs.forEach(paragraph => {
      addText(paragraph.trim());
      yPosition += 0.1; // Space between paragraphs
    });
    
    // Word count footer (if word limit provided)
    if (wordLimit) {
      const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
      yPosition += 0.3;
      addText(`Word Count: ${wordCount}/${wordLimit}`, false, true, 'right');
    }
    
    // Download
    pdf.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  }
}
