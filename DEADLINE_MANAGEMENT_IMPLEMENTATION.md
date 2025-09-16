# Deadline Management Implementation

## Overview
This document outlines the implementation of program-type-aware deadline management for the Diya AI application.

## Changes Made

### A. Deadline Data Separation

#### 1. Sync-Deadlines Function (`supabase/functions/sync-deadlines/index.ts`)
- **Separated deadline datasets by program type:**
  - `UNDERGRADUATE_DEADLINES`: Contains undergraduate school deadlines
  - `MBA_DEADLINES`: Contains MBA school deadlines
- **Added program type detection:**
  - Fetches user's `applying_to` field from `user_profiles` table
  - Maps profile values to program types (Undergraduate Colleges → Undergraduate, MBA → MBA, etc.)
  - Uses appropriate deadline dataset based on user's program type
- **Added helper function:**
  - `getDeadlineDataByProgramType()`: Returns correct deadline dataset based on program type

#### 2. Auto-Sync-Deadlines Function (`supabase/functions/auto-sync-deadlines/index.ts`)
- **Separated regular decision deadline datasets:**
  - `UNDERGRADUATE_REGULAR_DECISION_DEADLINES`: Undergraduate regular decision deadlines
  - `MBA_REGULAR_DECISION_DEADLINES`: MBA regular decision deadlines
- **Added program type detection:** Same logic as sync-deadlines function
- **Added helper function:**
  - `getRegularDecisionDeadlineDataByProgramType()`: Returns correct regular decision dataset

### B. Deadline Service Updates

#### DeadlineService (`src/services/deadlineService.ts`)
- **Added program type filtering:**
  - Imports `getUserProgramType()` utility function
  - Filters school recommendations based on user's program type
  - MBA users see only MBA schools (containing "Business School", "School of Management", etc.)
  - Undergraduate users see only undergraduate schools (excluding business school indicators)
- **Enhanced logging:** Added program type information to console logs

## Program Type Mapping

The system maps user profile `applying_to` values to program types:

| Profile Value | Program Type |
|---------------|--------------|
| "Undergraduate Colleges" | Undergraduate |
| "MBA" | MBA |
| "LLM" | LLM |
| "PhD" | PhD |
| "Masters" | Masters |

## MBA Deadline Data Requirements

**IMPORTANT:** The MBA deadline datasets currently contain placeholder data. You need to provide the actual MBA deadlines for the following schools:

### Top MBA Programs (Currently with placeholder dates):
- Harvard Business School
- Stanford Graduate School of Business
- Wharton School (University of Pennsylvania)
- Kellogg School of Management (Northwestern)
- Booth School of Business (University of Chicago)
- MIT Sloan School of Management
- Columbia Business School
- Yale School of Management
- Tuck School of Business (Dartmouth)
- Fuqua School of Business (Duke)
- Ross School of Business (Michigan)
- Darden School of Business (Virginia)
- Johnson Graduate School of Management (Cornell)
- Haas School of Business (Berkeley)
- Anderson School of Management (UCLA)
- McCombs School of Business (Texas)
- Kenan-Flagler Business School (UNC)
- Goizueta Business School (Emory)
- McDonough School of Business (Georgetown)
- Tepper School of Business (Carnegie Mellon)

### Additional MBA Programs:
- NYU Stern School of Business
- USC Marshall School of Business
- Indiana University Kelley School of Business
- University of Washington Foster School of Business
- University of Wisconsin School of Business
- University of Minnesota Carlson School of Management
- University of Illinois Gies College of Business
- University of Texas at Austin McCombs School of Business

## Backward Compatibility

- If a user's program type cannot be determined, the system defaults to undergraduate deadlines
- Existing users without program type information will continue to see undergraduate deadlines
- The system gracefully handles missing profile data

## Testing Recommendations

1. **Test with MBA users:** Verify that only MBA schools appear in deadlines
2. **Test with undergraduate users:** Verify that only undergraduate schools appear
3. **Test with users without program type:** Verify fallback to undergraduate deadlines
4. **Test deadline syncing:** Verify that correct deadline datasets are used for each program type

## Next Steps

1. **Provide actual MBA deadlines:** Replace placeholder dates with real MBA application deadlines
2. **Add more MBA schools:** Expand the MBA deadline dataset as needed
3. **Consider other program types:** Add deadline datasets for LLM, PhD, and Masters programs if needed
4. **Database optimization:** Consider storing deadline data in the database instead of hardcoded arrays for easier maintenance
