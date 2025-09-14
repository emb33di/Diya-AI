-- Add comment categorization columns to essay_comments table
ALTER TABLE essay_comments 
ADD COLUMN comment_category TEXT CHECK (comment_category IN ('overall', 'inline')),
ADD COLUMN comment_subcategory TEXT CHECK (comment_subcategory IN ('opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific'));

-- Add indexes for better query performance
CREATE INDEX idx_essay_comments_category ON essay_comments(comment_category);
CREATE INDEX idx_essay_comments_subcategory ON essay_comments(comment_subcategory);
CREATE INDEX idx_essay_comments_category_subcategory ON essay_comments(comment_category, comment_subcategory);
