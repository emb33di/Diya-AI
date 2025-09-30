import EssayPromptScraper from '../src/scraper.js';
import DataProcessor from '../src/dataProcessor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Example 1: Basic scraping
 */
async function basicScrapingExample() {
  console.log('📚 Example 1: Basic Scraping');
  console.log('============================\n');
  
  const scraper = new EssayPromptScraper();
  await scraper.run();
}

/**
 * Example 2: Scraping with data processing
 */
async function scrapingWithProcessingExample() {
  console.log('📚 Example 2: Scraping with Data Processing');
  console.log('==========================================\n');
  
  const scraper = new EssayPromptScraper();
  const processor = new DataProcessor();
  
  // Initialize scraper
  await scraper.initialize();
  
  // Scrape all targets
  await scraper.scrapeAll();
  
  // Process the results
  const processedData = processor.processResults(scraper.results);
  
  // Save processed data
  const outputDir = path.join(__dirname, '../data/processed');
  await processor.saveProcessedData(processedData, outputDir);
  
  // Display statistics
  console.log('\n📊 Processing Statistics:');
  console.log(`Total Universities: ${processedData.statistics.totalUniversities}`);
  console.log(`Total Prompts: ${processedData.statistics.totalPrompts}`);
  console.log(`Total Words: ${processedData.statistics.totalWords.toLocaleString()}`);
  console.log(`Average Word Count: ${processedData.statistics.averageWordCount}`);
  
  await scraper.cleanup();
}

/**
 * Example 3: Scraping specific universities
 */
async function specificUniversitiesExample() {
  console.log('📚 Example 3: Scraping Specific Universities');
  console.log('===========================================\n');
  
  const scraper = new EssayPromptScraper();
  await scraper.initialize();
  
  // Scrape only Harvard and Stanford
  const targetUniversities = ['Harvard University', 'Stanford University'];
  const filteredTargets = scraper.config.targets.filter(target => 
    targetUniversities.includes(target.name)
  );
  
  console.log(`Scraping ${filteredTargets.length} specific universities...`);
  
  for (const target of filteredTargets) {
    await scraper.scrapeTarget(target);
  }
  
  await scraper.saveResults();
  await scraper.cleanup();
}

/**
 * Example 4: Custom configuration
 */
async function customConfigurationExample() {
  console.log('📚 Example 4: Custom Configuration');
  console.log('==================================\n');
  
  // Create a custom configuration
  const customConfig = {
    scraper: {
      concurrentRequests: 1,
      delayBetweenRequests: 5000,
      requestTimeout: 60000,
      retryAttempts: 5,
      retryDelay: 10000,
      userAgentRotation: true,
      proxyRotation: false,
      headless: true,
      viewport: { width: 1920, height: 1080 }
    },
    targets: [
      {
        name: "MIT",
        url: "https://mitadmissions.org/apply/firstyear/essays/",
        type: "undergraduate",
        selectors: {
          promptContainer: ".essay-prompt, .writing-prompt",
          promptText: ".prompt-content, p",
          wordLimit: ".word-limit",
          title: "h2, h3"
        }
      }
    ],
    output: {
      formats: ["json"],
      directory: "./data/custom",
      filename: "mit-prompts",
      includeMetadata: true,
      includeRawHtml: false
    }
  };
  
  // Save custom config
  const configPath = path.join(__dirname, '../config/custom-config.json');
  await fs.writeJson(configPath, customConfig, { spaces: 2 });
  
  // Use custom config
  const scraper = new EssayPromptScraper(configPath);
  await scraper.run();
}

/**
 * Example 5: Error handling and retry logic
 */
async function errorHandlingExample() {
  console.log('📚 Example 5: Error Handling and Retry Logic');
  console.log('===========================================\n');
  
  const scraper = new EssayPromptScraper();
  await scraper.initialize();
  
  // Add a target with invalid URL to test error handling
  scraper.config.targets.push({
    name: "Test Error Handling",
    url: "https://invalid-url-that-does-not-exist.com",
    type: "undergraduate",
    selectors: {
      promptContainer: ".test",
      promptText: "p",
      wordLimit: ".limit",
      title: "h1"
    }
  });
  
  console.log('Testing error handling with invalid URL...');
  await scraper.scrapeAll();
  
  // Check results for errors
  const errorResults = scraper.results.filter(result => result.error);
  console.log(`\nFound ${errorResults.length} errors:`);
  errorResults.forEach(result => {
    console.log(`- ${result.university}: ${result.error}`);
  });
  
  await scraper.cleanup();
}

/**
 * Main function to run examples
 */
async function runExamples() {
  console.log('🎓 Essay Prompt Scraper Examples');
  console.log('=================================\n');
  
  try {
    // Run basic example
    await basicScrapingExample();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Run processing example
    await scrapingWithProcessingExample();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Run specific universities example
    await specificUniversitiesExample();
    
    console.log('\n✨ All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example failed:', error.message);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export {
  basicScrapingExample,
  scrapingWithProcessingExample,
  specificUniversitiesExample,
  customConfigurationExample,
  errorHandlingExample
};
