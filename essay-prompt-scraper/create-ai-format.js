import CollegeEssayAdvisorsExtractor from './src/collegeEssayAdvisorsExtractor.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create AI-ready output format for processing into essay prompts JSON
 */
async function createAIReadyOutput() {
  console.log('🤖 Creating AI-Ready Output Format');
  console.log('==================================\n');
  
  // Load university list from JSON file
  const universitiesListPath = path.join(__dirname, 'data/cea-universities-list.json');
  const universities = await fs.readJson(universitiesListPath);
  
  console.log(`📋 Loaded ${universities.length} universities from list`);
  
  const extractor = new CollegeEssayAdvisorsExtractor();
  
  try {
    await extractor.initialize();
    
    // Test with first 5 universities to create the AI-ready format
    const testUniversities = universities.slice(0, 5);
    
    console.log(`🧪 Testing with ${testUniversities.length} universities to create AI format:`);
    testUniversities.forEach((uni, idx) => console.log(`   ${idx + 1}. ${uni.name}`));
    
    for (const university of testUniversities) {
      await extractor.extractUniversityData(university.name, university.url);
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Create simple requirements format
    const simpleRequirementsData = {
      extraction_metadata: {
        source: "College Essay Advisors",
        extraction_date: new Date().toISOString(),
        total_universities_processed: extractor.results.length,
        format_version: "1.0",
        purpose: "Simple requirements extraction"
      },
      universities: extractor.results.map(result => ({
        school_name: result.university_info.college_name,
        raw_requirements_text: result.essay_requirements.raw_text,
        raw_additional_text: result.additional_info.essay_advice || "No additional content found"
      }))
    };
    
    // Save simple requirements format
    const outputDir = path.join(__dirname, 'data');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const requirementsFilePath = path.join(outputDir, `simple-requirements-${timestamp}.json`);
    
    await fs.writeJson(requirementsFilePath, simpleRequirementsData, { spaces: 2 });
    
    console.log(`\n✅ Simple requirements format created: ${requirementsFilePath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Universities processed: ${simpleRequirementsData.universities.length}`);
    console.log(`   - Format: School name, raw requirements text, raw additional text`);
    
  } catch (error) {
    console.error('❌ AI format creation failed:', error.message);
  } finally {
    await extractor.cleanup();
  }
}

// Run the AI format creator
createAIReadyOutput().catch(console.error);
