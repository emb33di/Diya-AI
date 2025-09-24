# Supabase Migration Best Practices

## Overview

This document outlines the correct approach for creating and managing Supabase database migrations to avoid conflicts, ensure proper sequencing, and maintain team collaboration compatibility.

## ❌ What NOT to Do

### Manual Timestamp Creation
```bash
# WRONG - Never manually create migration files with static timestamps
touch supabase/migrations/20250131000001_create_function.sql
touch supabase/migrations/20250131000002_add_table.sql
```

**Problems with this approach:**
- Creates timestamp conflicts with existing migrations
- Doesn't account for team members creating migrations simultaneously
- Can cause migration ordering issues
- Supabase CLI may reject or skip these migrations

### Bundling Multiple Changes
```sql
-- WRONG - Don't bundle multiple unrelated changes in one migration
-- Migration: 20250131000001_fix_everything.sql
CREATE TABLE users (...);
CREATE FUNCTION process_data(...);
ALTER TABLE profiles ADD COLUMN new_field TEXT;
CREATE INDEX idx_users_email ON users(email);
```

## ✅ Correct Approach

### 1. Always Use Supabase CLI
```bash
# CORRECT - Let Supabase CLI generate timestamps automatically
supabase migration new add_atomic_signup_function
supabase migration new create_user_profiles_table
supabase migration new add_applying_to_field
```

### 2. Descriptive Naming Convention
```bash
# Good naming examples:
supabase migration new add_user_profiles_table
supabase migration new create_atomic_signup_function
supabase migration new add_applying_to_field_to_profiles
supabase migration new fix_null_applying_to_values
supabase migration new add_profile_consistency_checks

# Bad naming examples:
supabase migration new create_table
supabase migration new fix_stuff
supabase migration new update
supabase migration new changes
```

**Naming Guidelines:**
- Use **snake_case**: `add_user_profiles_table`
- Be **descriptive**: `add_applying_to_field_to_profiles` not `add_field`
- Use **action verbs**: `add_`, `create_`, `update_`, `remove_`, `fix_`
- Be **specific**: `add_email_verification_to_users` not `add_verification`

### 3. Single-Purpose Migrations
```sql
-- CORRECT - One logical change per migration
-- Migration: add_applying_to_field_to_profiles.sql
ALTER TABLE public.profiles 
ADD COLUMN applying_to TEXT;

COMMENT ON COLUMN public.profiles.applying_to IS 'Type of program applying to';
```

### 4. Proper Migration Workflow

#### Step 1: Generate Migration
```bash
supabase migration new descriptive_migration_name
```

#### Step 2: Write SQL Content
```sql
-- Write focused, single-purpose SQL
-- Include comments explaining the change
-- Consider rollback implications
```

#### Step 3: Test Locally
```bash
# Reset local database and apply all migrations
supabase db reset

# Or apply just new migrations
supabase db push
```

#### Step 4: Apply to Remote
```bash
# Apply to remote database
supabase db push
```

## Migration Content Guidelines

### 1. SQL Best Practices
```sql
-- Include descriptive comments
-- Create atomic profile creation function
-- This function ensures data consistency between profiles and user_profiles tables

CREATE OR REPLACE FUNCTION public.create_user_profiles_atomic(
  p_user_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_applying_to TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
-- Function body
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_profiles_atomic TO authenticated;

-- Add documentation
COMMENT ON FUNCTION public.create_user_profiles_atomic IS 'Atomically creates/updates user profile data in both profiles and user_profiles tables.';
```

### 2. Error Handling
```sql
-- Include proper error handling in functions
BEGIN
  -- Migration logic
EXCEPTION
  WHEN OTHERS THEN
    -- Handle errors gracefully
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END;
```

### 3. Rollback Considerations
```sql
-- Document rollback steps in comments
-- To rollback this migration:
-- 1. DROP FUNCTION public.create_user_profiles_atomic;
-- 2. Remove any related triggers or policies
```

## Common Migration Patterns

### Adding Columns
```sql
-- Migration: add_field_to_table.sql
ALTER TABLE public.table_name 
ADD COLUMN new_field TEXT;

COMMENT ON COLUMN public.table_name.new_field IS 'Description of the field';
```

### Creating Functions
```sql
-- Migration: create_function_name.sql
CREATE OR REPLACE FUNCTION public.function_name(...)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
-- Function body
$$;

GRANT EXECUTE ON FUNCTION public.function_name TO authenticated;
COMMENT ON FUNCTION public.function_name IS 'Function description';
```

### Creating Tables
```sql
-- Migration: create_table_name.sql
CREATE TABLE public.table_name (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own records" 
ON public.table_name 
FOR SELECT 
USING (auth.uid() = user_id);
```

## Troubleshooting

### Migration Conflicts
If you encounter timestamp conflicts:
```bash
# Check current migration status
supabase migration list

# If conflicts exist, rename files to use CLI-generated timestamps
supabase migration new correct_migration_name
# Then copy content from conflicted file to new one
```

### Failed Migrations
```bash
# Check migration status
supabase migration list

# Debug specific migration
supabase db push --debug

# Reset and reapply if needed
supabase db reset
supabase db push
```

## Team Collaboration

### Before Creating Migrations
1. **Pull latest changes**: `git pull origin main`
2. **Check migration status**: `supabase migration list`
3. **Generate new migration**: `supabase migration new descriptive_name`

### After Creating Migrations
1. **Test locally**: `supabase db reset && supabase db push`
2. **Commit migration file**: `git add supabase/migrations/ && git commit`
3. **Push changes**: `git push origin main`
4. **Apply to remote**: `supabase db push`

## Summary

**Always remember:**
- ✅ Use `supabase migration new` for all new migrations
- ✅ Use descriptive, snake_case names
- ✅ One logical change per migration
- ✅ Test locally before applying remotely
- ✅ Include proper comments and documentation

**Never:**
- ❌ Manually create migration files with static timestamps
- ❌ Bundle multiple unrelated changes in one migration
- ❌ Skip local testing before remote deployment
- ❌ Use vague or generic migration names

Following these practices ensures smooth database evolution, proper team collaboration, and reliable deployment processes.
