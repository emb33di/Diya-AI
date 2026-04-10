/**
 * Script to create a counselor account for IvySummit
 * 
 * This script creates a user in Supabase Auth and sets up their profile as a counselor.
 * 
 * Usage:
 * 1. Set environment variables:
 *    export SUPABASE_URL="your-supabase-url"
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *    export COUNSELOR_EMAIL="counselor@ivysummit.com"
 *    export COUNSELOR_PASSWORD="secure-password-here"
 * 
 * 2. Run the script:
 *    node scripts/create-counselor-account.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const counselorEmail = process.env.COUNSELOR_EMAIL || 'counselor@example.com';
const counselorPassword = process.env.COUNSELOR_PASSWORD || 'change-me';
const counselorName = process.env.COUNSELOR_NAME || 'IvySummit Counselor';
const partnerSlug = process.env.PARTNER_SLUG || 'ivysummit';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Set them in your .env file or as environment variables');
  process.exit(1);
}

if (!counselorPassword) {
  console.error('❌ Error: COUNSELOR_PASSWORD must be set');
  console.error('   Set it in your .env file or as environment variable');
  process.exit(1);
}

// Create Supabase client with service role key (has admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createCounselorAccount() {
  try {
    console.log('🔐 Creating counselor account...');
    console.log(`   Email: ${counselorEmail}`);
    console.log(`   Partner: ${partnerSlug}`);

    // Step 1: Create user in Supabase Auth
    console.log('\n📝 Step 1: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: counselorEmail,
      password: counselorPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: counselorName,
        is_counselor: true,
        counselor_name: partnerSlug
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, updating profile instead...');
        
        // Get the existing user
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          throw new Error(`Failed to list users: ${listError.message}`);
        }
        
        const existingUser = existingUsers.users.find(u => u.email === counselorEmail);
        if (!existingUser) {
          throw new Error('User exists but could not be found');
        }
        
        authData.user = existingUser;
      } else {
        throw authError;
      }
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    console.log('✅ User created successfully');
    console.log(`   User ID: ${authData.user.id}`);

    // Step 2: Update user profile to set counselor flags
    console.log('\n📝 Step 2: Setting counselor flags on user profile...');
    
    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .update({
        is_counselor: true,
        counselor_name: partnerSlug
      })
      .eq('user_id', authData.user.id)
      .select()
      .single();

    if (profileError) {
      // If profile doesn't exist yet, create it
      if (profileError.code === 'PGRST116') {
        console.log('⚠️  Profile not found, creating it...');
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            email_address: counselorEmail,
            full_name: counselorName,
            is_counselor: true,
            counselor_name: partnerSlug,
            onboarding_complete: false
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`);
        }
        console.log('✅ Profile created successfully');
      } else {
        throw profileError;
      }
    } else {
      console.log('✅ Profile updated successfully');
    }

    // Step 3: Verify the setup
    console.log('\n📝 Step 3: Verifying setup...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('user_id, email_address, full_name, is_counselor, counselor_name')
      .eq('user_id', authData.user.id)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify profile: ${verifyError.message}`);
    }

    console.log('\n✅ Counselor account created successfully!');
    console.log('\n📋 Account Details:');
    console.log(`   Email: ${verifyData.email_address}`);
    console.log(`   Name: ${verifyData.full_name}`);
    console.log(`   Is Counselor: ${verifyData.is_counselor}`);
    console.log(`   Counselor Name: ${verifyData.counselor_name}`);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${counselorEmail}`);
    console.log(`   Password: ${counselorPassword}`);
    console.log('\n🌐 The counselor can now log in at: /auth');
    console.log(`   And access the portal at: /ivysummit-portal`);

  } catch (error) {
    console.error('\n❌ Error creating counselor account:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  }
}

createCounselorAccount();

