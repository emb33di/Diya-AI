-- Create school_archive table to store removed schools
CREATE TABLE public.school_archive (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,
    school_type TEXT,
    category TEXT NOT NULL CHECK (category IN ('reach', 'target', 'safety')),
    acceptance_rate TEXT,
    school_ranking TEXT,
    first_round_deadline TEXT,
    early_action_deadline TEXT,
    early_decision_1_deadline TEXT,
    early_decision_2_deadline TEXT,
    regular_decision_deadline TEXT,
    notes TEXT,
    student_thesis TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_school_archive_student_id ON public.school_archive(student_id);
CREATE INDEX idx_school_archive_archived_at ON public.school_archive(archived_at);

-- Enable RLS
ALTER TABLE public.school_archive ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own archived schools" ON public.school_archive
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Users can insert their own archived schools" ON public.school_archive
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own archived schools" ON public.school_archive
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Users can delete their own archived schools" ON public.school_archive
    FOR DELETE USING (auth.uid() = student_id);

-- Add comment
COMMENT ON TABLE public.school_archive IS 'Stores archived/removed schools that can be restored';
