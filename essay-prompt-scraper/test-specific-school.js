import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in project root
dotenv.config({ path: path.join(path.dirname(__dirname), '.env.local') });

/**
 * Test script to validate scraped data → AI transformation pipeline for specific schools
 * 
 * Usage: 
 *   node test-specific-school.js "School Name"
 *   node test-specific-school.js "Princeton University"
 *   node test-specific-school.js "Harvard University"
 *   node test-specific-school.js "University of Chicago"
 * 
 * This script:
 * 1. Extracts specific school data from cea-scraped-data-final.json
 * 2. Runs AI transformation on that school's data
 * 3. Saves results and provides detailed analysis
 */
class SchoolTransformationTester {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    this.scrapedDataFile = path.join(__dirname, 'data', 'cea-scraped-data-final.json');
  }

  /**
   * Find school data in scraped data file
   */
  findSchoolInScrapedData(schoolName) {
    console.log(`🔍 Searching for "${schoolName}" in scraped data...`);
    
    if (!fs.existsSync(this.scrapedDataFile)) {
      throw new Error(`Scraped data file not found: ${this.scrapedDataFile}`);
    }

    const scrapedData = JSON.parse(fs.readFileSync(this.scrapedDataFile, 'utf8'));
    
    // Search strategies for finding the school
    const searchStrategies = [
      // Strategy 1: Match by URL path
      (uni) => {
        const urlParts = uni.university_url.split('/');
        const schoolFromUrl = urlParts[urlParts.length - 2].replace(/-/g, ' ');
        return schoolFromUrl.toLowerCase().includes(schoolName.toLowerCase());
      },
      
      // Strategy 2: Match by prompt content
      (uni) => uni.essay_prompts.some(prompt => 
        prompt.prompt_text.toLowerCase().includes(schoolName.toLowerCase())
      ),
      
      // Strategy 3: Partial name matching
      (uni) => {
        const urlParts = uni.university_url.split('/');
        const schoolFromUrl = urlParts[urlParts.length - 2].replace(/-/g, ' ');
        const schoolWords = schoolName.toLowerCase().split(' ');
        return schoolWords.every(word => schoolFromUrl.includes(word));
      }
    ];

    // Try each strategy
    for (let i = 0; i < searchStrategies.length; i++) {
      const schoolData = scrapedData.universities.find(searchStrategies[i]);
      if (schoolData) {
        console.log(`✅ Found school using strategy ${i + 1}`);
        return schoolData;
      }
    }

    // If not found, show available schools
    console.log(`❌ School "${schoolName}" not found`);
    console.log(`📋 Available schools:`);
    scrapedData.universities.forEach((uni, index) => {
      const urlParts = uni.university_url.split('/');
      const schoolFromUrl = urlParts[urlParts.length - 2].replace(/-/g, ' ');
      console.log(`   ${index + 1}. ${schoolFromUrl}`);
    });
    
    return null;
  }

  /**
   * Create test data structure with just the target school
   */
  createTestData(schoolData) {
    return {
      extraction_metadata: {
        timestamp: new Date().toISOString(),
        source: "test-specific-school",
        total_schools: 1
      },
      universities: [schoolData]
    };
  }

  /**
   * Transform school data using AI
   */
  async transformWithAI(testData) {
    console.log('🤖 Running AI transformation...');
    
    const prompt = this.createTransformationPrompt(testData);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const transformedText = response.text();
      
      // Extract JSON from response
      const jsonData = this.extractJsonFromResponse(transformedText);
      
      console.log(`✅ AI transformation completed`);
      return jsonData;
    } catch (error) {
      console.error('❌ AI transformation failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract JSON from AI response (handles markdown code blocks)
   */
  extractJsonFromResponse(responseText) {
    // Try to extract JSON from markdown code blocks first
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to extract JSON from any code block
    const codeBlockMatch = responseText.match(/```\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }
    
    // Try to parse the entire response as JSON
    return JSON.parse(responseText);
  }

  /**
   * Create the AI transformation prompt
   */
  createTransformationPrompt(scrapedData) {
    return `
You are an expert data transformation agent. Transform the following scraped essay prompt data into the exact JSON format required for the database.

## Input Data:
${JSON.stringify(scrapedData, null, 2)}

## Required Output Format:
{
  "essay_prompts": [
    {
      "college_name": "University Name",
      "how_many": "number or word (e.g., '1', '2', 'one', 'two')",
      "selection_type": "required|optional|choose_one",
      "prompt_number": "1",
      "prompt": "The actual essay prompt text",
      "word_limit": "150 or 250-650 or Not specified",
      "prompt_selection_type": "required|optional|choose_one",
      "school_program_type": "Undergraduate"
    }
  ]
}

## CRITICAL Transformation Rules:

### 1. Essay Count Logic:
- Use requirements.raw_text to determine the ACTUAL number of essays required
- Look for patterns like "2 essays", "1 essay", "3 essays of 250 words each"
- Extract the number from requirements.raw_text, NOT from the total prompts scraped
- Set how_many to the actual required count from requirements

### 2. Selection Type Logic:
- If prompt text contains "Option" → set selection_type and prompt_selection_type to "optional"
- If prompt text contains "Required" → set to "required"
- If prompt text contains "Choose one" or "Choose 1 of" → set to "choose_one"
- If there are multiple options but only one is required → set to "choose_one"

### 3. Prompt Filtering (REMOVE these):
- Headers: "The Requirements:", "Supplemental Essay Type(s):", "How to Write"
- Metadata: "University of Chicago 2025-26 Application Essay Question Explanations"
- Stats: "Acceptance Rate:", "Undergrad Population:", "Ivy League:"
- Credits: "Inspired by...", "Class of...", "Ella Somaiya, Class of 2028"
- Section headers: "Question 1 (Required)", "Question 2: Extended Essay"
- Option labels: "Essay Option 1", "Essay Option 2", etc.

### 4. Keep Only Actual Essay Prompts:
- Questions that students must answer
- Statements that require a response
- Prompts that end with "?" or require explanation

### 5. Word Limit Extraction:
- FIRST: Look in requirements.raw_text for general word limits
- SECOND: Extract word limits from individual prompt text (CRITICAL!)
- Common patterns in prompt text: "(Please respond in 250 words or fewer.)", "in 50 words or fewer", "about 250 words or fewer"
- Look for patterns like: "(\\d+)\\s+words?\\s+or\\s+fewer", "(\\d+)\\s+words?\\s+maximum", "(\\d+)\\s+words?\\s+or\\s+less"
- If multiple prompts share the same word limit instruction (like "Please respond to each question in 50 words or fewer"), apply that limit to all subsequent prompts until a new limit is specified
- If not specified anywhere, use "Not specified"

### 6. College Name Extraction:
- Extract from university_url path
- "university-of-chicago-supplemental-essay-prompt-guide" → "University of Chicago"
- "harvard-university-supplemental-essay-prompt-guide" → "Harvard University"

### 7. Chronological Context Handling:
- When you see instructions like "Please respond to each question in 50 words or fewer. There are no right or wrong answers. Be yourself!" followed by multiple questions, this instruction applies to ALL subsequent questions until a new word limit is specified
- Extract the word limit from such instructions and apply it to all following prompts in the sequence
- This is common in "short response" sections where multiple questions share the same word limit

### 8. Prompt Numbering:
- Use sequential numbering starting from 1 for the final output
- Do NOT use the original prompt_number from scraped data
- Number prompts in the order they appear in the final filtered list
- First prompt = "1", second prompt = "2", etc.

Transform the data and return ONLY the JSON in the exact format specified above. Do not include any explanations, markdown formatting, or additional text. Return pure JSON only.
`;
  }

  /**
   * Save transformation results
   */
  async saveResults(schoolName, transformedData) {
    const outputFile = path.join(__dirname, 'data', `test-${schoolName.toLowerCase().replace(/\s+/g, '-')}-transformed.json`);
    await fs.writeJson(outputFile, transformedData, { spaces: 2 });
    return outputFile;
  }

  /**
   * Display detailed analysis of transformation results
   */
  displayAnalysis(schoolName, transformedData) {
    console.log(`\n📊 TRANSFORMATION ANALYSIS`);
    console.log(`========================`);
    console.log(`🏫 School: ${schoolName}`);
    console.log(`📝 Total Prompts: ${transformedData.essay_prompts?.length || 0}`);
    
    if (transformedData.essay_prompts?.length > 0) {
      console.log(`\n📋 Prompt Details:`);
      transformedData.essay_prompts.forEach((prompt, index) => {
        console.log(`   ${index + 1}. "${prompt.prompt.substring(0, 60)}..."`);
        console.log(`      - Word Limit: ${prompt.word_limit}`);
        console.log(`      - Selection: ${prompt.selection_type}`);
        console.log(`      - Type: ${prompt.prompt_selection_type}`);
        console.log('');
      });
      
      // Word limit analysis
      const wordLimits = [...new Set(transformedData.essay_prompts.map(p => p.word_limit))];
      console.log(`📏 Word Limits Found: ${wordLimits.join(', ')}`);
      
      // Selection type analysis
      const selectionTypes = [...new Set(transformedData.essay_prompts.map(p => p.selection_type))];
      console.log(`🎯 Selection Types: ${selectionTypes.join(', ')}`);
    }
  }

  /**
   * Test transformation for a specific school
   */
  async testSchool(schoolName) {
    console.log(`🚀 Testing transformation for: ${schoolName}`);
    console.log(`🔑 API Key: ${process.env.GOOGLE_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
    
    try {
      // Step 1: Find school in scraped data
      const schoolData = this.findSchoolInScrapedData(schoolName);
      if (!schoolData) {
        return;
      }

      console.log(`\n📋 School Data Found:`);
      console.log(`   - URL: ${schoolData.university_url}`);
      console.log(`   - Raw Prompts: ${schoolData.essay_prompts.length}`);
      console.log(`   - Requirements: ${schoolData.requirements?.raw_text?.substring(0, 100) || 'Not specified'}...`);

      // Step 2: Create test data structure
      const testData = this.createTestData(schoolData);

      // Step 3: Transform with AI
      const transformedData = await this.transformWithAI(testData);

      // Step 4: Save results
      const outputFile = await this.saveResults(schoolName, transformedData);

      // Step 5: Display analysis
      this.displayAnalysis(schoolName, transformedData);

      console.log(`\n✅ Test completed successfully!`);
      console.log(`📁 Results saved to: ${outputFile}`);

      return transformedData;
    } catch (error) {
      console.error(`❌ Test failed for ${schoolName}:`, error.message);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🧪 School Transformation Tester');
  console.log('==============================');
  
  // Validate environment
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY environment variable is required');
    console.log('Please set it in your .env.local file');
    process.exit(1);
  }

  // Get school name from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\nUsage:');
    console.log('  node test-specific-school.js "School Name"');
    console.log('\nExamples:');
    console.log('  node test-specific-school.js "Princeton University"');
    console.log('  node test-specific-school.js "Harvard University"');
    console.log('  node test-specific-school.js "University of Chicago"');
    console.log('\nThis script tests the scraped data → AI transformation pipeline');
    console.log('for a specific school without rerunning the scraper.');
    process.exit(1);
  }

  const schoolName = args[0];
  const tester = new SchoolTransformationTester();

  try {
    await tester.testSchool(schoolName);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default SchoolTransformationTester;