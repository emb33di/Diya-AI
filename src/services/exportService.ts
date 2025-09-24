/**
 * Export Service
 * 
 * Handles exporting essays to DOCX format with proper academic formatting.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

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
    
    // Extract text content while preserving paragraph structure
    let text = '';
    
    // Process each element to preserve paragraph breaks
    const elements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, br');
    
    if (elements.length > 0) {
      elements.forEach((element, index) => {
        const elementText = element.textContent?.trim() || '';
        if (elementText) {
          text += elementText;
          // Add paragraph break after each element except the last one
          if (index < elements.length - 1) {
            text += '\n\n';
          }
        }
      });
    } else {
      // Fallback to simple text extraction
      text = tempDiv.textContent || tempDiv.innerText || '';
    }
    
    // Clean up extra whitespace but preserve paragraph breaks
    text = text.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive line breaks
    
    return text.trim();
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
    try {
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
            size: 32, // 16pt for title (docx uses half-points)
            font: 'Times New Roman'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 480, // Space after title
          line: 480, // Double line spacing
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
              size: 24, // 12pt (docx uses half-points)
              font: 'Times New Roman'
            })
          ],
          spacing: {
            before: 240,
            after: 120,
            line: 480, // Double line spacing
          }
        })
      );
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: prompt,
              size: 24, // 12pt (docx uses half-points)
              font: 'Times New Roman',
              italics: true
            })
          ],
          spacing: {
            after: 480,
            line: 480, // Double line spacing
          }
        })
      );
    }
    
    // Essay content
    paragraphs.forEach((paragraph, index) => {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph.trim(),
              size: 24, // 12pt (docx uses half-points)
              font: 'Times New Roman'
            })
          ],
          spacing: {
            after: 240, // Double spacing (12pt * 2 = 24pt = 240 twips)
            before: index === 0 ? 0 : 0, // No extra space before first paragraph
            line: 480, // Double line spacing
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
    
    // Create document with proper academic formatting
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1000, // 1 inch top margin
              right: 1000, // 1 inch right margin
              bottom: 1000, // 1 inch bottom margin
              left: 1000, // 1 inch left margin
            },
          },
        },
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
                before: 0,
                after: 0,
              },
            },
          },
        },
      },
    });
    
    // Generate and download
    const arrayBuffer = await Packer.toArrayBuffer(doc);
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      throw new Error('Failed to export DOCX file. Please try again.');
    }
  }
}
