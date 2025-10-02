import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '../.env.local' });

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
    let transformedData;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      transformedData = response.text();
      
      // Parse the JSON response - handle multiple formats
      let jsonData;
      
      console.log('Raw AI response preview:', transformedData.substring(0, 500) + '...');
      console.log('Response length:', transformedData.length);
      console.log('First 20 chars:', JSON.stringify(transformedData.substring(0, 20)));
      
      // Try to extract JSON from markdown code blocks first
      console.log('Looking for JSON in markdown code blocks...');
      console.log('Response ends with:', JSON.stringify(transformedData.slice(-50)));
      
      // More flexible regex that handles various endings
      const jsonMatch = transformedData.match(/```json\s*\n([\s\S]*?)(?:\n```|```)/);
      console.log('JSON match result:', jsonMatch ? 'Found' : 'Not found');
      
      if (jsonMatch) {
        console.log('Found JSON in markdown code block');
        console.log('Extracted JSON length:', jsonMatch[1].length);
        jsonData = JSON.parse(jsonMatch[1]);
      } else {
        // Try to extract JSON from any code block
        console.log('Looking for JSON in generic code blocks...');
        const codeBlockMatch = transformedData.match(/```\s*\n([\s\S]*?)(?:\n```|```)/);
        console.log('Code block match result:', codeBlockMatch ? 'Found' : 'Not found');
        
        if (codeBlockMatch) {
          console.log('Found JSON in generic code block');
          console.log('Extracted JSON length:', codeBlockMatch[1].length);
          jsonData = JSON.parse(codeBlockMatch[1]);
        } else {
          // Try to parse the entire response as JSON
          console.log('Trying to parse entire response as JSON');
          jsonData = JSON.parse(transformedData);
        }
      }
      
      return jsonData;
    } catch (error) {
      console.error('❌ AI transformation failed:', error.message);
      console.log('Raw AI response:', transformedData?.substring(0, 500) + '...');
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
  "school": "University Name",
  "year": "2025-26",
  "prompts": [
    {
      "id": "unique-prompt-id",
      "title": "Prompt Title",
      "required": true,
      "type": "why|community|creative|choose_one|other",
      "prompt": "The actual essay prompt text",
      "instructions": "Additional instructions if any",
      "word_limit": 500
    },
    {
      "id": "unique-prompt-id-2",
      "title": "Prompt Title",
      "required": true,
      "type": "choose_one",
      "instructions": "Choose one of the following essay options.",
      "word_limit": 650,
      "options": [
        {
          "id": "option-1-id",
          "prompt": "First option prompt text"
        },
        {
          "id": "option-2-id", 
          "prompt": "Second option prompt text"
        }
      ]
    }
  ]
}

## CRITICAL Transformation Rules:

### 1. School Name Extraction:
- Extract from university_url path
- "university-of-chicago-supplemental-essay-prompt-guide" → "University of Chicago"
- "harvard-university-supplemental-essay-prompt-guide" → "Harvard University"
- Convert hyphens to spaces and title case

### 2. Year Setting:
- Always set year to "2025-26" for current application cycle

### 3. Prompt ID Generation:
- Create unique IDs using pattern: school-slug-prompt-type-number
- Examples: "uchicago-why", "uchicago-creative", "bu-community"
- For options: "uchicago-2025-opt1", "uchicago-2025-opt2"

### 4. Prompt Type Classification:
- "why" - Why this school questions
- "community" - Community/diversity questions  
- "creative" - Creative/unusual prompts
- "choose_one" - When multiple options are provided
- "other" - Standard essay prompts

### 5. Required Field Logic:
- If prompt text contains "Required" → set required = true
- If prompt text contains "Optional" → set required = false
- Default to true for most prompts

### 6. Choose One Handling:
- When multiple options are provided (like UChicago's 7 options), create one prompt with type="choose_one"
- Put all options in the "options" array
- Each option gets its own unique ID

### 7. Word Limit Extraction:
- Extract numeric word limits from prompt text
- Look for patterns: "250-500 words", "650 words", "300 words or less"
- Convert to numeric value (e.g., "250-500 words" → 500)
- If range given, use the higher number
- If not specified, omit the word_limit field

### 8. Instructions Field:
- Extract any additional instructions from prompt text
- Examples: "Answer required. 250-500 words recommended.", "Respond to one of the following essay prompts. 300 words or less."
- Clean up and include in instructions field

### 9. Prompt Filtering (REMOVE these):
- Headers: "The Requirements:", "Supplemental Essay Type(s):", "How to Write"
- Metadata: "University of Chicago 2025-26 Application Essay Question Explanations"
- Stats: "Acceptance Rate:", "Undergrad Population:", "Ivy League:"
- Credits: "Inspired by...", "Class of...", "Ella Somaiya, Class of 2028"
- Section headers: "Question 1 (Required)", "Question 2: Extended Essay"
- Option labels: "Essay Option 1", "Essay Option 2", etc.

### 10. Keep Only Actual Essay Prompts:
- Questions that students must answer
- Statements that require a response
- Prompts that end with "?" or require explanation

## Example Analysis for University of Chicago:
- Requirements: "2 essays of 1-2 pages each" 
- Structure: 1 required + 1 choose_one with 7 options
- Prompt 1: "How does the University of Chicago..." → type="why", required=true
- Prompt 2: Multiple creative options → type="choose_one", required=true, options array with 7 items

## Example Analysis for Boston University:
- Requirements: "1 essay, 300 words or less"
- Structure: 1 choose_one with 2 options
- Prompt 1: Two community-focused options → type="choose_one", required=true, options array with 2 items

## Examples of what to KEEP (actual prompts):
- "How does the University of Chicago, as you know it now, satisfy your desire for a particular kind of learning, community, and future?"
- "In an ideal world where inter-species telepathic communication exists, which species would you choose to have a conversation with?"
- "If you could uninvent one thing, what would it be — and what would unravel as a result?"

Transform the data and return ONLY the JSON in the exact format specified above. Do not include any explanations, markdown formatting, or additional text. Return pure JSON only.
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
      console.log(`   - School: ${transformedData.school}`);
      console.log(`   - Year: ${transformedData.year}`);
      console.log(`   - Prompts extracted: ${transformedData.prompts?.length || 0}`);
      
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
    if (!data || !data.school || !data.year || !data.prompts || !Array.isArray(data.prompts)) {
      console.error('❌ Invalid structure: missing school, year, or prompts array');
      return false;
    }

    for (const prompt of data.prompts) {
      const requiredFields = ['id', 'title', 'required', 'type', 'prompt'];
      
      for (const field of requiredFields) {
        if (prompt[field] === undefined || prompt[field] === null) {
          console.error(`❌ Missing required field: ${field}`);
          return false;
        }
      }

      // Validate choose_one prompts have options
      if (prompt.type === 'choose_one' && (!prompt.options || !Array.isArray(prompt.options) || prompt.options.length === 0)) {
        console.error(`❌ choose_one prompt missing options array: ${prompt.id}`);
        return false;
      }

      // Validate options have required fields
      if (prompt.options) {
        for (const option of prompt.options) {
          if (!option.id || !option.prompt) {
            console.error(`❌ Option missing required fields: ${JSON.stringify(option)}`);
            return false;
          }
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
        results.push({ file, success: true, prompts: result.prompts.length, school: result.school });
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
