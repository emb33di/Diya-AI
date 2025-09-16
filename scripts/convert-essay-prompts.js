#!/usr/bin/env node

/**
 * Script to convert nested essay prompts structure to flat structure
 * 
 * Usage:
 *   node scripts/convert-essay-prompts.js
 * 
 * This script converts the nested structure:
 * [
 *   {
 *     "college_name": "College Name",
 *     "prompts": [
 *       { "prompt_number": "1", "prompt": "...", ... }
 *     ]
 *   }
 * ]
 * 
 * To the flat structure:
 * {
 *   "essay_prompts": [
 *     { "college_name": "College Name", "prompt_number": "1", "prompt": "...", ... }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert nested structure to flat structure
 */
function convertNestedToFlat(inputFile, outputFile) {
  try {
    console.log(`📁 Reading ${inputFile}...`);
    const data = fs.readFileSync(inputFile, 'utf8');
    const inputData = JSON.parse(data);
    
    if (!Array.isArray(inputData)) {
      console.error('❌ Input file should contain an array of colleges');
      return false;
    }
    
    const flatPrompts = [];
    
    for (const college of inputData) {
      if (!college.college_name || !college.prompts || !Array.isArray(college.prompts)) {
        console.warn(`⚠️  Skipping invalid college entry: ${JSON.stringify(college)}`);
        continue;
      }
      
      for (const prompt of college.prompts) {
        const flatPrompt = {
          college_name: college.college_name,
          how_many: college.how_many || "one",
          selection_type: college.selection_type || "required",
          prompt_number: prompt.prompt_number,
          prompt: prompt.prompt,
          word_limit: prompt.word_limit,
          prompt_selection_type: prompt.selection_type || prompt.prompt_selection_type || "required",
          school_program_type: "Undergraduate" // Default for undergraduate prompts
        };
        
        // Validate required fields
        if (!flatPrompt.prompt_number || !flatPrompt.prompt) {
          console.warn(`⚠️  Skipping prompt with missing required fields: ${JSON.stringify(prompt)}`);
          continue;
        }
        
        flatPrompts.push(flatPrompt);
      }
    }
    
    const outputData = {
      essay_prompts: flatPrompts
    };
    
    console.log(`📝 Writing ${outputFile}...`);
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    
    console.log(`✅ Converted ${flatPrompts.length} prompts from ${inputData.length} colleges`);
    return true;
    
  } catch (error) {
    console.error('❌ Error converting file:', error.message);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  const inputFile = path.join(__dirname, '..', 'public', 'undergrad_essay_prompts.json');
  const outputFile = path.join(__dirname, '..', 'public', 'undergrad_essay_prompts_converted.json');
  
  console.log('🔄 Converting nested essay prompts to flat structure...');
  
  const success = convertNestedToFlat(inputFile, outputFile);
  
  if (success) {
    console.log('\n✅ Conversion completed successfully!');
    console.log(`📄 Output file: ${outputFile}`);
    console.log('\n📋 Next steps:');
    console.log('1. Review the converted file');
    console.log('2. Replace the original file if satisfied');
    console.log('3. Run: npm run sync-essay-prompts');
  } else {
    console.log('\n❌ Conversion failed');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { convertNestedToFlat };
