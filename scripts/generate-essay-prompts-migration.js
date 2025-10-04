#!/usr/bin/env node

/**
 * Script to generate SQL INSERT statements for essay prompts from JSON files
 * This creates a migration file that can be run to populate the database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Escape single quotes in SQL strings
 */
function escapeSqlString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

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
 * Convert nested structure to flat Supabase format
 */
function flattenPrompts(collegeData, programType) {
  const prompts = [];
  
  if (!collegeData.prompts || !Array.isArray(collegeData.prompts)) {
    console.warn(`⚠️  No prompts found for ${collegeData.college_name}`);
    return prompts;
  }
  
  for (const prompt of collegeData.prompts) {
    const flatPrompt = {
      college_name: collegeData.college_name,
      how_many: collegeData.how_many || "one",
      selection_type: collegeData.selection_type || "required",
      prompt_number: prompt.prompt_number,
      prompt: prompt.prompt,
      word_limit: prompt.word_limit,
      prompt_selection_type: prompt.selection_type || collegeData.selection_type || "required",
      school_program_type: collegeData.school_program_type || programType || "undergraduate"
    };
    
    prompts.push(flatPrompt);
  }
  
  return prompts;
}

/**
 * Generate SQL INSERT statement for a prompt
 */
function generateInsertStatement(prompt) {
  const title = `${prompt.college_name} - Prompt ${prompt.prompt_number}`;
  const values = [
    `'${escapeSqlString(title)}'`,
    `'${escapeSqlString(prompt.college_name)}'`,
    `'${escapeSqlString(prompt.how_many)}'`,
    `'${escapeSqlString(prompt.selection_type)}'`,
    `'${escapeSqlString(prompt.prompt_number)}'`,
    `'${escapeSqlString(prompt.prompt)}'`,
    `'${escapeSqlString(prompt.word_limit)}'`,
    `'${escapeSqlString(prompt.prompt_selection_type)}'`,
    `'${escapeSqlString(prompt.school_program_type)}'`
  ];

  return `INSERT INTO public.essay_prompts (title, college_name, how_many, selection_type, prompt_number, prompt, word_limit, prompt_selection_type, school_program_type) VALUES (${values.join(', ')});`;
}

/**
 * Process essay prompts from a JSON file
 */
function processEssayPrompts(filePath, programType) {
  console.log(`📁 Processing ${filePath}...`);
  
  const data = loadJsonFile(filePath);
  if (!data) return [];

  let allPrompts = [];
  
  if (data.essay_prompts) {
    // Flat structure - already processed
    allPrompts = data.essay_prompts;
    console.log(`   Found ${allPrompts.length} essay prompts (flat structure)`);
  } else if (Array.isArray(data)) {
    // Nested structure - flatten it
    console.log(`   Found ${data.length} colleges with nested prompts`);
    
    for (const college of data) {
      const prompts = flattenPrompts(college, programType);
      allPrompts.push(...prompts);
    }
  } else {
    console.error(`❌ Invalid format in ${filePath}: expected array or object with essay_prompts`);
    return [];
  }

  return allPrompts;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Generating essay prompts migration...');
  
  const migrationContent = [
    '-- Migration to insert essay prompts from JSON files',
    '-- Generated on: ' + new Date().toISOString(),
    '',
    '-- Clear existing data (optional - comment out if you want to keep existing data)',
    '-- DELETE FROM public.essay_prompts;',
    '',
    '-- Insert undergraduate essay prompts',
    '-- Generated from public/undergrad_essay_prompts.json',
    ''
  ];

  // Process undergraduate essay prompts
  const undergradPrompts = processEssayPrompts('public/undergrad_essay_prompts.json', 'Undergraduate');
  
  for (const prompt of undergradPrompts) {
    migrationContent.push(generateInsertStatement(prompt));
  }

  migrationContent.push('');
  migrationContent.push('-- Insert MBA essay prompts');
  migrationContent.push('-- Generated from public/mba_essay_prompts.json');
  migrationContent.push('');

  // Process MBA essay prompts
  const mbaPrompts = processEssayPrompts('public/mba_essay_prompts.json', 'MBA');
  
  for (const prompt of mbaPrompts) {
    migrationContent.push(generateInsertStatement(prompt));
  }

  // Write migration file
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const migrationFileName = `supabase/migrations/${timestamp}_insert_essay_prompts.sql`;
  
  fs.writeFileSync(migrationFileName, migrationContent.join('\n'));
  
  console.log(`\n✅ Migration file created: ${migrationFileName}`);
  console.log(`   Undergraduate prompts: ${undergradPrompts.length}`);
  console.log(`   MBA prompts: ${mbaPrompts.length}`);
  console.log(`   Total prompts: ${undergradPrompts.length + mbaPrompts.length}`);
  console.log('\n📝 To apply this migration, run:');
  console.log(`   npx supabase db push`);
}

// Run the script
main();
