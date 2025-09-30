import CollegeEssayAdvisorsExtractor from './src/collegeEssayAdvisorsExtractor.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runScraperWithUniversityList() {
  console.log('🎓 College Essay Advisors Scraper - Full Run');
  console.log('============================================\n');
  
  // Load university list from JSON file
  const universitiesListPath = path.join(__dirname, 'data/cea-universities-list.json');
  const universities = await fs.readJson(universitiesListPath);
  
  console.log(`📋 Loaded ${universities.length} universities from list`);
  console.log('🎯 Ready to scrape all universities with clear step-by-step progress\n');
  
  const extractor = new CollegeEssayAdvisorsExtractor();
  
  try {
    await extractor.initialize();
    
    // Process universities in batches for better performance
    const batchSize = 10;
    const delayBetweenBatches = 5000;
    
    console.log(`🚀 Starting to scrape ${universities.length} universities in batches of ${batchSize}`);
    
    for (let i = 0; i < universities.length; i += batchSize) {
      const batch = universities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(universities.length/batchSize);
      
      console.log(`\n📦 BATCH ${batchNumber}/${totalBatches}: Processing ${batch.length} universities`);
      console.log(`   Universities in this batch:`);
      batch.forEach((uni, idx) => console.log(`   ${idx + 1}. ${uni.name}`));
      
      // Process batch concurrently (with limit)
      const promises = batch.map(async (university, index) => {
        // Stagger requests within batch
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        return extractor.extractUniversityData(university.name, university.url);
      });
      
      await Promise.allSettled(promises);
      
      // Delay between batches
      if (i + batchSize < universities.length) {
        console.log(`\n⏳ Waiting ${delayBetweenBatches/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    console.log(`\n🎉 All batches completed! Processed ${universities.length} universities total.`);
    
    await extractor.saveResults();
    
    console.log('\n📊 Final Scraping Summary:');
    console.log(`Total Universities: ${extractor.results.length}`);
    console.log(`Total Prompts: ${extractor.results.reduce((sum, result) => sum + result.prompts.length, 0)}`);
    
    const successfulScrapes = extractor.results.filter(result => !result.university_info.error);
    const failedScrapes = extractor.results.filter(result => result.university_info.error);
    
    console.log(`Successful Scrapes: ${successfulScrapes.length}`);
    console.log(`Failed Scrapes: ${failedScrapes.length}`);
    
    if (failedScrapes.length > 0) {
      console.log('\n❌ Failed Universities:');
      failedScrapes.forEach(result => {
        console.log(`   - ${result.university_info.college_name}: ${result.university_info.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
  } finally {
    await extractor.cleanup();
  }
}

// Run the scraper
runScraperWithUniversityList().catch(console.error);
