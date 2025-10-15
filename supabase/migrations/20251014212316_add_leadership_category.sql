-- Add 'leadership' category to resume_activities table
ALTER TABLE resume_activities 
DROP CONSTRAINT IF EXISTS resume_activities_category_check;

ALTER TABLE resume_activities 
ADD CONSTRAINT resume_activities_category_check 
CHECK (category IN ('academic', 'experience', 'projects', 'extracurricular', 'volunteering', 'skills', 'interests', 'languages', 'leadership'));
