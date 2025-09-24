# Atomic Signup System Implementation

## Overview

This implementation provides a robust, database-first approach to user signup that ensures data consistency between the `profiles` and `user_profiles` tables. The system eliminates the race conditions and data inconsistency issues that were present in the previous implementation.

## Key Features

✅ **Atomic Operations**: All profile data is created/updated in a single database transaction  
✅ **Data Consistency**: Guarantees that both `profiles` and `user_profiles` tables have matching `applying_to` values  
✅ **Error Handling**: Comprehensive error handling with proper rollback on failures  
✅ **Validation**: Server-side validation of all input parameters  
✅ **Cleanup Tools**: Utilities to identify and fix existing users with null `applying_to` values  

## Database Functions

### 1. `create_user_profiles_atomic()`

**Purpose**: Atomically creates/updates user profile data in both tables

**Parameters**:
- `p_user_id` (UUID): The user ID from auth.users
- `p_email` (TEXT): User's email address
- `p_first_name` (TEXT): User's first name
- `p_last_name` (TEXT): User's last name
- `p_applying_to` (TEXT): Program type (Undergraduate, MBA, LLM, PhD, Masters)

**Returns**: JSON object with success status and details

**Example**:
```sql
SELECT public.create_user_profiles_atomic(
  '123e4567-e89b-12d3-a456-426614174000',
  'john@example.com',
  'John',
  'Doe',
  'Undergraduate'
);
```

### 2. `verify_profile_consistency()`

**Purpose**: Verifies that profile data is consistent between tables

**Parameters**:
- `p_user_id` (UUID): The user ID to check

**Returns**: JSON object with consistency status and details

### 3. `find_users_with_null_applying_to()`

**Purpose**: Identifies users with null `applying_to` values

**Returns**: Table of users with null values and their details

### 4. `fix_null_applying_to_users()`

**Purpose**: Fixes users with null `applying_to` by setting a default value

**Parameters**:
- `default_applying_to` (TEXT): Default value to set (defaults to 'Undergraduate')

## Frontend Implementation

The `Auth.tsx` component now uses a two-step process:

1. **Create User**: Uses standard Supabase Auth signup
2. **Create Profiles**: Calls the atomic function to ensure data consistency

```typescript
// Step 1: Create user via Supabase Auth
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: redirectUrl,
    data: {
      full_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      applying_to: applyingTo,
    },
  },
});

// Step 2: Use atomic function to ensure profile consistency
const { data: signupResult, error: signupError } = await supabase.rpc('create_user_profiles_atomic', {
  p_user_id: authData.user.id,
  p_email: email,
  p_first_name: firstName,
  p_last_name: lastName,
  p_applying_to: applyingTo
});
```

## Migration Files

### 1. `20250131000001_create_atomic_signup_function.sql`
- Creates the main atomic profile creation function
- Creates profile consistency verification function
- Grants necessary permissions

### 2. `20250131000002_create_profile_cleanup_functions.sql`
- Creates utility functions to identify and fix existing data issues
- Provides tools for data cleanup and maintenance

### 3. `20250131000003_simplify_user_creation_trigger.sql`
- Simplifies the database trigger to avoid conflicts
- Removes problematic trigger logic that was causing null values

## Testing

### Test Script: `test_atomic_signup.sql`
Run this script in Supabase SQL editor to test the functions:

```sql
-- Test atomic profile creation
SELECT public.create_user_profiles_atomic(
  gen_random_uuid(),
  'test@example.com',
  'John',
  'Doe',
  'Undergraduate'
);

-- Test profile consistency verification
SELECT public.verify_profile_consistency('your-user-id-here');
```

## Data Cleanup

### Find Users with Issues
```sql
SELECT * FROM public.find_users_with_null_applying_to();
```

### Fix Users with Null Values
```sql
-- Set all null values to 'Undergraduate'
SELECT public.fix_null_applying_to_users('Undergraduate');

-- Or set to a different default
SELECT public.fix_null_applying_to_users('MBA');
```

### Get Users Needing Manual Review
```sql
SELECT * FROM public.get_users_needing_profile_completion();
```

## Benefits Over Previous Implementation

1. **No More Race Conditions**: Single atomic operation eliminates timing issues
2. **Guaranteed Consistency**: Both tables are always updated together
3. **Better Error Handling**: Comprehensive error handling with proper rollback
4. **Easier Debugging**: Clear error messages and verification functions
5. **Data Integrity**: Server-side validation prevents invalid data
6. **Maintenance Tools**: Built-in utilities for data cleanup and verification

## Deployment Steps

1. **Run Migrations**: Apply all three migration files in order
2. **Test Functions**: Run the test script to verify everything works
3. **Clean Existing Data**: Use cleanup functions to fix existing users
4. **Deploy Frontend**: The updated Auth.tsx will use the new system
5. **Monitor**: Use verification functions to ensure ongoing data consistency

## Rollback Plan

If issues arise, you can:
1. Revert the frontend to the old implementation
2. Use the cleanup functions to fix any data inconsistencies
3. The old trigger will still work for basic profile creation

This implementation provides a much more robust foundation for user signup and profile management.
