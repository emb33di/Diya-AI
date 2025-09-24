// Debug utility to help identify Supabase 406 errors
import { supabase } from '@/integrations/supabase/client';

export const debugSupabase406 = async () => {
  console.log('🔍 Debugging Supabase 406 errors...');
  
  try {
    // 1. Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth error:', authError);
      return { success: false, error: 'Auth error', details: authError };
    }
    console.log('✅ User authenticated:', user?.id);
    
    // 2. Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else {
      console.log('✅ Session exists:', !!session);
      console.log('✅ Session user ID:', session?.user?.id);
    }
    
    // 3. Check auth.uid() directly
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log('✅ Current user from auth.getUser():', currentUser?.id);
    
    // 4. Test auth.uid() by checking if we can access user data
    console.log('✅ User metadata:', user?.user_metadata);
    console.log('✅ User email:', user?.email);
    
    // Test user_profiles table with different approaches
    console.log('🔍 Testing user_profiles table...');
    
    // Test 1: Simple select without filters
    const { data: allProfiles, error: allError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (allError) {
      console.error('❌ user_profiles basic select error:', allError);
      console.log('Error details:', {
        code: allError.code,
        message: allError.message,
        details: allError.details,
        hint: allError.hint
      });
    } else {
      console.log('✅ user_profiles basic select works:', allProfiles);
    }
    
    // Test 2: Select with user filter
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (userError) {
      console.error('❌ user_profiles user filter error:', userError);
      console.log('Error details:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      });
    } else {
      console.log('✅ user_profiles user filter works:', userProfile);
    }
    
    // Test 3: Select specific fields
    const { data: specificFields, error: specificError } = await supabase
      .from('user_profiles')
      .select('full_name, preferred_name')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (specificError) {
      console.error('❌ user_profiles specific fields error:', specificError);
      console.log('Error details:', {
        code: specificError.code,
        message: specificError.message,
        details: specificError.details,
        hint: specificError.hint
      });
    } else {
      console.log('✅ user_profiles specific fields works:', specificFields);
    }
    
    // Test 4: Check if user has any profile data
    const { data: profileExists, error: existsError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existsError) {
      console.error('❌ user_profiles exists check error:', existsError);
    } else {
      console.log('✅ User profile exists:', !!profileExists);
    }
    
    return { 
      success: true, 
      user: user?.id,
      userProfilesTableWorks: !allError,
      userHasProfile: !!profileExists
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: 'Unexpected error', details: error };
  }
};

// Function to test creating a user profile
export const testCreateUserProfile = async () => {
  console.log('🔍 Testing user profile creation...');
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ No authenticated user');
      return { success: false, error: 'No authenticated user' };
    }
    
    // Try to create a minimal user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || 'Test User',
        email_address: user.email
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Create user profile error:', error);
      console.log('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return { success: false, error: 'Create failed', details: error };
    } else {
      console.log('✅ User profile created successfully:', data);
      return { success: true, data };
    }
    
  } catch (error) {
    console.error('❌ Unexpected error creating profile:', error);
    return { success: false, error: 'Unexpected error', details: error };
  }
};
