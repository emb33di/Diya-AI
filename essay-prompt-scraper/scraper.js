import CollegeEssayAdvisorsExtractor from './src/collegeEssayAdvisorsExtractor.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main scraper to extract essay prompts from all universities
 * Outputs: data/scraped-essay-prompts-{timestamp}.json
 */
async function scrapeAllUniversities() {
  console.log('🚀 Essay Prompt Scraper');
  console.log('=======================\n');
  
  // Load university list
  const universitiesListPath = path.join(__dirname, 'data/cea-universities-list.json');
  const universities = await fs.readJson(universitiesListPath);
  
  console.log(`📋 Loaded ${universities.length} universities to scrape`);
  
  const extractor = new CollegeEssayAdvisorsExtractor();
  
  try {
    await extractor.initialize();
    
    // Process all universities
    console.log(`\n🎓 Starting to scrape ${universities.length} universities...`);
    
    for (let i = 0; i < universities.length; i++) {
      const university = universities[i];
      console.log(`\n[${i + 1}/${universities.length}] Processing: ${university.name}`);
      
      await extractor.extractUniversityData(university.name, university.url);
      
      // Delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Create output data structure
    const outputData = {
      extraction_metadata: {
        source: "College Essay Advisors",
        extraction_date: new Date().toISOString(),
        total_universities_processed: extractor.results.length,
        format_version: "1.0",
        purpose: "AI processing to create essay prompts JSON"
      },
      universities: extractor.results.map(result => ({
        university_url: result.university_info.university_url,
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
      }))
    };
    
    // Save results
    const outputDir = path.join(__dirname, 'data');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `scraped-essay-prompts-${timestamp}.json`);
    
    await fs.writeJson(outputFile, outputData, { spaces: 2 });
    
    console.log(`\n✅ Scraping completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Universities processed: ${extractor.results.length}`);
    console.log(`   - Total prompts extracted: ${extractor.results.reduce((sum, uni) => sum + uni.prompts.length, 0)}`);
    console.log(`💾 Output saved to: ${outputFile}`);
    
    return outputFile;
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  } finally {
    await extractor.cleanup();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllUniversities().catch(console.error);
}

export default scrapeAllUniversities;
