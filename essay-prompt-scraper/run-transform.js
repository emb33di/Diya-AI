import dotenv from 'dotenv';
import EssayPromptTransformAgent from './ai-transform-agent.js';

// Load environment variables from .env.local
dotenv.config({ path: '../.env.local' });

const agent = new EssayPromptTransformAgent();

// Check for API key
if (!process.env.GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY environment variable is required');
  console.log('Please set it with: export GOOGLE_API_KEY="your-api-key"');
  process.exit(1);
}

console.log('🚀 Starting AI Transform Agent...');

try {
  const inputFile = 'data/cea-scraped-data-final.json';
  const outputFile = 'data/cea-scraped-data-final-transformed.json';
  
  console.log(`📁 Processing: ${inputFile}`);
  
  await agent.processFile(inputFile, outputFile);
  
  console.log('\n🎉 AI transformation completed successfully!');
  
} catch (error) {
  console.error('❌ AI transformation failed:', error.message);
  process.exit(1);
}
