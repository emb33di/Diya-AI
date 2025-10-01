#!/usr/bin/env node

/**
 * Simple runner script for the targeted school scraper
 * Usage: node run-targeted-scraper.js
 */

import TargetedSchoolScraper from './targeted-school-scraper.js';

console.log('🎯 Starting Targeted School Scraper...');
console.log('=====================================\n');

// Check for required environment variables
if (!process.env.GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY environment variable is required');
  console.log('\nTo set it up:');
  console.log('1. Get your Google API key from: https://makersuite.google.com/app/apikey');
  console.log('2. Set it with: export GOOGLE_API_KEY="your-api-key"');
  console.log('3. Run this script again\n');
  process.exit(1);
}

const scraper = new TargetedSchoolScraper();

try {
  await scraper.run();
  console.log('\n🎉 All done! Check the data/ folder for your results.');
} catch (error) {
  console.error('\n❌ Scraping failed:', error.message);
  console.log('\nTroubleshooting tips:');
  console.log('- Make sure you have a stable internet connection');
  console.log('- Check that your GOOGLE_API_KEY is valid');
  console.log('- Try running the script again (sometimes it\'s a temporary issue)');
  process.exit(1);
}
