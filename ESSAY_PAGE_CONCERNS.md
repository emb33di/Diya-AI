# Essay Page Concerns

**Created:** 2024  
**Status:** Documented for future reference (page currently working)  
**Purpose:** Reference document for potential issues and fixes if problems arise

---

## Overview

This document outlines 5 potential issues identified in the Essays page (`src/pages/Essays.tsx`) that could cause problems, especially on slow networks or with specific user scenarios. All issues have been validated in the codebase but are not currently causing problems.

---

## Issue 1: Race Condition with Essay Validation

### Problem
- `selectedSchool` and `selectedNewEssayId` are initialized from localStorage (lines 127-130, 143-146)
- Validation runs at lines 377-383 after essays are fetched
- If `newEssays` is still empty/loading when validation runs, a valid essay ID could be cleared prematurely

### Scenario
1. User opens Essays page
2. `selectedSchool = "Harvard"` (from localStorage)
3. `selectedNewEssayId = "essay-123"` (from localStorage)
4. Validation runs while `newEssays` is still `[]`
5. Valid essay ID gets cleared unnecessarily

### Impact
User loses their selection unnecessarily, requiring manual reselection.

### Recommended Fix
- Add an `isLoadingEssays` state flag
- Only validate persisted essay ID AFTER essays have finished loading
- Gate the validation check: `if (!isLoadingEssays && persistedEssayId && !essays.find(...))`

### Risk Level
**Low** - Adds safety check without changing core logic

### Location
- Lines 143-146: Initialization from localStorage
- Lines 361-401: Essay fetching useEffect
- Lines 377-383: Validation logic

---

## Issue 2: Loading State UX Regression

### Problem
- `SemanticEssayEditor` only renders when: `selectedNewEssayId && newEssays.find(e => e.id === selectedNewEssayId)`
- If `selectedNewEssayId` is set but `newEssays` is still loading (empty array), editor doesn't render
- No loading state is shown, causing blank/confusing UI

### Scenario
1. User has valid essay selected (`selectedNewEssayId` is set)
2. Page loads, `selectedNewEssayId` is set
3. `newEssays` is still loading (async fetch)
4. Editor doesn't render → blank screen
5. Once `newEssays` loads, editor appears suddenly

### Impact
Confusing UX; user doesn't know if something is loading or broken.

### Recommended Fix
- Show loading state when `selectedNewEssayId` exists but essay not found in `newEssays`
- Check if essays are loading: `if (selectedNewEssayId && isLoadingEssays) { show loading }`
- Only render `SemanticEssayEditor` when essay is confirmed loaded

### Risk Level
**Low-Medium** - Adds conditional rendering, need to handle edge case where essay truly doesn't exist after loading

### Location
- Lines 1470, 1757: Rendering condition for `SemanticEssayEditor`

---

## Issue 3: Too Aggressive Error Clearing

### Problem
- Any fetch error in `fetchNewEssays` (line 384) clears essay selection unconditionally (line 392)
- Temporary network errors cause valid selections to be lost

### Scenario
1. Network hiccup during essay fetch
2. Valid essay ID gets cleared
3. User has to manually re-select their essay
4. Frustrating if they had unsaved work open

### Impact
Unnecessary disruption, user frustration.

### Recommended Fix
- Don't clear on temporary errors; only clear if:
  - School changed (essays belong to different school)
  - Essays loaded successfully but essay ID not in list
  - Persistent error after retries
- Consider: Retry logic, keeping selection with error message, only clearing if school selection changed

### Risk Level
**Medium** - Need to distinguish between transient vs permanent errors, risk of getting stuck in bad state

### Location
- Lines 384-394: Error handling in `fetchNewEssays`

---

## Issue 4: Potential State Inconsistency

### Problem
- Multiple `useEffect` hooks can run in different orders:
  - Line 288: Fetches schools, validates/clears `selectedSchool` (runs once)
  - Line 361: Fetches essays when `selectedSchool` changes
  - Line 428: Fetches prompts when `selectedSchool` changes
- If timing is off, essay might be cleared before essays finish loading

### Scenario
1. Initial load sets `selectedSchool` from localStorage
2. First useEffect clears invalid school → clears essay selection
3. Second useEffect (depends on `selectedSchool`) tries to load essays
4. If timing is off, essay might be cleared before essays finish loading

### Impact
Unpredictable behavior, especially on slow connections.

### Recommended Fix
- Order effects so school validation runs first, then fetch essays
- Use ref/flag to track if initial load complete before validating essays
- Consider consolidating related effects or using `useMemo`/`useCallback` to stabilize dependencies

### Risk Level
**Medium** - Requires careful sequencing, might be over-engineering if effects already mostly correct

### Location
- Lines 288-358: Initial data fetch
- Lines 361-401: Essay fetching
- Lines 428-529: Prompt fetching

---

## Issue 5: Console.log for Debugging Left In

### Problem
- Line 381: `console.log('[ESSAYS] Clearing invalid persisted essay ID:', persistedEssayId);`
- Debug log should be removed or made conditional (dev mode only)

### Impact
Minor - console clutter in production, not a functional issue.

### Recommended Fix
- Remove the console.log entirely, OR
- Gate behind dev flag: `if (import.meta.env.DEV) { console.log(...) }`

### Risk Level
**None** - Simple cleanup

### Location
- Line 381: Debug console.log

---

## Priority Recommendations

### Safe, High Impact (Do First if Issues Arise)
1. **Issue 5**: Remove console.log - Zero risk, simple cleanup
2. **Issue 2**: Add loading state - Low risk, high UX impact

### Moderate Risk (Test Thoroughly)
3. **Issue 1**: Add loading check before validation - Low risk, prevents premature clearing
4. **Issue 3**: Smarter error clearing - Medium risk, needs careful distinction between error types

### Higher Complexity (Consider After Others)
5. **Issue 4**: Effect ordering - Medium risk, might require refactoring

---

## Testing Considerations

If implementing fixes, test:
- Slow network connections
- Invalid localStorage data
- Network errors during fetch
- School changes while essays are loading
- Multiple rapid school selections

---

## Related Files

- `src/pages/Essays.tsx` - Main essay page component
- `src/components/essay/SemanticEssayEditor.tsx` - Essay editor component
- `src/services/essayService.ts` - Essay data service

---

## Notes

- Page is currently working, so these are preventative measures
- Fixes should only be implemented if issues actually occur
- Each fix should be tested individually before combining

