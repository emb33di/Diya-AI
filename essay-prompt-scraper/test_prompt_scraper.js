import CollegeEssayAdvisorsExtractor from './src/collegeEssayAdvisorsExtractor.js';
import EssayPromptTransformAgent from './ai-transform-agent.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test script to scrape a single school and transform it through AI agent
 * Usage: node test_prompt_scraper.js "Harvard University"
 */
async function testPromptScraper() {
  const schoolName = process.argv[2];
  
  if (!schoolName) {
    console.log('❌ Please provide a school name');
    console.log('Usage: node test_prompt_scraper.js "School Name"');
    console.log('\nExamples:');
    console.log('  node test_prompt_scraper.js "Harvard University"');
    console.log('  node test_prompt_scraper.js "Stanford University"');
    console.log('  node test_prompt_scraper.js "MIT"');
    process.exit(1);
  }

  // Check for API key
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY environment variable is required');
    console.log('Please set it with: export GOOGLE_API_KEY="your-api-key"');
    console.log('You can get a free API key from: https://makersuite.google.com/app/apikey');
    process.exit(1);
  }

  console.log('🧪 Test Prompt Scraper');
  console.log('=====================\n');
  console.log(`🎓 Testing with: ${schoolName}`);
  
  // Load university list to find the URL
  const universitiesListPath = path.join(__dirname, 'data/cea-universities-list.json');
  const universities = await fs.readJson(universitiesListPath);
  
  // Find the school in the list
  const school = universities.find(uni => 
    uni.name.toLowerCase().includes(schoolName.toLowerCase()) ||
    schoolName.toLowerCase().includes(uni.name.toLowerCase())
  );
  
  if (!school) {
    console.log(`❌ School "${schoolName}" not found in the university list`);
    console.log('\nAvailable schools include:');
    universities.slice(0, 10).forEach(uni => console.log(`  - ${uni.name}`));
    console.log(`  ... and ${universities.length - 10} more`);
    process.exit(1);
  }
  
  console.log(`✅ Found: ${school.name}`);
  console.log(`📍 URL: ${school.url}\n`);
  
  try {
    // Step 1: Scrape the school
    console.log('🔍 STEP 1: Scraping school data...');
    const extractor = new CollegeEssayAdvisorsExtractor();
    await extractor.initialize();
    
    const result = await extractor.extractUniversityData(school.name, school.url);
    
    console.log(`✅ Scraped ${result.prompts.length} prompts from ${school.name}`);
    
    // Step 2: Create scraped data format
    const scrapedData = {
      extraction_metadata: {
        source: "College Essay Advisors",
        extraction_date: new Date().toISOString(),
        total_universities_processed: 1,
        format_version: "1.0",
        purpose: "AI processing to create essay prompts JSON"
      },
      universities: [{
        university_url: school.url,
        requirements: {
          raw_text: result.essay_requirements.raw_text,
          how_many_essays: result.essay_requirements.how_many,
          word_limit: result.essay_requirements.total_word_limit,
          essay_types: result.essay_requirements.essay_types
        },
        essay_prompts: result.prompts.map(prompt => ({
          prompt_number: prompt.prompt_number,
          prompt_text: prompt.prompt,
          word_limit: prompt.word_limit,
          category: prompt.category,
          themes: prompt.common_themes
        }))
      }]
    };
    
    // Save scraped data
    const outputDir = path.join(__dirname, 'data');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const scrapedFile = path.join(outputDir, `test-scraped-${school.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`);
    
    await fs.writeJson(scrapedFile, scrapedData, { spaces: 2 });
    console.log(`💾 Scraped data saved to: ${scrapedFile}\n`);
    
    // Step 3: Transform with AI
    console.log('🤖 STEP 2: Transforming with AI agent...');
    const aiAgent = new EssayPromptTransformAgent();
    
    const transformedData = await aiAgent.transformScrapedData(scrapedData);
    
    // Save transformed data
    const transformedFile = path.join(outputDir, `test-transformed-${school.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`);
    
    await fs.writeJson(transformedFile, transformedData, { spaces: 2 });
    
    console.log(`✅ AI transformation completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Raw prompts scraped: ${result.prompts.length}`);
    console.log(`   - Clean prompts extracted: ${transformedData.essay_prompts?.length || 0}`);
    console.log(`💾 Transformed data saved to: ${transformedFile}\n`);
    
    // Step 4: Show all results
    if (transformedData.essay_prompts && transformedData.essay_prompts.length > 0) {
      console.log('📝 All transformed prompts:');
      console.log('============================');
      
      transformedData.essay_prompts.forEach((prompt, index) => {
        console.log(`\n${index + 1}. ${prompt.college_name} - Prompt ${prompt.prompt_number}`);
        console.log(`   Prompt: "${prompt.prompt}"`);
        console.log(`   Word Limit: ${prompt.word_limit}`);
        console.log(`   Selection: ${prompt.selection_type}`);
        console.log(`   Prompt Selection: ${prompt.prompt_selection_type}`);
      });
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`📁 Files created:`);
    console.log(`   - Scraped: ${scrapedFile}`);
    console.log(`   - Transformed: ${transformedFile}`);
    
    await extractor.cleanup();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testPromptScraper().catch(console.error);
