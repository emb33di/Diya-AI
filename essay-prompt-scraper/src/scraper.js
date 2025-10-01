import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';
import cliProgress from 'cli-progress';
import UserAgent from 'user-agents';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EssayPromptScraper {
  constructor(configPath = './config/scraper-config.json') {
    this.config = null;
    this.browser = null;
    this.progressBar = null;
    this.results = [];
    this.loadConfig(configPath);
  }

  async loadConfig(configPath) {
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log(colors.green('✓ Configuration loaded successfully'));
    } catch (error) {
      console.error(colors.red('✗ Failed to load configuration:'), error.message);
      process.exit(1);
    }
  }

  async initialize() {
    console.log(colors.blue('🚀 Initializing scraper...'));
    
    this.browser = await puppeteer.launch({
      headless: this.config.scraper.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.progressBar = new cliProgress.SingleBar({
      format: 'Scraping Progress |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s | {university}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    console.log(colors.green('✓ Browser initialized'));
  }

  async scrapeTarget(target) {
    const page = await this.browser.newPage();
    
    try {
      // Set viewport
      await page.setViewport(this.config.scraper.viewport);
      
      // Set user agent
      if (this.config.scraper.userAgentRotation) {
        const userAgent = new UserAgent();
        await page.setUserAgent(userAgent.toString());
      }

      console.log(colors.yellow(`📄 Scraping ${target.name}...`));
      
      // Navigate to the page
      await page.goto(target.url, {
        waitUntil: 'networkidle2',
        timeout: this.config.scraper.requestTimeout
      });

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Extract essay prompts
      const prompts = await this.extractPrompts(page, target);
      
      // Add metadata
      const result = {
        university: target.name,
        url: target.url,
        type: target.type,
        scrapedAt: new Date().toISOString(),
        prompts: prompts,
        totalPrompts: prompts.length
      };

      this.results.push(result);
      console.log(colors.green(`✓ Found ${prompts.length} prompts from ${target.name}`));
      
      return result;

    } catch (error) {
      console.error(colors.red(`✗ Error scraping ${target.name}:`), error.message);
      return {
        university: target.name,
        url: target.url,
        type: target.type,
        scrapedAt: new Date().toISOString(),
        error: error.message,
        prompts: [],
        totalPrompts: 0
      };
    } finally {
      await page.close();
    }
  }

  async extractPrompts(page, target) {
    try {
      // Try custom extractor first
      if (target.customExtractor) {
        const customResult = await this.runCustomExtractor(page, target);
        if (customResult && customResult.length > 0) {
          return customResult;
        }
      }

      // Fallback to generic extraction
      return await this.genericExtractor(page, target);
    } catch (error) {
      console.error(colors.red(`Error extracting prompts from ${target.name}:`), error.message);
      return [];
    }
  }

  async runCustomExtractor(page, target) {
    // This would call custom extraction logic
    // For now, we'll use the generic extractor
    return await this.genericExtractor(page, target);
  }

  async genericExtractor(page, target) {
    const prompts = await page.evaluate((selectors) => {
      const results = [];
      
      // Find all prompt containers
      const containers = document.querySelectorAll(selectors.promptContainer || 'div, section, article');
      
      containers.forEach((container, index) => {
        try {
          // Extract title
          const titleElement = container.querySelector(selectors.title || 'h1, h2, h3, h4, h5, h6');
          const title = titleElement ? titleElement.textContent.trim() : `Prompt ${index + 1}`;
          
          // Extract prompt text
          const textElement = container.querySelector(selectors.promptText || 'p, div, span');
          const text = textElement ? textElement.textContent.trim() : '';
          
          // Extract word limit
          const limitElement = container.querySelector(selectors.wordLimit || '.word-limit, .character-limit, .limit');
          const wordLimit = limitElement ? limitElement.textContent.trim() : '';
          
          // Only include if we have meaningful content
          if (text && text.length > 10) {
            results.push({
              id: `prompt_${index + 1}`,
              title: title,
              text: text,
              wordLimit: wordLimit,
              extractedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing container:', error);
        }
      });
      
      return results;
    }, target.selectors);

    return prompts;
  }

  async scrapeAll() {
    console.log(colors.blue(`🎯 Starting to scrape ${this.config.targets.length} universities...`));
    
    this.progressBar.start(this.config.targets.length, 0, { university: 'Starting...' });
    
    for (let i = 0; i < this.config.targets.length; i++) {
      const target = this.config.targets[i];
      
      this.progressBar.update(i, { university: target.name });
      
      await this.scrapeTarget(target);
      
      // Delay between requests
      if (i < this.config.targets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.config.scraper.delayBetweenRequests));
      }
    }
    
    this.progressBar.update(this.config.targets.length, { university: 'Complete!' });
    this.progressBar.stop();
  }

  async saveResults() {
    console.log(colors.blue('💾 Saving results...'));
    
    const outputDir = path.resolve(__dirname, this.config.output.directory);
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `${this.config.output.filename}-${timestamp}`;
    
    // Save JSON
    if (this.config.output.formats.includes('json')) {
      const jsonPath = path.join(outputDir, `${baseFilename}.json`);
      await fs.writeJson(jsonPath, this.results, { spaces: 2 });
      console.log(colors.green(`✓ JSON saved to: ${jsonPath}`));
    }
    
    // Save CSV
    if (this.config.output.formats.includes('csv')) {
      const csvPath = path.join(outputDir, `${baseFilename}.csv`);
      await this.saveAsCSV(csvPath);
      console.log(colors.green(`✓ CSV saved to: ${csvPath}`));
    }
    
    // Save summary
    const summaryPath = path.join(outputDir, `${baseFilename}-summary.json`);
    const summary = this.generateSummary();
    await fs.writeJson(summaryPath, summary, { spaces: 2 });
    console.log(colors.green(`✓ Summary saved to: ${summaryPath}`));
  }

  async saveAsCSV(csvPath) {
    const csvWriter = (await import('csv-writer')).createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'university', title: 'University' },
        { id: 'type', title: 'Type' },
        { id: 'promptId', title: 'Prompt ID' },
        { id: 'title', title: 'Title' },
        { id: 'text', title: 'Text' },
        { id: 'wordLimit', title: 'Word Limit' },
        { id: 'scrapedAt', title: 'Scraped At' }
      ]
    });

    const csvData = [];
    this.results.forEach(result => {
      result.prompts.forEach(prompt => {
        csvData.push({
          university: result.university,
          type: result.type,
          promptId: prompt.id,
          title: prompt.title,
          text: prompt.text,
          wordLimit: prompt.wordLimit,
          scrapedAt: result.scrapedAt
        });
      });
    });

    await csvWriter.writeRecords(csvData);
  }

  generateSummary() {
    const summary = {
      totalUniversities: this.results.length,
      totalPrompts: this.results.reduce((sum, result) => sum + result.totalPrompts, 0),
      successfulScrapes: this.results.filter(result => !result.error).length,
      failedScrapes: this.results.filter(result => result.error).length,
      universities: this.results.map(result => ({
        name: result.university,
        prompts: result.totalPrompts,
        success: !result.error,
        error: result.error || null
      })),
      scrapedAt: new Date().toISOString()
    };
    
    return summary;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log(colors.green('✓ Browser closed'));
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.scrapeAll();
      await this.saveResults();
      
      const summary = this.generateSummary();
      console.log(colors.blue('\n📊 Scraping Summary:'));
      console.log(colors.white(`Total Universities: ${summary.totalUniversities}`));
      console.log(colors.white(`Total Prompts: ${summary.totalPrompts}`));
      console.log(colors.green(`Successful: ${summary.successfulScrapes}`));
      console.log(colors.red(`Failed: ${summary.failedScrapes}`));
      
    } catch (error) {
      console.error(colors.red('✗ Scraping failed:'), error.message);
    } finally {
      await this.cleanup();
    }
  }
}

export default EssayPromptScraper;
