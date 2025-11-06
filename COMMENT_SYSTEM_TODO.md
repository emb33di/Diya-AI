# Comment System To-Do List

## Overview
This document tracks tasks related to the comment system, including deletion functionality, user-facing comment viewing, proper categorization of founder vs. Clarity comments, and ensuring comments are preserved when document edits are made.

---

## Tasks

### 1. ⏳ Check Why Comment Deletion is Not Working

**Status:** In Progress  
**Priority:** High

**Current State:**
- Comment deletion functionality exists in multiple components:
  - `FounderSemanticEditor.tsx` (lines 1753-1786) - `deleteAnnotation` function
  - `SemanticEssayEditor.tsx` (lines 344-384) - `handleAnnotationDelete` function
  - `SemanticEditor.tsx` (lines 1632-1665) - `deleteAnnotation` function
- Deletion handlers call `semanticDocumentService.persistAnnotationDeletion(annotationId)`
- UI has delete buttons in `CommentSidebar.tsx` and `FounderCommentSidebar.tsx`

**What Needs Investigation:**
- Verify that `semanticDocumentService.persistAnnotationDeletion()` is correctly implemented
- Check if annotations are being properly removed from the database
- Test deletion flow in both founder and user views
- Check for any error handling issues or silent failures
- Verify optimistic UI updates are working correctly

**Files to Review:**
- `src/components/essay/FounderSemanticEditor.tsx` (lines 1753-1786)
- `src/components/essay/SemanticEssayEditor.tsx` (lines 344-384)
- `src/components/essay/SemanticEditor.tsx` (lines 1632-1665)
- `src/services/semanticDocumentService.ts` - Check `persistAnnotationDeletion` method
- `src/components/essay/CommentSidebar.tsx` (lines 664-677)
- `src/components/essay/FounderCommentSidebar.tsx` (lines 602-605)

**Action Items:**
- [ ] Check browser console for errors when deleting comments
- [ ] Verify database queries/updates in `persistAnnotationDeletion`
- [ ] Test deletion in founder portal view
- [ ] Test deletion in user-facing editor view
- [ ] Check if annotations are being filtered correctly after deletion
- [ ] Verify that deleted comments don't reappear on page reload
- [ ] Check RLS policies if using Supabase (permissions may be blocking deletion)
- [ ] Add debug logging to track deletion flow

---

### 2. ⏳ Create Comment Viewing Page for User Side

**Status:** Not Started  
**Priority:** High

**Current State:**
- Founder can add comments on essays via `FounderSemanticEditor`
- Founder comments are saved to `founder_comments` table
- Founder comments have `author: 'mihir'` or similar founder identifier
- **Missing:** User-facing UI to view founder comments

**What Needs to be Built:**
- Create a comment viewing page/component for users
- Display founder comments alongside AI-generated comments
- Show comments in a read-only format
- Allow users to navigate between their essay and comments
- Display comment metadata (timestamp, type, etc.)
- Properly distinguish founder comments from AI comments visually

**UI Requirements:**
- Read-only comment sidebar or dedicated comments page
- Show comment type badges (Founder vs. AI)
- Display comments grouped by category if applicable
- Show timestamps for when comments were added
- Link comments to specific text selections in the essay
- Responsive design for mobile and desktop

**Database Access:**
- Fetch founder comments from `founder_comments` table
- Join with `escalated_essays` table to get comments for user's essays
- Filter by `essay_id` and user's ownership

**Files to Create/Modify:**
- [ ] Create `src/pages/UserCommentsView.tsx` or similar component
- [ ] Create `src/components/essay/UserCommentSidebar.tsx` (if separate from existing sidebar)
- [ ] Modify `src/pages/Essays.tsx` to include link/button to view comments
- [ ] Add service method in `src/services/escalatedEssaysService.ts` to fetch user's founder comments
- [ ] Update routing to include comments view page

**Implementation Approach:**
```typescript
// Service method to fetch user's founder comments
async getUserFounderComments(essayId: string): Promise<FounderComment[]> {
  // Verify user owns the essay
  // Fetch founder_comments for this essay
  // Return formatted comments
}

// Component structure
<UserCommentsView>
  <EssayPreview readOnly={true} />
  <CommentList comments={founderComments} />
</UserCommentsView>
```

**Action Items:**
- [ ] Design UI/UX for comment viewing page
- [ ] Create service method to fetch user founder comments
- [ ] Build comment viewing component
- [ ] Add navigation/routing to comments page
- [ ] Integrate with existing essay editor/viewer
- [ ] Test comment display with various comment types
- [ ] Ensure proper permissions/RLS policies for user access

---

### 3. ⏳ Ensure Comments Don't Show Up as Clarity Comments but as Founder Comments

**Status:** Not Started  
**Priority:** High

**Current State:**
- Comments are categorized using `determineCommentCategory()` function
- Founder comments should have `author: 'mihir'` or `author: 'founder'`
- Clarity comments are AI-generated with `metadata.agentType === 'clarity'`
- Comment categorization logic exists in:
  - `CommentSidebar.tsx` (lines 75-114)
  - `FounderCommentSidebar.tsx` (lines 89-132)

**What Needs to be Fixed:**
- Ensure founder comments are properly identified by author field
- Prevent founder comments from being categorized as "Clarity" comments
- Update categorization logic to check `annotation.author` before checking `agentType`
- Add visual distinction in UI (badges, icons) to show "Founder" vs. "AI/Clarity"
- Ensure founder comments appear in appropriate category or separate "Founder" category

**Current Categorization Logic:**
The `determineCommentCategory()` function currently:
1. Checks for explicit `commentCategory` in metadata
2. Infers from `agentType` (if `clarity` → returns `'clarity'`)
3. Falls back to annotation type

**Required Changes:**
- Check `annotation.author` first - if `'mihir'` or `'founder'`, categorize as founder comment
- Add a new category or badge system for founder comments
- Update UI components to display founder comments distinctly from Clarity comments

**Files to Modify:**
- [ ] `src/components/essay/CommentSidebar.tsx` - Update `determineCommentCategory()` (lines 75-114)
- [ ] `src/components/essay/FounderCommentSidebar.tsx` - Update `determineCommentCategory()` (lines 89-132)
- [ ] `src/types/semanticDocument.ts` - Potentially add `'founder'` to comment categories
- [ ] UI components that display comment badges/labels

**Implementation Approach:**
```typescript
const determineCommentCategory = (annotation: Annotation): CommentCategory => {
  // FIRST: Check if this is a founder comment
  if (annotation.author === 'mihir' || annotation.author === 'founder') {
    // Return a founder-specific category or handle separately
    return 'founder' as CommentCategory; // Or create separate category
  }
  
  // THEN: Check explicit category
  if (annotation.metadata?.commentCategory) {
    return annotation.metadata.commentCategory;
  }
  
  // THEN: Infer from agent type (existing logic)
  // ...
};
```

**Visual Distinction:**
- Add "Founder" badge/icon for founder comments
- Use different color scheme for founder vs. AI comments
- Group founder comments separately or mark them clearly

**Action Items:**
- [ ] Review how founder comments are currently being created/saved
- [ ] Verify `author` field is set correctly when founder creates comments
- [ ] Update `determineCommentCategory()` to prioritize author field
- [ ] Add founder comment category or separate handling
- [ ] Update UI to display founder badge/icon
- [ ] Test that founder comments don't appear as Clarity comments
- [ ] Test in both founder and user views
- [ ] Ensure proper categorization when displaying comments

---

### 4. ⏳ Check How Editing and Commenting Interact - Ensure Comments Don't Get Overwritten

**Status:** Not Started  
**Priority:** Critical

**Current State:**
- Document editing and commenting happen in the same components (`FounderSemanticEditor`, `SemanticEditor`)
- Block content updates use `{ ...block, content, lastUserEdit: new Date() }` which should preserve annotations
- Documents are saved with entire `blocks` array to `semantic_documents` table
- Comments/annotations are stored both in document blocks and separately in `semantic_annotations` table
- Auto-save functionality may create race conditions between edit saves and comment saves

**Potential Issues to Investigate:**
- When editing block content, annotations should be preserved via spread operator, but need to verify
- When saving document after edits, entire `blocks` array is saved - verify annotations are included
- Race conditions between auto-saving edits and auto-saving comments
- Applying comment edits via `apply-comment-edit` function updates blocks - verify it preserves other annotations
- Document loading/reloading - ensure annotations from `semantic_annotations` table are merged back into blocks
- If blocks are replaced entirely instead of updated, annotations could be lost

**What Needs to be Verified:**
- Confirm `updateBlockContent` preserves annotations when updating block text
- Verify `saveDocument` method preserves annotations when saving blocks array
- Test concurrent editing and commenting - ensure comments aren't lost
- Check that applying a comment edit doesn't remove other comments on the same block
- Verify document reload merges annotations from database correctly
- Test edge cases: deleting blocks with comments, splitting blocks, merging blocks
- Check auto-save timing - ensure comments are saved even if document was recently edited

**Files to Review:**
- `src/components/essay/FounderSemanticEditor.tsx` - `updateBlockContent` (lines 650-670)
- `src/components/essay/SemanticEditor.tsx` - `updateBlockContent` (lines 528-548)
- `src/services/semanticDocumentService.ts` - `saveDocument` method (lines 381-445)
- `src/services/semanticDocumentService.ts` - `updateBlock` method (lines 479-508)
- `src/pages/FounderEssayReview.tsx` - `handleDocumentChange` and auto-save logic (lines 220-260)
- `supabase/functions/apply-comment-edit/index.ts` - Block update logic (lines 170-175)
- Document loading/merging logic when fetching from database

**Key Code Patterns to Verify:**

1. **Block Content Update Pattern** (should preserve annotations):
```typescript
blocks: prev.document.blocks.map(block => 
  block.id === blockId 
    ? { ...block, content, lastUserEdit: new Date() }  // ✅ Should preserve annotations
    : block
)
```

2. **Document Save Pattern** (should include annotations):
```typescript
// In saveDocument - verify blocks include annotations
blocks: document.blocks  // Each block should have annotations array preserved
```

3. **Comment Edit Application Pattern** (should preserve other annotations):
```typescript
// In apply-comment-edit - verify it preserves existing annotations
const updatedBlocks = document.blocks.map((block: any) => 
  block.id === targetBlock.id 
    ? { ...block, content: updatedContent }  // ✅ Should preserve annotations
    : block
);
```

**Test Scenarios:**
1. Add a comment to a block, then edit the block text - comment should remain
2. Edit block text, then add a comment - both should persist
3. Apply a comment edit suggestion - other comments on same block should remain
4. Auto-save during editing - comments should not be lost
5. Reload page after editing - comments should be restored from database
6. Delete a block that has comments - verify behavior is correct
7. Split a block with comments - verify comments are handled appropriately

**Action Items:**
- [ ] Review `updateBlockContent` implementation - verify annotations are preserved
- [ ] Review `saveDocument` implementation - verify entire block structure (including annotations) is saved
- [ ] Test editing a block with existing comments - verify comments persist
- [ ] Test adding comments after making edits - verify comments are saved correctly
- [ ] Review `apply-comment-edit` function - verify it preserves other annotations
- [ ] Check document loading logic - verify annotations from `semantic_annotations` are merged into blocks
- [ ] Test auto-save race conditions - ensure edits and comments don't overwrite each other
- [ ] Add defensive checks in save logic to explicitly preserve annotations
- [ ] Test edge cases: block deletion, splitting, merging with comments
- [ ] Add logging/monitoring to detect if annotations are being lost
- [ ] Consider adding validation to warn if annotations are missing after save

**Potential Solutions if Issues Found:**
1. **Explicit Annotation Preservation**: Modify save logic to explicitly merge annotations:
```typescript
// Before saving, ensure annotations are preserved
const blocksWithAnnotations = document.blocks.map(block => ({
  ...block,
  annotations: block.annotations || []  // Ensure annotations array exists
}));
```

2. **Separate Save Operations**: Separate comment saves from document content saves to avoid conflicts

3. **Version Control**: Track document versions to recover if annotations are lost

4. **Validation Checks**: Add validation before save to ensure annotations aren't missing

5. **Merge Strategy**: When loading document, explicitly merge annotations from `semantic_annotations` table into blocks

---

## Implementation Priority Order

1. **Task 4** - Ensure comments don't get overwritten (critical data integrity issue)
2. **Task 3** - Fix comment categorization (affects user experience immediately)
3. **Task 1** - Fix deletion functionality (core feature that's broken)
4. **Task 2** - Create comment viewing page (new feature enhancement)

---

## Related Files

### Comment System Files
- `src/components/essay/CommentSidebar.tsx` - User-facing comment sidebar
- `src/components/essay/FounderCommentSidebar.tsx` - Founder-facing comment sidebar
- `src/components/essay/FounderSemanticEditor.tsx` - Founder editor with comment functionality
- `src/components/essay/SemanticEssayEditor.tsx` - User-facing essay editor
- `src/components/essay/SemanticEditor.tsx` - Base semantic editor
- `src/services/semanticDocumentService.ts` - Document and annotation persistence
- `src/services/escalatedEssaysService.ts` - Escalation and founder comment services

### Database Tables
- `founder_comments` - Stores founder comments
- `semantic_documents` - Stores document structure and annotations
- `escalated_essays` - Links essays to founder reviews

---

## Testing Checklist

- [ ] Comment deletion works in founder portal
- [ ] Comment deletion works in user editor
- [ ] Deleted comments don't reappear after page reload
- [ ] Founder comments display correctly for users
- [ ] Founder comments show "Founder" badge/identifier
- [ ] Founder comments are NOT categorized as "Clarity"
- [ ] AI/Clarity comments still display correctly
- [ ] Comment viewing page is accessible from user dashboard
- [ ] Comments are linked to correct text selections
- [ ] Visual distinction between founder and AI comments is clear
- [ ] Mobile view displays comments correctly
- [ ] Error handling works when deletion fails
- [ ] **Comments persist when editing block text**
- [ ] **Comments persist when applying comment edit suggestions**
- [ ] **Comments are preserved after document save/reload**
- [ ] **Editing and commenting concurrently doesn't cause data loss**
- [ ] **Auto-save doesn't overwrite comments during editing**
- [ ] **Block splitting/merging preserves comments correctly**

---

## Notes

- Founder comments currently use `author: 'mihir'` - may need to standardize to `'founder'` for consistency
- Consider adding a separate "Founder Comments" category instead of trying to categorize them with AI comments
- Comment deletion may be failing due to RLS policies in Supabase - verify permissions
- May need to update comment metadata structure to explicitly mark founder comments
- **Critical**: Comments are stored in both document blocks AND `semantic_annotations` table - need to ensure both stay in sync
- **Critical**: The spread operator `{ ...block, content }` should preserve annotations, but should verify this is working correctly
- **Critical**: Auto-save debouncing may create race conditions - consider implementing save queue or transaction handling
- Consider adding annotation count validation before/after save operations to detect data loss

