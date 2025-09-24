-- Test script for the new atomic signup function
-- This script can be run in Supabase SQL editor to test the functions

-- Test 1: Test the atomic profile creation function
-- (Note: You'll need to replace the UUID with an actual user ID from your auth.users table)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid(); -- Replace with actual user ID for testing
  result JSON;
BEGIN
  -- Test the atomic profile creation
  SELECT public.create_user_profiles_atomic(
    test_user_id,
    'test@example.com',
    'John',
    'Doe',
    'Undergraduate'
  ) INTO result;
  
  RAISE NOTICE 'Atomic profile creation result: %', result;
END $$;

-- Test 2: Test profile consistency verification
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid(); -- Replace with actual user ID for testing
  result JSON;
BEGIN
  -- First create profiles
  PERFORM public.create_user_profiles_atomic(
    test_user_id,
    'test2@example.com',
    'Jane',
    'Smith',
    'MBA'
  );
  
  -- Then verify consistency
  SELECT public.verify_profile_consistency(test_user_id) INTO result;
  
  RAISE NOTICE 'Profile consistency check result: %', result;
END $$;

-- Test 3: Test error handling for invalid applying_to
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result JSON;
BEGIN
  SELECT public.create_user_profiles_atomic(
    test_user_id,
    'test3@example.com',
    'Bob',
    'Johnson',
    'InvalidProgram' -- This should fail
  ) INTO result;
  
  RAISE NOTICE 'Error handling test result: %', result;
END $$;

-- Test 4: Test duplicate user handling
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result1 JSON;
  result2 JSON;
BEGIN
  -- First creation should succeed
  SELECT public.create_user_profiles_atomic(
    test_user_id,
    'test4@example.com',
    'Alice',
    'Brown',
    'PhD'
  ) INTO result1;
  
  -- Second creation should fail
  SELECT public.create_user_profiles_atomic(
    test_user_id,
    'test4@example.com',
    'Alice',
    'Brown',
    'PhD'
  ) INTO result2;
  
  RAISE NOTICE 'First creation result: %', result1;
  RAISE NOTICE 'Second creation result: %', result2;
END $$;
