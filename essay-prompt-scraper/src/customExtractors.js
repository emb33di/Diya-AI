import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CustomExtractors {
  /**
   * Custom extractor for Harvard University
   */
  static async harvardExtractor(page) {
    return await page.evaluate(() => {
      const prompts = [];
      
      // Look for essay requirements sections
      const sections = document.querySelectorAll('.essay-requirement, .prompt-section, .writing-requirement');
      
      sections.forEach((section, index) => {
        const title = section.querySelector('h2, h3, h4, .title')?.textContent?.trim() || `Harvard Prompt ${index + 1}`;
        const text = section.querySelector('p, .prompt-text, .essay-text')?.textContent?.trim() || '';
        const wordLimit = section.querySelector('.word-limit, .character-limit')?.textContent?.trim() || '';
        
        if (text && text.length > 20) {
          prompts.push({
            id: `harvard_${index + 1}`,
            title,
            text,
            wordLimit,
            extractedAt: new Date().toISOString()
          });
        }
      });
      
      return prompts;
    });
  }

  /**
   * Custom extractor for Stanford University
   */
  static async stanfordExtractor(page) {
    return await page.evaluate(() => {
      const prompts = [];
      
      // Stanford typically has numbered prompts
      const promptElements = document.querySelectorAll('.essay-prompt, .prompt-item, .writing-prompt');
      
      promptElements.forEach((element, index) => {
        const title = element.querySelector('h3, h4, .prompt-title')?.textContent?.trim() || `Stanford Prompt ${index + 1}`;
        const text = element.querySelector('.prompt-text, p')?.textContent?.trim() || '';
        const wordLimit = element.querySelector('.word-count, .limit')?.textContent?.trim() || '';
        
        if (text && text.length > 20) {
          prompts.push({
            id: `stanford_${index + 1}`,
            title,
            text,
            wordLimit,
            extractedAt: new Date().toISOString()
          });
        }
      });
      
      return prompts;
    });
  }

  /**
   * Custom extractor for MIT
   */
  static async mitExtractor(page) {
    return await page.evaluate(() => {
      const prompts = [];
      
      // MIT has specific essay sections
      const sections = document.querySelectorAll('.essay-prompt, .writing-prompt, .prompt-section');
      
      sections.forEach((section, index) => {
        const title = section.querySelector('h2, h3, h4')?.textContent?.trim() || `MIT Prompt ${index + 1}`;
        const text = section.querySelector('.prompt-content, p')?.textContent?.trim() || '';
        const wordLimit = section.querySelector('.word-limit')?.textContent?.trim() || '';
        
        if (text && text.length > 20) {
          prompts.push({
            id: `mit_${index + 1}`,
            title,
            text,
            wordLimit,
            extractedAt: new Date().toISOString()
          });
        }
      });
      
      return prompts;
    });
  }

  /**
   * Custom extractor for Yale University
   */
  static async yaleExtractor(page) {
    return await page.evaluate(() => {
      const prompts = [];
      
      // Yale has essay sections
      const sections = document.querySelectorAll('.essay-section, .writing-requirements, .prompt-section');
      
      sections.forEach((section, index) => {
        const title = section.querySelector('h2, h3, .section-title')?.textContent?.trim() || `Yale Prompt ${index + 1}`;
        const text = section.querySelector('.essay-text, p')?.textContent?.trim() || '';
        const wordLimit = section.querySelector('.word-limit')?.textContent?.trim() || '';
        
        if (text && text.length > 20) {
          prompts.push({
            id: `yale_${index + 1}`,
            title,
            text,
            wordLimit,
            extractedAt: new Date().toISOString()
          });
        }
      });
      
      return prompts;
    });
  }

  /**
   * Custom extractor for Princeton University
   */
  static async princetonExtractor(page) {
    return await page.evaluate(() => {
      const prompts = [];
      
      // Princeton essay prompts
      const sections = document.querySelectorAll('.essay-prompt, .writing-prompt, .prompt-item');
      
      sections.forEach((section, index) => {
        const title = section.querySelector('h2, h3, h4')?.textContent?.trim() || `Princeton Prompt ${index + 1}`;
        const text = section.querySelector('.prompt-text, p')?.textContent?.trim() || '';
        const wordLimit = section.querySelector('.word-limit')?.textContent?.trim() || '';
        
        if (text && text.length > 20) {
          prompts.push({
            id: `princeton_${index + 1}`,
            title,
            text,
            wordLimit,
            extractedAt: new Date().toISOString()
          });
        }
      });
      
      return prompts;
    });
  }

  /**
   * Generic fallback extractor
   */
  static async genericExtractor(page, selectors) {
    return await page.evaluate((selectors) => {
      const prompts = [];
      
      // Try different common selectors
      const possibleSelectors = [
        selectors.promptContainer,
        '.essay-prompt',
        '.writing-prompt',
        '.prompt-section',
        '.essay-requirement',
        'div[class*="prompt"]',
        'div[class*="essay"]',
        'section',
        'article'
      ].filter(Boolean);
      
      let containers = [];
      for (const selector of possibleSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            containers = Array.from(elements);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      containers.forEach((container, index) => {
        try {
          const title = container.querySelector(selectors.title || 'h1, h2, h3, h4, h5, h6')?.textContent?.trim() || `Prompt ${index + 1}`;
          const text = container.querySelector(selectors.promptText || 'p, div, span')?.textContent?.trim() || '';
          const wordLimit = container.querySelector(selectors.wordLimit || '.word-limit, .character-limit, .limit')?.textContent?.trim() || '';
          
          if (text && text.length > 10) {
            prompts.push({
              id: `generic_${index + 1}`,
              title,
              text,
              wordLimit,
              extractedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing container:', error);
        }
      });
      
      return prompts;
    }, selectors);
  }
}

export default CustomExtractors;
