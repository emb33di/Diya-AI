import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Debug test starting...');

try {
  const scrapedDataFile = path.join(__dirname, 'data', 'cea-scraped-data-final.json');
  console.log(`📁 Looking for file: ${scrapedDataFile}`);
  
  if (!fs.existsSync(scrapedDataFile)) {
    console.error(`❌ File not found: ${scrapedDataFile}`);
    process.exit(1);
  }
  
  console.log('✅ File exists, reading...');
  const scrapedData = JSON.parse(fs.readFileSync(scrapedDataFile, 'utf8'));
  console.log(`📊 Found ${scrapedData.universities?.length || 0} universities`);
  
  // Look for Princeton
  const schoolName = "Princeton University";
  console.log(`🔍 Looking for "${schoolName}"...`);
  
  const schoolData = scrapedData.universities.find(uni => 
    uni.university_url.includes(schoolName.toLowerCase().replace(/\s+/g, '-')) ||
    uni.essay_prompts.some(prompt => 
      prompt.prompt_text.toLowerCase().includes(schoolName.toLowerCase())
    )
  );
  
  if (schoolData) {
    console.log(`✅ Found Princeton!`);
    console.log(`   - URL: ${schoolData.university_url}`);
    console.log(`   - Prompts: ${schoolData.essay_prompts.length}`);
    console.log(`   - Requirements: ${schoolData.requirements.raw_text || 'Not specified'}`);
    
    // Show first few prompts
    console.log(`\n📝 First 3 prompts:`);
    schoolData.essay_prompts.slice(0, 3).forEach((prompt, index) => {
      console.log(`   ${index + 1}. "${prompt.prompt_text.substring(0, 80)}..."`);
    });
  } else {
    console.log(`❌ Princeton not found`);
    console.log(`📋 Available schools:`);
    scrapedData.universities.slice(0, 5).forEach(uni => {
      const urlParts = uni.university_url.split('/');
      const schoolFromUrl = urlParts[urlParts.length - 2].replace(/-/g, ' ');
      console.log(`   - ${schoolFromUrl}`);
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
