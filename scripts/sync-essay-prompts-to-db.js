#!/usr/bin/env node

/**
 * Script to sync essay prompts from JSON files to Supabase database
 * 
 * Usage:
 *   node scripts/sync-essay-prompts-to-db.js
 * 
 * This script will:
 * 1. Load essay prompts from public/undergrad_essay_prompts.json and public/mba_essay_prompts.json
 * 2. Upsert them into the essay_prompts table in Supabase
 * 3. Handle duplicates by updating existing records
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  console.error('\nPlease check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Valid school program types
const validProgramTypes = ['Undergraduate', 'MBA', 'LLM', 'PhD', 'Masters'];

/**
 * Load and parse a JSON file
 */
function loadJsonFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Validate essay prompt data
 */
function validateEssayPrompt(prompt, filePath) {
  const requiredFields = ['college_name', 'prompt_number', 'prompt', 'word_limit'];
  const missingFields = requiredFields.filter(field => !prompt[field]);
  
  if (missingFields.length > 0) {
    console.warn(`⚠️  ${prompt.college_name} prompt ${prompt.prompt_number} missing: ${missingFields.join(', ')}`);
    return false;
  }

  // Validate school_program_type
  if (prompt.school_program_type && !validProgramTypes.includes(prompt.school_program_type)) {
    console.warn(`⚠️  ${prompt.college_name} prompt ${prompt.prompt_number} has invalid school_program_type: ${prompt.school_program_type}`);
    return false;
  }

  // Validate word_limit format
  if (prompt.word_limit && typeof prompt.word_limit === 'string') {
    const wordLimitPattern = /^(\d+)(-\d+)?$/;
    if (!wordLimitPattern.test(prompt.word_limit.replace(/\s/g, ''))) {
      console.warn(`⚠️  ${prompt.college_name} prompt ${prompt.prompt_number} has unusual word_limit format: ${prompt.word_limit}`);
    }
  }

  // Validate prompt text length
  if (prompt.prompt && prompt.prompt.length < 10) {
    console.warn(`⚠️  ${prompt.college_name} prompt ${prompt.prompt_number} has very short prompt text (${prompt.prompt.length} chars)`);
  }

  return true;
}

/**
 * Upsert essay prompt to database
 */
async function upsertEssayPrompt(prompt) {
  try {
    // Clean the prompt data before upserting
    const cleanPrompt = {
      college_name: prompt.college_name?.trim(),
      how_many: prompt.how_many?.trim() || "one",
      selection_type: prompt.selection_type?.trim() || "required",
      prompt_number: prompt.prompt_number?.trim(),
      prompt: prompt.prompt?.trim(),
      word_limit: prompt.word_limit?.trim(),
      prompt_selection_type: prompt.prompt_selection_type?.trim() || prompt.selection_type?.trim() || "required",
      school_program_type: prompt.school_program_type?.trim() || "undergraduate"
    };

    // Check if record already exists
    const { data: existing } = await supabase
      .from('essay_prompts')
      .select('id')
      .eq('college_name', cleanPrompt.college_name)
      .eq('prompt_number', cleanPrompt.prompt_number)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing record
      result = await supabase
        .from('essay_prompts')
        .update(cleanPrompt)
        .eq('id', existing.id)
        .select();
    } else {
      // Insert new record
      result = await supabase
        .from('essay_prompts')
        .insert(cleanPrompt)
        .select();
    }

    if (result.error) {
      console.error(`❌ Error ${existing ? 'updating' : 'inserting'} essay prompt for ${prompt.college_name} prompt ${prompt.prompt_number}:`, result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error in upsertEssayPrompt:', error);
    return false;
  }
}

/**
 * Parse selection rule to understand requirements
 */
function parseSelectionRule(collegeData) {
  const howMany = collegeData.how_many;
  const selectionType = collegeData.selection_type || 'required'; // Default to 'required' if missing
  
  return {
    totalRequired: howMany,
    selectionRule: selectionType,
    description: `${selectionType.replace('_', ' ')} from ${collegeData.prompts?.length || 0} prompts`
  };
}

/**
 * Convert nested structure to flat Supabase format
 */
function flattenPrompts(collegeData, programType) {
  const prompts = [];
  const requirements = parseSelectionRule(collegeData);
  
  if (!collegeData.prompts || !Array.isArray(collegeData.prompts)) {
    console.warn(`⚠️  No prompts found for ${collegeData.college_name}`);
    return prompts;
  }
  
  for (const prompt of collegeData.prompts) {
    const flatPrompt = {
      college_name: collegeData.college_name,
      how_many: collegeData.how_many || "one",
      selection_type: collegeData.selection_type || "required", // College-level selection rule
      prompt_number: prompt.prompt_number,
      prompt: prompt.prompt,
      word_limit: prompt.word_limit,
      prompt_selection_type: prompt.selection_type || collegeData.selection_type || "required", // Prompt-level selection
      school_program_type: collegeData.school_program_type || programType || "undergraduate",
      // Additional metadata for better understanding
      total_prompts_available: collegeData.prompts.length,
      selection_rule_description: requirements.description
    };
    
    prompts.push(flatPrompt);
  }
  
  return prompts;
}

/**
 * Process essay prompts from a JSON file
 */
async function processEssayPrompts(filePath, programType) {
  console.log(`\n📁 Processing ${filePath}...`);
  
  const data = loadJsonFile(filePath);
  if (!data) return;

  // Handle nested structure (colleges with prompts arrays)
  let allPrompts = [];
  let collegesProcessed = 0;
  
  if (data.essay_prompts) {
    // Flat structure - already processed
    allPrompts = data.essay_prompts;
    console.log(`   Found ${allPrompts.length} essay prompts (flat structure)`);
  } else if (Array.isArray(data)) {
    // Nested structure - flatten it
    collegesProcessed = data.length;
    console.log(`   Found ${collegesProcessed} colleges with nested prompts`);
    
    for (const college of data) {
      console.log(`\n  🏫 ${college.college_name}`);
      
      const requirements = parseSelectionRule(college);
      console.log(`     Requirements: ${requirements.description}`);
      
      const prompts = flattenPrompts(college, programType);
      console.log(`     Prompts: ${prompts.length} available`);
      
      allPrompts.push(...prompts);
    }
  } else {
    console.error(`❌ Invalid format in ${filePath}: expected array or object with essay_prompts`);
    return;
  }

  if (!Array.isArray(allPrompts)) {
    console.error(`❌ Invalid format in ${filePath}: expected array of essay prompts`);
    return;
  }

  console.log(`\n📊 Processing ${allPrompts.length} total prompts...`);

  let successCount = 0;
  let errorCount = 0;

  for (const prompt of allPrompts) {
    // Add school_program_type if not present
    if (!prompt.school_program_type && programType) {
      prompt.school_program_type = programType;
    }

    if (!validateEssayPrompt(prompt, filePath)) {
      errorCount++;
      continue;
    }

    const success = await upsertEssayPrompt(prompt);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log(`\n📊 Summary for ${filePath}:`);
  if (collegesProcessed > 0) {
    console.log(`   Colleges processed: ${collegesProcessed}`);
  }
  console.log(`   Total prompts: ${allPrompts.length}`);
  console.log(`   ✅ Successfully synced: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount}`);
  }
}

/**
 * Show database statistics
 */
async function showDatabaseStats() {
  try {
    const { data: totalCount } = await supabase
      .from('essay_prompts')
      .select('*', { count: 'exact', head: true });
    
    const { data: programTypeStats } = await supabase
      .from('essay_prompts')
      .select('school_program_type')
      .not('school_program_type', 'is', null);
    
    const programCounts = {};
    programTypeStats?.forEach(prompt => {
      programCounts[prompt.school_program_type] = (programCounts[prompt.school_program_type] || 0) + 1;
    });
    
    console.log(`\n📊 Database Statistics:`);
    console.log(`   Total essay prompts: ${totalCount || 0}`);
    
    if (Object.keys(programCounts).length > 0) {
      console.log(`   By program type:`);
      Object.entries(programCounts).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    }
  } catch (error) {
    console.warn('⚠️  Could not fetch database statistics:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting improved essay prompts sync to Supabase...');
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  try {
    // Process undergraduate essay prompts
    await processEssayPrompts('public/undergrad_essay_prompts.json', 'Undergraduate');
    
    // Process MBA essay prompts
    await processEssayPrompts('public/mba_essay_prompts.json', 'MBA');
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Essay prompts sync completed in ${duration}s!`);
    
    // Show database statistics
    await showDatabaseStats();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
