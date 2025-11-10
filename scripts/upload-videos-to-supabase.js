/**
 * Script to upload landing page videos to Supabase Storage (demos bucket)
 * 
 * Usage:
 *   node scripts/upload-videos-to-supabase.js
 * 
 * Requires:
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 *   - Videos in public/Website Previews/ directory
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
import dotenv from 'dotenv';
// Try .env.local first (Vite default), then .env
dotenv.config({ path: join(projectRoot, '.env.local') });
dotenv.config({ path: join(projectRoot, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use service role key for admin operations (bypasses RLS)
// Fall back to anon key if service role not available
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY:', SUPABASE_KEY ? '✓' : '✗');
  console.error('\nFor uploads, SUPABASE_SERVICE_ROLE_KEY is recommended (bypasses RLS)');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
  console.error('\nAlternatively, upload manually through the Supabase Dashboard');
  process.exit(1);
}

// Use service role key if available (for admin operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Videos to upload
const videos = [
  { localPath: 'public/Website Previews/essays-wide.mp4', storagePath: 'essays-wide.mp4' },
  { localPath: 'public/Website Previews/lor-wide.mp4', storagePath: 'lor-wide.mp4' },
  { localPath: 'public/Website Previews/Counselor Demo.mp4', storagePath: 'Counselor Demo.mp4' },
  { localPath: 'public/Website Previews/resume-wide.mp4', storagePath: 'resume-wide.mp4' },
];

async function uploadVideo(localPath, storagePath) {
  const fullPath = join(projectRoot, localPath);
  
  if (!existsSync(fullPath)) {
    console.error(`❌ File not found: ${localPath}`);
    return { success: false, error: 'File not found' };
  }

  try {
    console.log(`\n📤 Uploading ${storagePath}...`);
    
    const fileBuffer = readFileSync(fullPath);
    const file = new File([fileBuffer], storagePath, { type: 'video/mp4' });
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('demos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if exists
        contentType: 'video/mp4'
      });

    if (error) {
      console.error(`❌ Upload failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('demos')
      .getPublicUrl(storagePath);

    console.log(`✅ Uploaded successfully!`);
    console.log(`   Public URL: ${urlData.publicUrl}`);
    
    return { success: true, url: urlData.publicUrl, path: storagePath };
  } catch (error) {
    console.error(`❌ Error uploading ${storagePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting video upload to Supabase Storage (demos bucket)...\n');
  
  const results = [];
  
  for (const video of videos) {
    const result = await uploadVideo(video.localPath, video.storagePath);
    results.push({ ...video, ...result });
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${videos.length}`);
  console.log(`❌ Failed: ${failed.length}/${videos.length}`);
  
  if (successful.length > 0) {
    console.log('\n📝 Public URLs (use these in your code):');
    successful.forEach(({ storagePath, url }) => {
      console.log(`   ${storagePath}:`);
      console.log(`   ${url}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed uploads:');
    failed.forEach(({ storagePath, error }) => {
      console.log(`   ${storagePath}: ${error}`);
    });
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Update your video components to use these Supabase URLs');
  console.log('   2. Or use the getVideoUrl() helper function');
  console.log('   3. Test in production to ensure videos load correctly\n');
}

main().catch(console.error);

