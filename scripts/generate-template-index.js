#!/usr/bin/env node

/**
 * Template Index Generator
 * 
 * This script automatically scans the public/templates folder and generates
 * an index.json file with all available PDF templates.
 * 
 * Usage:
 *   node scripts/generate-template-index.js
 * 
 * The script will:
 * 1. Scan all subdirectories in public/templates
 * 2. Find all PDF files
 * 3. Generate an index.json file with the file paths
 * 4. Update the lastUpdated timestamp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, '../public/templates');
const INDEX_FILE = path.join(TEMPLATES_DIR, 'index.json');

// Function to recursively find all PDF files
function findPdfFiles(dir, relativePath = '') {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativeItemPath = relativePath ? path.join(relativePath, item) : item;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively search subdirectories
        files.push(...findPdfFiles(fullPath, relativeItemPath));
      } else if (stat.isFile() && path.extname(item).toLowerCase() === '.pdf') {
        // Add PDF file to the list
        files.push(relativeItemPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

// Function to generate the template index
function generateTemplateIndex() {
  console.log('🔍 Scanning templates directory...');
  
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error('❌ Templates directory not found:', TEMPLATES_DIR);
    process.exit(1);
  }
  
  const pdfFiles = findPdfFiles(TEMPLATES_DIR);
  
  if (pdfFiles.length === 0) {
    console.warn('⚠️  No PDF files found in templates directory');
  } else {
    console.log(`📄 Found ${pdfFiles.length} PDF template(s):`);
    pdfFiles.forEach(file => console.log(`   - ${file}`));
  }
  
  // Create the index object
  const index = {
    templates: pdfFiles.sort(), // Sort alphabetically
    lastUpdated: new Date().toISOString()
  };
  
  // Write the index file
  try {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    console.log(`✅ Template index generated successfully: ${INDEX_FILE}`);
    console.log(`📅 Last updated: ${index.lastUpdated}`);
  } catch (error) {
    console.error('❌ Error writing index file:', error.message);
    process.exit(1);
  }
}

// Function to watch for changes and auto-regenerate
function watchTemplates() {
  console.log('👀 Watching templates directory for changes...');
  
  fs.watch(TEMPLATES_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.pdf') || filename === 'index.json')) {
      console.log(`📝 Detected change: ${eventType} ${filename}`);
      setTimeout(() => {
        generateTemplateIndex();
      }, 1000); // Delay to ensure file operations are complete
    }
  });
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--watch') || args.includes('-w')) {
  generateTemplateIndex();
  watchTemplates();
} else {
  generateTemplateIndex();
}