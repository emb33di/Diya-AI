/**
 * Script to create a test user using Supabase Admin API
 * 
 * This is the RECOMMENDED way to create users as it properly handles
 * all Supabase Auth requirements that direct SQL insertion might miss.
 * 
 * Usage:
 * 1. Set environment variables:
 *    export SUPABASE_URL="your-supabase-url"
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 * 
 * 2. Run the script:
 *    node scripts/create-test-user.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmail = process.env.TEST_EMAIL || 'user@example.com';
const testPassword = process.env.TEST_PASSWORD || 'change-me';
const testName = process.env.TEST_NAME || 'Test User';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Set them in your .env file or as environment variables');
  process.exit(1);
}

// Create Supabase client with service role key (has admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    console.log('🔐 Creating test user...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);

    // Step 1: Check if user already exists
    console.log('\n📝 Step 1: Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const existingUser = existingUsers.users.find(u => u.email === testEmail);
    
    if (existingUser) {
      console.log('⚠️  User already exists. Deleting and recreating...');
      
      // Delete existing user (this will cascade delete the profile)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        throw new Error(`Failed to delete existing user: ${deleteError.message}`);
      }
      console.log('✅ Existing user deleted');
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 2: Create user in Supabase Auth using Admin API
    console.log('\n📝 Step 2: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: testName
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    console.log('✅ User created successfully');
    console.log(`   User ID: ${authData.user.id}`);

    // Step 3: Wait for trigger to create profile, then verify
    console.log('\n📝 Step 3: Verifying user profile...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email_address, full_name, applying_to, onboarding_complete')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError) {
      console.warn('⚠️  Profile not found, creating it manually...');
      const { error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          email_address: testEmail,
          full_name: testName,
          applying_to: 'undergraduate',
          onboarding_complete: false
        });

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
      }
      console.log('✅ Profile created successfully');
    } else {
      console.log('✅ Profile verified');
    }

    console.log('\n✅ Test user created successfully!');
    console.log('\n📋 Account Details:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   User ID: ${authData.user.id}`);
    console.log('\n🔑 You can now log in with these credentials at: /auth');

  } catch (error) {
    console.error('\n❌ Error creating test user:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  }
}

createTestUser();

