import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Agent to transform scraped essay prompt data into the correct JSON format
 * Uses Gemini 2.5 Pro for intelligent data transformation
 */
class EssayPromptTransformAgent {
  constructor() {
    // Initialize Gemini AI
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  /**
   * Transform scraped data to the required JSON format
   */
  async transformScrapedData(scrapedData) {
    console.log('🤖 AI Agent: Transforming scraped data...');
    
    const prompt = this.createTransformationPrompt(scrapedData);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const transformedData = response.text();
      
      // Parse the JSON response
      const jsonMatch = transformedData.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      } else {
        // Try to parse the entire response as JSON
        return JSON.parse(transformedData);
      }
    } catch (error) {
      console.error('❌ AI transformation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create the transformation prompt for Gemini
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
- Look in requirements.raw_text for word limits
- Common patterns: "250 words", "150-300 words", "1-2 pages"
- If not specified, use "Not specified"

### 6. College Name Extraction:
- Extract from university_url path
- "university-of-chicago-supplemental-essay-prompt-guide" → "University of Chicago"
- "harvard-university-supplemental-essay-prompt-guide" → "Harvard University"

### 7. Prompt Numbering:
- Use sequential numbering starting from 1 for the final output
- Do NOT use the original prompt_number from scraped data
- Number prompts in the order they appear in the final filtered list
- First prompt = "1", second prompt = "2", etc.

## Example Analysis for University of Chicago:
- Requirements: "2 essays of 1-2 pages each" → how_many = "2"
- Structure: 1 required + 1 of 6 options
- Required prompt: "How does the University of Chicago..." → selection_type = "required"
- Option prompts: "In an ideal world..." → selection_type = "optional"
- Overall structure: "choose_one" (choose 1 of 6 options for second essay)

## Examples of what to KEEP (actual prompts):
- "How does the University of Chicago, as you know it now, satisfy your desire for a particular kind of learning, community, and future?"
- "In an ideal world where inter-species telepathic communication exists, which species would you choose to have a conversation with?"
- "If you could uninvent one thing, what would it be — and what would unravel as a result?"

Transform the data and return ONLY the JSON in the exact format specified above. Do not include any explanations or additional text.
`;
  }

  /**
   * Process a scraped data file
   */
  async processFile(inputFilePath, outputFilePath) {
    console.log(`📁 Processing: ${inputFilePath}`);
    
    try {
      // Read the scraped data
      const scrapedData = await fs.readJson(inputFilePath);
      
      // Transform using AI
      const transformedData = await this.transformScrapedData(scrapedData);
      
      // Validate the output
      if (!this.validateTransformedData(transformedData)) {
        throw new Error('Transformed data validation failed');
      }
      
      // Save the transformed data
      await fs.writeJson(outputFilePath, transformedData, { spaces: 2 });
      
      console.log(`✅ Transformed data saved to: ${outputFilePath}`);
      console.log(`📊 Summary:`);
      console.log(`   - Universities processed: ${scrapedData.universities?.length || 0}`);
      console.log(`   - Prompts extracted: ${transformedData.essay_prompts?.length || 0}`);
      
      return transformedData;
      
    } catch (error) {
      console.error(`❌ Error processing ${inputFilePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate the transformed data structure
   */
  validateTransformedData(data) {
    if (!data || !data.essay_prompts || !Array.isArray(data.essay_prompts)) {
      console.error('❌ Invalid structure: missing essay_prompts array');
      return false;
    }

    for (const prompt of data.essay_prompts) {
      const requiredFields = ['college_name', 'how_many', 'selection_type', 'prompt_number', 'prompt', 'word_limit', 'prompt_selection_type', 'school_program_type'];
      
      for (const field of requiredFields) {
        if (!prompt[field]) {
          console.error(`❌ Missing required field: ${field}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Process multiple files
   */
  async processMultipleFiles(inputDir, outputDir) {
    console.log('🚀 AI Agent: Processing multiple files...');
    
    await fs.ensureDir(outputDir);
    
    const files = await fs.readdir(inputDir);
    const aiReadyFiles = files.filter(file => file.startsWith('ai-ready-format-') && file.endsWith('.json'));
    
    console.log(`📁 Found ${aiReadyFiles.length} files to process`);
    
    const results = [];
    
    for (const file of aiReadyFiles) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, `transformed-${file}`);
      
      try {
        const result = await this.processFile(inputPath, outputPath);
        results.push({ file, success: true, prompts: result.essay_prompts.length });
      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error.message);
        results.push({ file, success: false, error: error.message });
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n📊 Processing Summary:`);
    console.log(`   ✅ Successful: ${successful.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(`   📝 Total prompts: ${successful.reduce((sum, r) => sum + r.prompts, 0)}`);
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed files:`);
      failed.forEach(f => console.log(`   - ${f.file}: ${f.error}`));
    }
    
    return results;
  }
}

/**
 * Main execution function
 */
async function main() {
  // Check for API key
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY environment variable is required');
    console.log('Please set it with: export GOOGLE_API_KEY="your-api-key"');
    process.exit(1);
  }

  const agent = new EssayPromptTransformAgent();
  
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🤖 AI Essay Prompt Transform Agent');
    console.log('==================================');
    console.log('');
    console.log('Usage:');
    console.log('  node ai-transform-agent.js <input-file> [output-file]');
    console.log('  node ai-transform-agent.js --batch [input-dir] [output-dir]');
    console.log('');
    console.log('Examples:');
    console.log('  node ai-transform-agent.js data/ai-ready-format-2025-09-30T13-20-41-144Z.json');
    console.log('  node ai-transform-agent.js --batch data/ transformed/');
    process.exit(1);
  }

  try {
    if (args[0] === '--batch') {
      const inputDir = args[1] || './data';
      const outputDir = args[2] || './transformed';
      
      await agent.processMultipleFiles(inputDir, outputDir);
    } else {
      const inputFile = args[0];
      const outputFile = args[1] || inputFile.replace('.json', '-transformed.json');
      
      await agent.processFile(inputFile, outputFile);
    }
    
    console.log('\n🎉 AI transformation completed successfully!');
    
  } catch (error) {
    console.error('❌ AI transformation failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default EssayPromptTransformAgent;
