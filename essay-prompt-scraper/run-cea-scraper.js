import CollegeEssayAdvisorsExtractor from './src/collegeEssayAdvisorsExtractor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🎓 College Essay Advisors Scraper');
  console.log('=================================\n');
  
  console.log('📋 Target Website: https://www.collegeessayadvisors.com/supplemental-essay-guide/');
  console.log('🎯 Goal: Extract supplemental essay prompts from 187+ universities\n');
  
  const extractor = new CollegeEssayAdvisorsExtractor();
  
  try {
    await extractor.run();
    
    console.log('\n✨ Scraping completed successfully!');
    console.log('📁 Check the data/ directory for results');
    console.log('📊 Results include both structured and flat formats for easy database import');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(console.error);
