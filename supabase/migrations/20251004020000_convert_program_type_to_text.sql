-- Convert any remaining enum-typed school_program_type columns to TEXT with lowercase CHECK constraints
-- Applies to: essay_prompts, essay_prompt_selections, essays
-- Safe to run repeatedly; uses IF EXISTS/IF NOT EXISTS guards

BEGIN;

-- Helper: normalize and constrain a column if it exists
-- essay_prompts.school_program_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'essay_prompts'
      AND column_name = 'school_program_type'
  ) THEN
    -- Convert type to TEXT (works even if already TEXT)
    ALTER TABLE public.essay_prompts
      ALTER COLUMN school_program_type TYPE TEXT USING school_program_type::text;

    -- Lowercase existing values
    UPDATE public.essay_prompts
      SET school_program_type = LOWER(school_program_type)
      WHERE school_program_type IS NOT NULL;

    -- Add CHECK constraint for allowed values
    ALTER TABLE public.essay_prompts
      DROP CONSTRAINT IF EXISTS essay_prompts_program_type_check;
    ALTER TABLE public.essay_prompts
      ADD CONSTRAINT essay_prompts_program_type_check
        CHECK (school_program_type IN ('undergraduate','mba','llm','phd','masters'));
  END IF;
END $$;

-- essay_prompt_selections.school_program_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'essay_prompt_selections'
      AND column_name = 'school_program_type'
  ) THEN
    ALTER TABLE public.essay_prompt_selections
      ALTER COLUMN school_program_type TYPE TEXT USING school_program_type::text;

    UPDATE public.essay_prompt_selections
      SET school_program_type = LOWER(school_program_type)
      WHERE school_program_type IS NOT NULL;

    ALTER TABLE public.essay_prompt_selections
      DROP CONSTRAINT IF EXISTS essay_prompt_selections_program_type_check;
    ALTER TABLE public.essay_prompt_selections
      ADD CONSTRAINT essay_prompt_selections_program_type_check
        CHECK (school_program_type IN ('undergraduate','mba','llm','phd','masters'));
  END IF;
END $$;

-- essays.school_program_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'essays'
      AND column_name = 'school_program_type'
  ) THEN
    ALTER TABLE public.essays
      ALTER COLUMN school_program_type TYPE TEXT USING school_program_type::text;

    UPDATE public.essays
      SET school_program_type = LOWER(school_program_type)
      WHERE school_program_type IS NOT NULL;

    ALTER TABLE public.essays
      DROP CONSTRAINT IF EXISTS essays_program_type_check;
    ALTER TABLE public.essays
      ADD CONSTRAINT essays_program_type_check
        CHECK (school_program_type IN ('undergraduate','mba','llm','phd','masters'));
  END IF;
END $$;

-- Attempt to drop the enum type if no longer in use anywhere
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'school_program_type') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE udt_name = 'school_program_type'
    ) THEN
      DROP TYPE IF EXISTS school_program_type;
    END IF;
  END IF;
END $$;

COMMIT;

-- Documentation
COMMENT ON COLUMN public.essay_prompts.school_program_type IS 'Program type (text, lowercase): undergraduate | mba | llm | phd | masters';
COMMENT ON COLUMN public.essay_prompt_selections.school_program_type IS 'Program type (text, lowercase): undergraduate | mba | llm | phd | masters';
COMMENT ON COLUMN public.essays.school_program_type IS 'Program type (text, lowercase): undergraduate | mba | llm | phd | masters';


