#!/usr/bin/env node

/**
 * Script to add school_program_type field to all college entries in the essay prompts JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addSchoolProgramType(inputFile) {
  try {
    console.log(`📁 Reading ${inputFile}...`);
    const data = fs.readFileSync(inputFile, 'utf8');
    const jsonData = JSON.parse(data);
    
    if (!Array.isArray(jsonData)) {
      console.error('❌ Input file should contain an array of colleges');
      return false;
    }
    
    let updatedCount = 0;
    
    for (const college of jsonData) {
      if (!college.school_program_type) {
        college.school_program_type = "undergraduate";
        updatedCount++;
      }
    }
    
    console.log(`📝 Writing updated file...`);
    fs.writeFileSync(inputFile, JSON.stringify(jsonData, null, 2));
    
    console.log(`✅ Added school_program_type to ${updatedCount} colleges`);
    return true;
    
  } catch (error) {
    console.error('❌ Error updating file:', error.message);
    return false;
  }
}

function main() {
  const filePath = path.join(__dirname, '..', 'public', 'undergrad_essay_prompts.json');
  
  console.log('🔄 Adding school_program_type field to all colleges...');
  
  const success = addSchoolProgramType(filePath);
  
  if (success) {
    console.log('\n✅ Update completed successfully!');
  } else {
    console.log('\n❌ Update failed');
    process.exit(1);
  }
}

// Run the script
main();
