#!/usr/bin/env node

/**
 * Script to sync school data from JSON files to Supabase database
 * 
 * Usage:
 *   node scripts/sync-schools-to-db.js
 * 
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (for admin operations)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please set these in your .env file or environment.');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Define the JSON files to process
const JSON_FILES = [
  'undergraduate-schools.json',
  'mba-schools.json',
  'graduate-schools.json'
];

/**
 * Load and parse a JSON file
 */
function loadJsonFile(filename) {
  const filePath = path.join(__dirname, '..', 'public', filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error parsing ${filename}:`, error.message);
    return null;
  }
}

/**
 * Validate school data structure
 */
function validateSchoolData(school) {
  const requiredFields = ['name', 'school_program_type'];
  const missingFields = requiredFields.filter(field => !school[field]);
  
  if (missingFields.length > 0) {
    console.warn(`⚠️  School "${school.name}" missing required fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Validate school_program_type enum values
  const validProgramTypes = ['Undergraduate', 'MBA', 'LLM', 'PhD', 'Masters'];
  if (!validProgramTypes.includes(school.school_program_type)) {
    console.warn(`⚠️  School "${school.name}" has invalid school_program_type: ${school.school_program_type}`);
    return false;
  }
  
  // Validate institutional_type enum values
  const validInstitutionalTypes = ['public', 'private', 'liberal_arts', 'research_university', 'community_college', 'technical_institute', 'ivy_league'];
  if (school.institutional_type && !validInstitutionalTypes.includes(school.institutional_type)) {
    console.warn(`⚠️  School "${school.name}" has invalid institutional_type: ${school.institutional_type}`);
    return false;
  }
  
  return true;
}

/**
 * Upsert school data to Supabase
 */
async function upsertSchool(school) {
  try {
    const { data, error } = await supabase
      .from('schools')
      .upsert(school, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      console.error(`❌ Error upserting school "${school.name}":`, error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Exception upserting school "${school.name}":`, error.message);
    return false;
  }
}

/**
 * Process a single JSON file
 */
async function processJsonFile(filename) {
  console.log(`\n📁 Processing ${filename}...`);
  
  const jsonData = loadJsonFile(filename);
  if (!jsonData || !jsonData.schools || !Array.isArray(jsonData.schools)) {
    console.error(`❌ Invalid JSON structure in ${filename}`);
    return { processed: 0, errors: 1 };
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const school of jsonData.schools) {
    if (!validateSchoolData(school)) {
      errors++;
      continue;
    }
    
    const success = await upsertSchool(school);
    if (success) {
      processed++;
      console.log(`✅ Upserted: ${school.name} (${school.school_program_type})`);
    } else {
      errors++;
    }
  }
  
  console.log(`📊 ${filename}: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting school data sync to Supabase...');
  console.log(`📡 Connecting to: ${SUPABASE_URL}`);
  
  // Test connection
  try {
    const { data, error } = await supabase.from('schools').select('count').limit(1);
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      process.exit(1);
    }
    console.log('✅ Connected to Supabase successfully');
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  }
  
  let totalProcessed = 0;
  let totalErrors = 0;
  
  // Process each JSON file
  for (const filename of JSON_FILES) {
    const result = await processJsonFile(filename);
    totalProcessed += result.processed;
    totalErrors += result.errors;
  }
  
  console.log('\n🎉 Sync completed!');
  console.log(`📊 Total: ${totalProcessed} schools processed, ${totalErrors} errors`);
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Some schools had errors. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All schools synced successfully!');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { main, processJsonFile, upsertSchool, validateSchoolData };
