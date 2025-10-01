import EssayPromptScraper from './scraper.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🎓 Essay Prompt Scraper Starting...\n');
  
  const configPath = path.join(__dirname, '../config/scraper-config.json');
  const scraper = new EssayPromptScraper(configPath);
  
  await scraper.run();
  
  console.log('\n✨ Scraping completed successfully!');
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
