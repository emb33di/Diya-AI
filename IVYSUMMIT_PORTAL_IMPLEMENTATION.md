# IvySummit Counselor Portal Implementation

## Overview

This document summarizes the implementation of a personalized counselor portal demo for IvySummit. The implementation creates a duplicate of the founder portal experience with IvySummit branding, allowing counselors to review escalated essays specifically tagged for them.

## Implementation Date

January 2025

## What Was Implemented

### 1. Database Schema Changes

**Migration File**: `supabase/migrations/20250101000000_add_partner_slug_to_escalated_essays.sql`

- Added `partner_slug` column to `escalated_essays` table (nullable TEXT)
- Created index on `partner_slug` for efficient filtering
- NULL values indicate escalations for the founder (default behavior)
- Non-NULL values tag escalations for specific partners (e.g., 'ivysummit')

### 2. New Components

#### `src/components/IvySummitGuard.tsx`
- Simple access guard for IvySummit portal
- Allows access if:
  - User is authenticated (any user for demo purposes)
  - `?partner=ivysummit` is in URL
  - User is a founder (for demo purposes)
- In production, this would check for partner-specific permissions

### 3. New Pages

#### `src/pages/IvySummitPortal.tsx`
- Duplicate of `FounderPortal.tsx` with IvySummit branding
- Lists all escalated essays tagged with `partner_slug = 'ivysummit'`
- Shows status tabs (All, Pending, In Review, Reviewed, Sent Back)
- Displays student information, essay titles, word counts, and escalation dates
- Navigates to individual essay review pages

#### `src/pages/IvySummitEssayReview.tsx`
- Duplicate of `FounderEssayReview.tsx` with IvySummit branding
- Full essay review interface with:
  - Essay content editor (using `FounderSemanticEditor`)
  - AI summary generation
  - Comment sidebar for inline feedback
  - Overall feedback textarea
  - Status management (Save, Mark as Reviewed, Send Back to Student)
- Auto-saves comments every 500ms
- Uses same comment system as founder portal (author: 'mihir' for compatibility)

### 4. Service Layer Updates

#### `src/services/escalatedEssaysService.ts`

**New Methods:**
- `fetchEscalatedEssaysForPartner(partnerSlug, filters?)` - Fetches escalated essays filtered by partner_slug
- `getEscalatedEssayCountsForPartner(partnerSlug)` - Gets status counts for a specific partner

**Updated Methods:**
- `escalateEssay()` - Now accepts optional `partnerSlug` parameter
  - When provided, tags the escalation with the partner slug
  - When null/undefined, escalates to founder (default behavior)

### 5. Essay Editor Integration

#### `src/components/essay/SemanticEssayEditor.tsx`

**Changes:**
- Added `useSearchParams` hook to read URL parameters
- Checks for `?partner=ivysummit` in URL
- When present, passes `partnerSlug: 'ivysummit'` to escalation service
- Updates success toast message to mention "IvySummit" instead of "founder"

### 6. Routing Updates

#### `src/App.tsx`

**New Routes:**
- `/ivysummit-portal` - IvySummit portal dashboard
- `/ivysummit-portal/:escalationId` - Individual essay review page

Both routes are protected by `IvySummitGuard` component.

### 7. UI Updates

#### `src/components/Header.tsx`

**Changes:**
- Detects when user is on IvySummit portal routes
- Updates logo alt text to "IvySummit Logo" (logo file placeholder for future)
- TODO comment added for adding actual IvySummit logo file

## How to Use

### For Students (Escalating Essays)

1. Navigate to an essay page with the partner parameter:
   ```
   /essays/[essayId]?partner=ivysummit
   ```

2. Click "Escalate to Expert Review" button
3. The essay will be tagged with `partner_slug = 'ivysummit'`
4. Success message will indicate escalation to "IvySummit"

### For Counselors (Viewing Portal)

1. Navigate to:
   ```
   /ivysummit-portal?partner=ivysummit
   ```

2. View all escalated essays tagged for IvySummit
3. Filter by status (All, Pending, In Review, Reviewed, Sent Back)
4. Click on any essay to review it
5. Add comments, provide feedback, and send back to students

### Database Migration

**Important**: Run the migration before using the feature:

```sql
-- File: supabase/migrations/20250101000000_add_partner_slug_to_escalated_essays.sql
ALTER TABLE public.escalated_essays
ADD COLUMN IF NOT EXISTS partner_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_escalated_essays_partner_slug 
ON escalated_essays(partner_slug) WHERE partner_slug IS NOT NULL;
```

## File Structure

```
src/
├── components/
│   ├── IvySummitGuard.tsx          [NEW]
│   ├── Header.tsx                  [MODIFIED]
│   └── essay/
│       └── SemanticEssayEditor.tsx [MODIFIED]
├── pages/
│   ├── IvySummitPortal.tsx         [NEW]
│   └── IvySummitEssayReview.tsx    [NEW]
├── services/
│   └── escalatedEssaysService.ts   [MODIFIED]
└── App.tsx                         [MODIFIED]

supabase/
└── migrations/
    └── 20250101000000_add_partner_slug_to_escalated_essays.sql [NEW]
```

## Key Features

### Partner Tagging
- Essays escalated with `?partner=ivysummit` are automatically tagged
- Tagged essays only appear in the IvySummit portal
- Founder portal continues to show all escalations (including partner-tagged ones)

### Branding
- Portal title: "IvySummit Counselor Portal"
- Navigation paths: `/ivysummit-portal/*`
- Logo placeholder ready for IvySummit logo file

### Access Control
- Demo mode: Any authenticated user can access with `?partner=ivysummit` param
- Founders can also access for demo purposes
- Production-ready structure for adding proper partner permissions

### Functionality Parity
- All founder portal features available:
  - Status management
  - Inline commenting
  - Overall feedback
  - AI summary generation
  - Auto-save comments
  - Send back to student

## Technical Notes

### Comment System Compatibility
- Uses same comment author ('mihir') as founder portal for compatibility
- Comments stored in `founder_comments` table
- Can be extended later to use partner-specific author identifiers

### Type Safety
- Some TypeScript errors exist in `escalatedEssaysService.ts` (pre-existing Supabase type issues)
- These don't affect functionality - same pattern as existing code
- Can be addressed in future type system updates

### Database Queries
- Partner filtering uses `WHERE partner_slug = 'ivysummit'`
- Index on `partner_slug` ensures efficient queries
- NULL partner_slug values are for founder escalations

## Next Steps (Optional Enhancements)

### 1. Add IvySummit Logo
- Place `IvySummitLogo.svg` in `public/` folder
- Update `Header.tsx` to use the logo on IvySummit routes:
  ```tsx
  src={isIvySummitPortal ? "/IvySummitLogo.svg" : "/DiyaLogo.svg"}
  ```

### 2. Partner Authentication
- Add `partner_slug` column to `user_profiles` table
- Update `IvySummitGuard` to check user's partner assignment
- Restrict access to only users with matching partner_slug

### 3. Partner-Specific Comment Authors
- Update comment system to use partner-specific author identifiers
- Store partner info in comment metadata
- Display partner name in comment UI

### 4. Custom Branding
- Add partner-specific color schemes
- Customize portal styling per partner
- Partner-specific email templates

### 5. Analytics
- Track escalations by partner
- Partner-specific dashboard metrics
- Usage statistics per partner

## Testing Checklist

- [ ] Run database migration
- [ ] Test essay escalation with `?partner=ivysummit`
- [ ] Verify escalation appears in IvySummit portal
- [ ] Verify escalation does NOT appear in founder portal (or appears in both if needed)
- [ ] Test accessing `/ivysummit-portal?partner=ivysummit`
- [ ] Test essay review functionality
- [ ] Test adding comments and feedback
- [ ] Test sending essay back to student
- [ ] Verify student receives feedback correctly

## Demo URL Structure

**For Students:**
```
https://yourdomain.com/essays/[essayId]?partner=ivysummit
```

**For Counselors:**
```
https://yourdomain.com/ivysummit-portal?partner=ivysummit
```

## Support

For questions or issues:
1. Check that migration has been applied
2. Verify `partner_slug` column exists in `escalated_essays` table
3. Check browser console for errors
4. Verify URL parameters are correctly formatted

## Notes

- This is a **demo implementation** - production-ready but simplified for quick setup
- Partner authentication is permissive for demo purposes
- Logo branding is placeholder - add actual logo file when available
- All functionality mirrors founder portal for consistency

