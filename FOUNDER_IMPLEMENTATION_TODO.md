# Founder Implementation To-Do List

## Overview
This document tracks the remaining implementation tasks for the Founder Portal feature, focusing on ensuring complete functionality for essay review, editing, and user-facing feedback display.

---

## Tasks

### 1. ✅ Ensure Founder Edits are Saved and Reflected to Users

**Status:** Partially Complete  
**Priority:** High

**Current State:**
- Founder edits are saved to `founder_edited_content` JSONB field in `escalated_essays` table
- The `handleSaveFeedback` function in `FounderEssayReview.tsx` saves `founder_edited_content` when founder makes edits
- Edits are preserved when founder clicks "Save Feedback" or "Send Back"

**What Needs Verification:**
- ✅ Confirm edits are properly saved to `founder_edited_content` field
- ⏳ Verify that when founder sends essay back, edited content is accessible to user
- ⏳ Test that edits persist if founder saves multiple times before sending back

**Implementation Notes:**
- The `FounderEssayReview.tsx` component uses `handleSaveFeedback()` which calls:
  ```typescript
  await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
    founder_feedback: founderFeedback,
    founder_comments: comments,
    founder_edited_content: document,  // ✅ Edits are saved here
    status: essay?.status || 'in_review'
  });
  ```

**Files to Review:**
- `src/pages/FounderEssayReview.tsx` (lines 244-283)
- `src/services/escalatedEssaysService.ts` (lines 281-390)

**Action Items:**
- [ ] Add integration test to verify edits are saved correctly
- [ ] Verify edits are loaded correctly when founder revisits an essay
- [ ] Ensure edits are included when essay is sent back to user

---

### 2. ⏳ Verify User Access to Founder Edits and Comments (Read-Only)

**Status:** Needs Implementation  
**Priority:** High

**Current State:**
- Users can escalate essays to founder
- Founder can edit and comment on essays
- **Missing:** User-facing UI to view founder feedback and edited content

**What Needs to be Built:**
- Read-only view component for users to see founder feedback
- Display `founder_edited_content` if available (otherwise show original)
- Show `founder_comments` with proper annotation display
- Display `founder_feedback` (overall feedback textarea content)
- Indicate when feedback is available (notification/badge)
- Side-by-side or toggle view showing original vs. edited version (optional)

**UI Requirements:**
- Read-only semantic editor (use `readOnly={true}` prop)
- Founder comments displayed similar to AI comments but with "Founder" badge
- Overall feedback section at top or bottom of essay
- Clear visual distinction between original and edited content
- Accessible from essay editor or separate "Feedback" tab/view

**Access Pattern:**
1. User escalates essay → Status becomes `sent_back` when founder completes review
2. User opens essay → System checks if `status = 'sent_back'` and `founder_feedback IS NOT NULL`
3. Display feedback view with read-only editor showing founder edits/comments

**Database Fields to Display:**
- `founder_edited_content` (JSONB) → Display in read-only editor
- `founder_comments` (JSONB) → Display as annotations
- `founder_feedback` (TEXT) → Display as overall feedback section
- `sent_back_at` (TIMESTAMP) → Show when feedback was sent

**Files to Create/Modify:**
- [ ] Create `src/components/essay/FounderFeedbackView.tsx` (read-only editor component)
- [ ] Modify `src/pages/Essays.tsx` or `src/components/essay/SemanticEssayEditor.tsx` to show feedback view
- [ ] Add service method to fetch escalated essay by `essay_id` for user view
- [ ] Update `src/services/escalatedEssaysService.ts` with user-facing fetch method

**Implementation Approach:**
```typescript
// In SemanticEssayEditor or Essays component
const showFounderFeedback = async (essayId: string) => {
  const escalation = await EscalatedEssaysService.getEscalationByEssayId(essayId);
  if (escalation?.status === 'sent_back' && escalation.founder_feedback) {
    // Show feedback view
    setFounderFeedback(escalation);
    setViewMode('feedback'); // Switch to feedback view
  }
};

// Use FounderSemanticEditor with readOnly={true}
<FounderSemanticEditor
  readOnly={true}
  initialContent={founderFeedback.founder_edited_content}
  // ... other props
/>
```

**Action Items:**
- [ ] Design UI mockup for feedback view
- [ ] Implement `getEscalationByEssayId()` service method
- [ ] Create `FounderFeedbackView` component
- [ ] Add navigation/button to access feedback from essay editor
- [ ] Test read-only display of edits and comments
- [ ] Add visual indicators (badges, icons) for founder feedback

---

### 3. ⏳ Add Manual Comment Capability for Founder

**Status:** Needs Implementation  
**Priority:** Medium

**Current State:**
- Founder can edit essay content in `FounderSemanticEditor`
- `FounderCommentSidebar` exists for viewing comments
- **Missing:** Direct UI for founder to add manual comments before sending back

**What Needs to be Built:**
- Button or UI control in `FounderEssayReview` to add manual comment
- Comment input dialog/modal or inline form
- Save comment to `founder_comments` JSONB array
- Display newly added comments in sidebar immediately
- Allow founder to add comments on specific blocks or as overall comments

**Current Code Structure:**
- `FounderSemanticEditor` has comment-related state but may need UI controls
- `FounderCommentSidebar` displays comments but doesn't have add functionality for founder

**Implementation Approach:**
1. Add "Add Comment" button in `FounderEssayReview.tsx`
2. Create comment input modal/form
3. Use existing `addAnnotation` or similar function from editor
4. Ensure comments are tagged with `author: 'mihir'` or `author: 'founder'`
5. Save comments immediately or batch with "Save Feedback"

**Files to Modify:**
- `src/pages/FounderEssayReview.tsx` - Add comment UI controls
- `src/components/essay/FounderSemanticEditor.tsx` - Ensure comment creation works
- `src/components/essay/FounderCommentSidebar.tsx` - Potentially add "Add Comment" button here

**Action Items:**
- [ ] Add "Add Comment" button/UI control
- [ ] Create comment input form/modal
- [ ] Wire up comment creation to save to `founder_comments`
- [ ] Test comment creation and persistence
- [ ] Ensure comments appear in sidebar immediately after creation

---

### 4. ⏳ Add AI Agent for First-Pass Essay Summarization

**Status:** Not Started  
**Priority:** Medium

**What Needs to be Built:**
- AI agent/service that generates a summary when essay is escalated
- Summary should include:
  - Essay overview/theme
  - Key strengths
  - Major areas for improvement
  - Writing quality assessment
  - Word count and prompt alignment
- Save summary to database (new field or separate table)
- Display summary in founder review page for quick context

**Database Schema Consideration:**
- Option 1: Add `ai_summary` JSONB field to `escalated_essays` table
- Option 2: Create separate `escalation_summaries` table (if summary needs versioning/history)

**Implementation Approach:**
1. Create trigger or service method that runs when `status = 'pending'`
2. Call AI service (OpenAI/Anthropic) with essay content
3. Generate structured summary
4. Save summary to `ai_summary` field
5. Display summary card/panel in `FounderEssayReview.tsx`

**AI Prompt Template:**
```
Analyze this essay that has been escalated for founder review:
- Title: {essay_title}
- Prompt: {essay_prompt}
- Word Limit: {word_limit}
- Content: {essay_content}

Provide a concise summary covering:
1. Essay theme and main message
2. Key strengths (2-3 points)
3. Major improvement areas (2-3 points)
4. Writing quality (clarity, flow, tone)
5. Alignment with prompt requirements
```

**Files to Create/Modify:**
- [ ] Create `src/services/escalationSummaryService.ts` or add to existing AI service
- [ ] Add migration to add `ai_summary` JSONB column to `escalated_essays`
- [ ] Modify `EscalatedEssaysService.escalateEssay()` to trigger summary generation
- [ ] Add summary display component in `FounderEssayReview.tsx`

**Action Items:**
- [ ] Design AI prompt for summarization
- [ ] Create summary service/function
- [ ] Add database field for summary
- [ ] Integrate summary generation into escalation flow
- [ ] Create UI component to display summary
- [ ] Test summary generation with various essays

---

### 5. ⏳ Add UI Component for Remaining Escalations Count

**Status:** Partially Complete  
**Priority:** High

**Current State:**
- `user_escalation_tracking` table exists with `escalation_count` and `max_escalations` fields
- Database schema supports tracking (max default is 2)
- **Missing:** UI component to display remaining escalations to user

**What Needs to be Built:**
- Service method to fetch user's escalation count and remaining count
- UI component (badge/card) showing "X of 2 escalations remaining"
- Display in essay editor or profile/dashboard area
- Update count when user escalates an essay
- Show appropriate messaging when limit is reached

**Display Location Options:**
1. In `SemanticEssayEditor.tsx` near "Escalate Essay" button
2. In essay list view (`Essays.tsx`)
3. In user profile/settings area
4. As tooltip/popover when hovering over "Escalate" button

**Service Method Needed:**
```typescript
// In EscalatedEssaysService or new service
async getUserEscalationStatus(): Promise<{
  used: number;
  remaining: number;
  max: number;
  canEscalate: boolean;
}>
```

**UI Component Example:**
```tsx
<EscalationCountBadge>
  {remaining} of {max} escalations remaining
</EscalationCountBadge>
```

**Files to Create/Modify:**
- [ ] Create `src/components/EscalationCountBadge.tsx` or similar
- [ ] Add method to `src/services/escalatedEssaysService.ts` to fetch user escalation status
- [ ] Modify `SemanticEssayEditor.tsx` to display count
- [ ] Update `EscalatedEssaysService.escalateEssay()` to increment count
- [ ] Add validation to prevent escalation when limit reached

**Action Items:**
- [ ] Create service method to fetch escalation status
- [ ] Build UI component for displaying count
- [ ] Integrate into essay editor
- [ ] Add validation to block escalation when limit reached
- [ ] Test count updates correctly on escalation
- [ ] Add user messaging when limit is reached

---

### 6. ⏳ Enforce 2 Escalation Limit for Pro Users

**Status:** Partially Complete  
**Priority:** High

**Current State:**
- Database schema has `user_escalation_tracking` with `max_escalations = 2`
- Table structure supports per-user tracking
- **Missing:** Enforcement logic in escalation service
- **Missing:** Logic to determine if user is "Pro" user

**What Needs to be Built:**
- Check user subscription/tier before allowing escalation
- Verify escalation count before creating escalation record
- Increment count when escalation is successful
- Reset count logic (on subscription renewal or manual reset)
- Error handling and user messaging when limit is reached

**Enforcement Points:**
1. Before escalation: Check `escalation_count < max_escalations`
2. On successful escalation: Increment `escalation_count`
3. On subscription renewal: Reset `escalation_count` to 0 (future)

**Service Method Updates:**
```typescript
// In EscalatedEssaysService.escalateEssay()
async escalateEssay(...) {
  // 1. Check user is Pro user (verify subscription)
  const isProUser = await checkUserSubscription(user.id);
  if (!isProUser) {
    throw new Error('Escalation is only available for Pro users');
  }
  
  // 2. Get or create escalation tracking record
  const tracking = await getOrCreateEscalationTracking(user.id);
  
  // 3. Check limit
  if (tracking.escalation_count >= tracking.max_escalations) {
    throw new Error(`You have reached your escalation limit of ${tracking.max_escalations}.`);
  }
  
  // 4. Create escalation
  const escalation = await createEscalationRecord(...);
  
  // 5. Increment count
  await incrementEscalationCount(user.id);
  
  return escalation;
}
```

**Subscription Check:**
- Need to verify how Pro users are identified (subscription table, user_profiles field, etc.)
- May need to join with subscription/payment tables

**Files to Modify:**
- [ ] `src/services/escalatedEssaysService.ts` - Add limit checking and increment logic
- [ ] Create helper method to get/update escalation tracking
- [ ] Add subscription verification logic (if separate service exists)
- [ ] Update error messages in UI

**Action Items:**
- [ ] Identify how Pro users are determined (subscription system)
- [ ] Implement escalation limit check in `escalateEssay()` method
- [ ] Add count increment on successful escalation
- [ ] Add proper error handling and user-friendly messages
- [ ] Test limit enforcement with test accounts
- [ ] Document reset logic for subscription renewals (future)

---

## Implementation Priority Order

1. **Task 6** - Enforce escalation limit (security/business logic)
2. **Task 2** - User access to founder feedback (core feature)
3. **Task 5** - UI for escalation count (user experience)
4. **Task 1** - Verify edits are reflected (testing/verification)
5. **Task 3** - Manual comment capability (feature enhancement)
6. **Task 4** - AI summarization (nice-to-have feature)

---

## Database Schema Reference

### `escalated_essays` Table
- `id` - UUID primary key
- `essay_id` - Reference to original essay
- `user_id` - User who escalated
- `essay_content` - JSONB snapshot of essay at escalation
- `founder_edited_content` - JSONB edited version by founder
- `founder_comments` - JSONB array of founder comments
- `founder_feedback` - TEXT overall feedback
- `status` - 'pending' | 'in_review' | 'reviewed' | 'sent_back'
- `sent_back_at` - Timestamp when feedback sent to user

### `user_escalation_tracking` Table
- `id` - UUID primary key
- `user_id` - Reference to user
- `escalation_count` - Current count (default 0)
- `max_escalations` - Maximum allowed (default 2)
- `subscription_started_at` - For future cycle-based tracking
- `last_reset_at` - When count was last reset

---

## Testing Checklist

- [ ] Founder edits are saved correctly
- [ ] Founder edits are reflected when essay is sent back
- [ ] Users can view founder feedback in read-only mode
- [ ] Founder comments display correctly for users
- [ ] Manual comment creation works for founder
- [ ] AI summary is generated on escalation
- [ ] Escalation count displays correctly
- [ ] Escalation limit (2) is enforced
- [ ] Error messages are user-friendly
- [ ] Edge cases (no edits, no comments, etc.) are handled

---

## Notes

- Founder comments currently use `author: 'mihir'` in the code - consider standardizing to `'founder'`
- Consider adding notifications when founder sends feedback back to user
- May want to add versioning/history for founder edits if multiple saves occur
- AI summarization could be async/job-based if it takes time to generate

---

## Related Files

### Key Implementation Files
- `src/pages/FounderEssayReview.tsx` - Founder review interface
- `src/pages/FounderPortal.tsx` - Founder dashboard
- `src/components/essay/FounderSemanticEditor.tsx` - Editor for founder
- `src/components/essay/FounderCommentSidebar.tsx` - Comment display
- `src/services/escalatedEssaysService.ts` - Service layer
- `src/pages/Essays.tsx` - User essay management
- `src/components/essay/SemanticEssayEditor.tsx` - User-facing editor

### Database Migrations
- `supabase/migrations/20251031131256_create_escalated_essays_table.sql`
- `supabase/migrations/20251031131258_create_user_escalation_tracking.sql`

