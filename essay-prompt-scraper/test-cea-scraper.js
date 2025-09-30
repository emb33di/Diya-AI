import CollegeEssayAdvisorsExtractor from './src/collegeEssayAdvisorsExtractor.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testScraper() {
  console.log('🧪 Testing College Essay Advisors Scraper');
  console.log('=========================================\n');
  
  const extractor = new CollegeEssayAdvisorsExtractor();
  
  try {
    await extractor.initialize();
    
    // Test with just 3 universities first
    const testUniversities = [
      {
        name: "Harvard University",
        url: "https://www.collegeessayadvisors.com/supplemental-essay/harvard-university-supplemental-essay-prompt-guide/"
      },
      {
        name: "Stanford University", 
        url: "https://www.collegeessayadvisors.com/supplemental-essay/stanford-university-supplemental-essay-prompt-guide/"
      },
      {
        name: "Yale University",
        url: "https://www.collegeessayadvisors.com/supplemental-essay/yale-university-supplemental-essay-prompt-guide/"
      }
    ];
    
    console.log(`🎯 Testing with ${testUniversities.length} universities:`);
    testUniversities.forEach(uni => console.log(`  - ${uni.name}`));
    console.log('');
    
    for (const university of testUniversities) {
      await extractor.extractUniversityData(university.name, university.url);
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await extractor.saveResults();
    
    console.log('\n📊 Test Results:');
    console.log(`Total Universities: ${extractor.results.length}`);
    console.log(`Total Prompts: ${extractor.results.reduce((sum, uni) => sum + uni.prompts.length, 0)}`);
    
    // Show sample data
    if (extractor.results.length > 0) {
      console.log('\n📝 Sample Prompt:');
      const firstUni = extractor.results[0];
      if (firstUni.prompts.length > 0) {
        const firstPrompt = firstUni.prompts[0];
        console.log(`University: ${firstUni.university_info.college_name}`);
        console.log(`Title: ${firstPrompt.title}`);
        console.log(`Word Limit: ${firstPrompt.word_limit}`);
        console.log(`Category: ${firstPrompt.category}`);
        console.log(`Prompt: ${firstPrompt.prompt.substring(0, 200)}...`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await extractor.cleanup();
  }
}

// Run test
testScraper().catch(console.error);
