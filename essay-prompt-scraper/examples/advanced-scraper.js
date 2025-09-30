import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Advanced scraper with custom extraction logic
 */
class AdvancedEssayScraper {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  /**
   * Scrape Common Application essay prompts
   */
  async scrapeCommonApp() {
    console.log('📝 Scraping Common Application prompts...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto('https://www.commonapp.org/apply/essay-prompts', {
        waitUntil: 'networkidle2'
      });

      const prompts = await page.evaluate(() => {
        const results = [];
        
        // Common App typically has numbered prompts
        const promptElements = document.querySelectorAll('.prompt, .essay-prompt, [class*="prompt"]');
        
        promptElements.forEach((element, index) => {
          const title = element.querySelector('h2, h3, h4, .title')?.textContent?.trim() || `Common App Prompt ${index + 1}`;
          const text = element.querySelector('p, .prompt-text, .essay-text')?.textContent?.trim() || '';
          const wordLimit = element.querySelector('.word-limit, .character-limit')?.textContent?.trim() || '650 words';
          
          if (text && text.length > 20) {
            results.push({
              id: `commonapp_${index + 1}`,
              title,
              text,
              wordLimit,
              source: 'Common Application',
              extractedAt: new Date().toISOString()
            });
          }
        });
        
        return results;
      });

      this.results.push({
        university: 'Common Application',
        url: 'https://www.commonapp.org/apply/essay-prompts',
        type: 'common',
        prompts,
        scrapedAt: new Date().toISOString()
      });

      console.log(`✓ Found ${prompts.length} Common App prompts`);
      
    } catch (error) {
      console.error('Error scraping Common App:', error.message);
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape Coalition Application essay prompts
   */
  async scrapeCoalitionApp() {
    console.log('📝 Scraping Coalition Application prompts...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto('https://www.coalitionforcollegeaccess.org/essays', {
        waitUntil: 'networkidle2'
      });

      const prompts = await page.evaluate(() => {
        const results = [];
        
        const promptElements = document.querySelectorAll('.essay-prompt, .prompt, [class*="essay"]');
        
        promptElements.forEach((element, index) => {
          const title = element.querySelector('h2, h3, h4, .title')?.textContent?.trim() || `Coalition Prompt ${index + 1}`;
          const text = element.querySelector('p, .prompt-text, .essay-text')?.textContent?.trim() || '';
          const wordLimit = element.querySelector('.word-limit, .character-limit')?.textContent?.trim() || '500 words';
          
          if (text && text.length > 20) {
            results.push({
              id: `coalition_${index + 1}`,
              title,
              text,
              wordLimit,
              source: 'Coalition Application',
              extractedAt: new Date().toISOString()
            });
          }
        });
        
        return results;
      });

      this.results.push({
        university: 'Coalition Application',
        url: 'https://www.coalitionforcollegeaccess.org/essays',
        type: 'coalition',
        prompts,
        scrapedAt: new Date().toISOString()
      });

      console.log(`✓ Found ${prompts.length} Coalition prompts`);
      
    } catch (error) {
      console.error('Error scraping Coalition App:', error.message);
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape UC Application essay prompts
   */
  async scrapeUCApplication() {
    console.log('📝 Scraping UC Application prompts...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto('https://admission.universityofcalifornia.edu/how-to-apply/personal-insight-questions/', {
        waitUntil: 'networkidle2'
      });

      const prompts = await page.evaluate(() => {
        const results = [];
        
        // UC has 8 personal insight questions
        const promptElements = document.querySelectorAll('.personal-insight, .essay-prompt, .prompt');
        
        promptElements.forEach((element, index) => {
          const title = element.querySelector('h2, h3, h4, .title')?.textContent?.trim() || `UC Personal Insight Question ${index + 1}`;
          const text = element.querySelector('p, .prompt-text, .essay-text')?.textContent?.trim() || '';
          const wordLimit = element.querySelector('.word-limit, .character-limit')?.textContent?.trim() || '350 words';
          
          if (text && text.length > 20) {
            results.push({
              id: `uc_${index + 1}`,
              title,
              text,
              wordLimit,
              source: 'UC Application',
              extractedAt: new Date().toISOString()
            });
          }
        });
        
        return results;
      });

      this.results.push({
        university: 'University of California',
        url: 'https://admission.universityofcalifornia.edu/how-to-apply/personal-insight-questions/',
        type: 'uc',
        prompts,
        scrapedAt: new Date().toISOString()
      });

      console.log(`✓ Found ${prompts.length} UC prompts`);
      
    } catch (error) {
      console.error('Error scraping UC Application:', error.message);
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape with JavaScript execution and dynamic content
   */
  async scrapeDynamicContent(url, universityName) {
    console.log(`📝 Scraping dynamic content from ${universityName}...`);
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2'
      });

      // Wait for dynamic content to load
      await page.waitForTimeout(3000);

      // Execute JavaScript to extract content
      const prompts = await page.evaluate(() => {
        const results = [];
        
        // Look for various patterns
        const selectors = [
          '.essay-prompt',
          '.writing-prompt',
          '.prompt-section',
          '.essay-requirement',
          '[class*="prompt"]',
          '[class*="essay"]',
          'div[data-testid*="prompt"]',
          'div[data-testid*="essay"]'
        ];
        
        let containers = [];
        for (const selector of selectors) {
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
            const title = container.querySelector('h1, h2, h3, h4, h5, h6, .title, .prompt-title')?.textContent?.trim() || `Prompt ${index + 1}`;
            const text = container.querySelector('p, .prompt-text, .essay-text, .content')?.textContent?.trim() || '';
            const wordLimit = container.querySelector('.word-limit, .character-limit, .limit, [class*="limit"]')?.textContent?.trim() || '';
            
            if (text && text.length > 20) {
              results.push({
                id: `dynamic_${index + 1}`,
                title,
                text,
                wordLimit,
                source: universityName,
                extractedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error processing container:', error);
          }
        });
        
        return results;
      });

      this.results.push({
        university: universityName,
        url,
        type: 'dynamic',
        prompts,
        scrapedAt: new Date().toISOString()
      });

      console.log(`✓ Found ${prompts.length} prompts from ${universityName}`);
      
    } catch (error) {
      console.error(`Error scraping ${universityName}:`, error.message);
    } finally {
      await page.close();
    }
  }

  /**
   * Save results to file
   */
  async saveResults() {
    const outputDir = path.join(__dirname, '../data/advanced');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `advanced-scraping-results-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    await fs.writeJson(filepath, this.results, { spaces: 2 });
    console.log(`✓ Results saved to: ${filepath}`);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Run all advanced scraping examples
   */
  async runAll() {
    console.log('🚀 Starting Advanced Essay Prompt Scraping');
    console.log('==========================================\n');
    
    try {
      await this.initialize();
      
      // Scrape different application systems
      await this.scrapeCommonApp();
      await this.scrapeCoalitionApp();
      await this.scrapeUCApplication();
      
      // Example of scraping dynamic content
      await this.scrapeDynamicContent(
        'https://admissions.berkeley.edu/apply/freshman/essays',
        'UC Berkeley'
      );
      
      await this.saveResults();
      
      console.log('\n📊 Scraping Summary:');
      console.log(`Total Universities: ${this.results.length}`);
      console.log(`Total Prompts: ${this.results.reduce((sum, result) => sum + result.prompts.length, 0)}`);
      
    } catch (error) {
      console.error('❌ Advanced scraping failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AdvancedEssayScraper();
  scraper.runAll().catch(console.error);
}

export default AdvancedEssayScraper;
