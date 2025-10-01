#!/usr/bin/env node

/**
 * Blog Post Management Script
 * 
 * This script helps manage blog posts in the file-based blog system.
 * 
 * Usage:
 *   node scripts/blog-manager.js create "My New Post Title"
 *   node scripts/blog-manager.js list
 *   node scripts/blog-manager.js update-index
 */

const fs = require('fs');
const path = require('path');

const BLOG_POSTS_DIR = path.join(__dirname, '../public/blog-posts');
const INDEX_FILE = path.join(BLOG_POSTS_DIR, 'index.json');

// Function to create a slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

// Function to create HTML template
function createHTMLTemplate(title, slug) {
  const today = new Date().toISOString().split('T')[0];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="Brief description of your blog post">
    <meta name="author" content="Diya AI Team">
    <meta name="date" content="${today}">
    <meta name="read-time" content="5 min read">
    <meta name="category" content="General">
    <meta name="tags" content="tag1, tag2, tag3">
    <meta name="featured" content="false">
</head>
<body>
    <article>
        <h1>${title}</h1>
        
        <p>Your blog post content goes here...</p>
        
        <h2>Subheading</h2>
        <p>More content...</p>
        
        <h2>Conclusion</h2>
        <p>Conclusion paragraph...</p>
    </article>
</body>
</html>`;
}

// Function to create a new blog post
function createBlogPost(title) {
  const slug = createSlug(title);
  const filename = `${slug}.html`;
  const filepath = path.join(BLOG_POSTS_DIR, filename);
  
  // Check if file already exists
  if (fs.existsSync(filepath)) {
    console.error(`❌ Blog post with slug "${slug}" already exists!`);
    return;
  }
  
  // Create the HTML file
  const htmlContent = createHTMLTemplate(title, slug);
  fs.writeFileSync(filepath, htmlContent);
  
  // Update index.json
  updateIndex(slug);
  
  console.log(`✅ Created blog post: ${filename}`);
  console.log(`📝 Edit the file at: ${filepath}`);
  console.log(`🔗 URL will be: /blog/${slug}`);
}

// Function to update index.json
function updateIndex(newSlug) {
  let indexData;
  
  if (fs.existsSync(INDEX_FILE)) {
    const content = fs.readFileSync(INDEX_FILE, 'utf8');
    indexData = JSON.parse(content);
  } else {
    indexData = { posts: [] };
  }
  
  // Add new slug if not already present
  if (!indexData.posts.includes(newSlug)) {
    indexData.posts.push(newSlug);
    indexData.posts.sort(); // Keep sorted
  }
  
  fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2));
  console.log(`📋 Updated index.json`);
}

// Function to list all blog posts
function listBlogPosts() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.log('❌ No index.json found. Run "update-index" first.');
    return;
  }
  
  const content = fs.readFileSync(INDEX_FILE, 'utf8');
  const indexData = JSON.parse(content);
  
  console.log('📚 Blog Posts:');
  console.log('=============');
  
  indexData.posts.forEach((slug, index) => {
    const filepath = path.join(BLOG_POSTS_DIR, `${slug}.html`);
    const exists = fs.existsSync(filepath);
    const status = exists ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${slug}`);
  });
}

// Function to update index from existing files
function updateIndexFromFiles() {
  if (!fs.existsSync(BLOG_POSTS_DIR)) {
    console.error('❌ Blog posts directory does not exist!');
    return;
  }
  
  const files = fs.readdirSync(BLOG_POSTS_DIR)
    .filter(file => file.endsWith('.html'))
    .map(file => file.replace('.html', ''))
    .sort();
  
  const indexData = { posts: files };
  fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2));
  
  console.log(`✅ Updated index.json with ${files.length} blog posts`);
}

// Main function
function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'create':
      if (!arg) {
        console.error('❌ Please provide a title for the blog post');
        console.log('Usage: node scripts/blog-manager.js create "My New Post Title"');
        return;
      }
      createBlogPost(arg);
      break;
      
    case 'list':
      listBlogPosts();
      break;
      
    case 'update-index':
      updateIndexFromFiles();
      break;
      
    default:
      console.log('📝 Blog Post Manager');
      console.log('===================');
      console.log('');
      console.log('Commands:');
      console.log('  create "Title"     - Create a new blog post');
      console.log('  list              - List all blog posts');
      console.log('  update-index      - Update index from existing files');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/blog-manager.js create "How to Write Great Essays"');
      console.log('  node scripts/blog-manager.js list');
      console.log('  node scripts/blog-manager.js update-index');
  }
}

main();
