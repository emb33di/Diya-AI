-- Add partner_slug column to escalated_essays table
-- This allows tagging escalations for specific partners (e.g., 'ivysummit')
-- NULL means escalation is for the founder

ALTER TABLE public.escalated_essays
ADD COLUMN IF NOT EXISTS partner_slug TEXT;

-- Create index for filtering by partner
CREATE INDEX IF NOT EXISTS idx_escalated_essays_partner_slug ON escalated_essays(partner_slug) WHERE partner_slug IS NOT NULL;

-- Add comment
COMMENT ON COLUMN escalated_essays.partner_slug IS 'Partner identifier for escalations (e.g., "ivysummit"). NULL means escalation is for founder.';

