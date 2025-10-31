# Founder Portal Implementation Plan

## Overview
Build a simple dashboard for founder to review escalated essays with the same essay editor experience.

## Components to Build

### 1. **FounderGuard Component** (Similar to AuthenticationGuard)
**Location:** `src/components/FounderGuard.tsx`

**Purpose:** Protect founder routes - checks if user has `is_founder = true`

**Functionality:**
- Check user profile for `is_founder` flag
- Show loading state
- Redirect to dashboard if not founder
- Allow access if founder

---

### 2. **Escalated Essays Service**
**Location:** `src/services/escalatedEssaysService.ts`

**Purpose:** Fetch and update escalated essays from database

**Methods:**
```typescript
- getEscalatedEssays(): Promise<EscalatedEssay[]>
  - Fetches all escalated essays with student info (name, email)
  - Joins with user_profiles to get student details
  
- getEscalatedEssayById(escalationId: string): Promise<EscalatedEssay | null>
  - Fetches single escalation with full snapshot data
  
- updateEscalatedEssayStatus(
    escalationId: string, 
    status: 'in_review' | 'reviewed' | 'sent_back'
  ): Promise<void>
  
- saveFounderFeedback(
    escalationId: string,
    founderFeedback: string,
    founderComments: Annotation[],
    founderEditedContent?: SemanticDocument
  ): Promise<void>
```

**Type Definitions:**
```typescript
interface EscalatedEssay {
  id: string;
  essay_id: string;
  user_id: string;
  essay_title: string;
  essay_content: SemanticDocument; // Parsed from JSONB
  essay_prompt: string;
  word_count: number;
  status: 'pending' | 'in_review' | 'reviewed' | 'sent_back';
  escalated_at: string;
  reviewed_at?: string;
  sent_back_at?: string;
  founder_feedback?: string;
  founder_comments?: Annotation[];
  founder_edited_content?: SemanticDocument;
  ai_comments_snapshot?: Annotation[];
  
  // Student info (from join)
  student_name: string;
  student_email: string;
}
```

---

### 3. **Founder Dashboard Page**
**Location:** `src/pages/FounderPortal.tsx`

**Purpose:** List view of all escalated essays

**Features:**
- Simple table/card list showing:
  - Student Name
  - Student Email  
  - Essay Title
  - Status badge (pending, in_review, sent_back)
  - Escalation Date
  - Word Count
- Click row/card to navigate to review page
- Filter by status (optional - tabs or dropdown)
- Sort by date (newest first)

**UI Structure:**
```
┌─────────────────────────────────────────┐
│  Founder Portal - Escalated Essays     │
├─────────────────────────────────────────┤
│ [All] [Pending] [In Review] [Sent Back]│ ← Status tabs
├─────────────────────────────────────────┤
│ Name      Email              Title  ... │
│ John Doe  john@...  Harvard Essay  ... │
│ Jane Smith jane@...  Stanford Essay... │
└─────────────────────────────────────────┘
```

**Key Code:**
- Use `escalatedEssaysService.getEscalatedEssays()`
- Map over results to display table/cards
- Link to `/founder-portal/:escalationId` on click

---

### 4. **Founder Essay Review Page**
**Location:** `src/pages/FounderEssayReview.tsx`

**Purpose:** Review and comment on escalated essay using existing editor

**Features:**
- Load escalated essay snapshot
- Display student info (name, email) at top
- Use existing `SemanticEssayEditor` or `SemanticEditor` component
- Show AI comments that were there at escalation (read-only indicator)
- Allow founder to add new comments (author: 'user' or 'founder')
- Allow founder to edit essay content directly
- "Save Feedback" button to save founder comments/f edits
- "Mark as Reviewed" / "Send Back to Student" buttons
- Overall feedback textarea (for `founder_feedback` field)

**UI Structure:**
```
┌─────────────────────────────────────────┐
│ ← Back to List    Student: John Doe     │
│                   Email: john@email.com │
├─────────────────────────────────────────┤
│                                         │
│   [Semantic Essay Editor Component]     │
│   - Shows essay content                 │
│   - Shows AI comments (from snapshot)   │
│   - Founder can add comments           │
│   - Founder can edit content            │
│                                         │
├─────────────────────────────────────────┤
│ Overall Feedback:                       │
│ [Textarea for founder_feedback]         │
│                                         │
│ [Save Feedback] [Mark Reviewed] [Send Back]
└─────────────────────────────────────────┘
```

**Implementation Notes:**
- Load `essay_content` JSONB and parse to `SemanticDocument`
- Load `ai_comments_snapshot` and display as annotations (read-only)
- Founder comments stored in state, saved to `founder_comments` JSONB
- Edited content saved to `founder_edited_content` JSONB
- Status updates when clicking "Send Back"

**Key Challenges:**
- Need to create a temporary semantic document from snapshot (not linked to original essay_id)
- Founder comments need different author tag ('founder' vs 'user')
- Need to prevent saving back to original essay (only save to escalated_essays table)

---

### 5. **Route Setup**
**Location:** `src/App.tsx`

**Add Routes:**
```tsx
// After other protected routes
<Route 
  path="/founder-portal" 
  element={<FounderGuard><FounderPortal /></FounderGuard>} 
/>
<Route 
  path="/founder-portal/:escalationId" 
  element={<FounderGuard><FounderEssayReview /></FounderGuard>} 
/>
```

---

### 6. **Navigation (Optional)**
**Location:** `src/components/Header.tsx`

**Add Founder Portal Link:**
- Only show if user is founder
- Add to navigation menu
- Or create separate founder navigation section

---

## Implementation Steps

### Phase 1: Foundation
1. ✅ Create `FounderGuard` component
2. ✅ Create `escalatedEssaysService.ts` with types
3. ✅ Add routes to App.tsx

### Phase 2: Dashboard
4. ✅ Create `FounderPortal.tsx` page
5. ✅ Fetch and display escalated essays list
6. ✅ Add navigation/links

### Phase 3: Review Page
7. ✅ Create `FounderEssayReview.tsx` page
8. ✅ Load escalated essay snapshot
9. ✅ Integrate SemanticEditor component
10. ✅ Handle founder comments and edits
11. ✅ Save feedback functionality

### Phase 4: Polish
12. ⏳ Status filtering/sorting
13. ⏳ Loading states
14. ⏳ Error handling
15. ⏳ Notifications when sending back to student

---

## Technical Considerations

### Loading Snapshot Data
- `essay_content` is JSONB - needs parsing to `SemanticDocument`
- `ai_comments_snapshot` is JSONB - needs parsing to `Annotation[]`
- Need to create temporary document structure for editor

### Founder Comments vs Student Comments
- Founder comments saved to `founder_comments` JSONB field
- AI comments from snapshot are read-only (historical snapshot)
- Need to distinguish visually (maybe badge "Founder" vs "AI")

### Editing Content
- If founder edits, save to `founder_edited_content`
- Original content remains in `essay_content` (snapshot)
- When sending back, student sees both original + edited version

### SemanticEditor Integration
- Need to pass snapshot data as `initialContent`
- Disable saving to original essay (custom `onSave` handler)
- Track founder annotations separately

---

## Database Queries Needed

### Fetch Escalated Essays with Student Info
```sql
SELECT 
  ee.*,
  up.first_name || ' ' || up.last_name AS student_name,
  up.email_address AS student_email
FROM escalated_essays ee
JOIN user_profiles up ON ee.user_id = up.user_id
ORDER BY ee.escalated_at DESC;
```

### Update Founder Feedback
```sql
UPDATE escalated_essays
SET 
  founder_feedback = $1,
  founder_comments = $2::jsonb,
  founder_edited_content = $3::jsonb,
  status = $4,
  reviewed_at = NOW(),
  sent_back_at = CASE WHEN $4 = 'sent_back' THEN NOW() ELSE sent_back_at END,
  updated_at = NOW()
WHERE id = $5;
```

---

## Files to Create/Modify

### New Files:
- `src/components/FounderGuard.tsx`
- `src/services/escalatedEssaysService.ts`
- `src/pages/FounderPortal.tsx`
- `src/pages/FounderEssayReview.tsx`

### Modified Files:
- `src/App.tsx` (add routes)
- `src/components/Header.tsx` (optional - add link)

---

## Questions to Resolve

1. **Founder Comment Author Type:** Should we add 'founder' as a new author type, or use 'user'?
2. **Editor Saving:** Should founder edits auto-save or require explicit "Save" button?
3. **Student Notification:** How should student be notified when founder sends feedback back?
4. **Viewing Edits:** Should student see original + edited side-by-side, or just edited version?

