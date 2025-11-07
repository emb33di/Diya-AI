# Guest Essay Migration Implementation - Agent Prompt

## 🎯 Objective

Implement a system that saves anonymous users' preview essays and comments to a temporary `guest_essays` table, then migrates them to the user's account when they sign up. This ensures users see the **exact same comments** they previewed, not regenerated ones.

---

## 📋 Problem Statement

Currently, the Ivy Readiness Report generates AI comments for anonymous users but doesn't save them. When users sign up, they lose their preview data. If we regenerate comments after signup, they'll be different from what the user saw, creating a poor user experience.

**Solution:** Save preview data temporarily, then migrate it to the user's account upon signup.

---

## ✅ Requirements

### 1. Database Schema - Create `guest_essays` Table

Create a new migration file: `supabase/migrations/[timestamp]_create_guest_essays_table.sql`

**Table Structure:**
```sql
CREATE TABLE IF NOT EXISTS public.guest_essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Essay data (same structure as essays table)
  title TEXT NOT NULL,
  school_name TEXT,
  prompt_text TEXT NOT NULL,
  word_limit TEXT,
  essay_content TEXT NOT NULL, -- Full essay text
  
  -- Semantic document data (stored as JSONB)
  semantic_document JSONB NOT NULL, -- Full SemanticDocument object with blocks
  semantic_annotations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of Annotation objects
  
  -- Grading scores
  grading_scores JSONB, -- { bigPicture: number, tone: number, clarity: number }
  
  -- Session tracking
  session_id TEXT, -- Optional: browser session ID for cleanup
  user_agent TEXT,
  ip_address TEXT,
  
  -- Expiration (auto-cleanup old entries)
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_essays_session_id ON guest_essays(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_essays_expires_at ON guest_essays(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_essays_created_at ON guest_essays(created_at);

-- Auto-cleanup function (optional, can be handled by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_guest_essays()
RETURNS void AS $$
BEGIN
  DELETE FROM guest_essays WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

**Important:** This table should NOT have RLS enabled (or have a permissive policy) since it's for anonymous users.

---

### 2. Update IvyReadinessReport Component

**File:** `src/components/IvyReadinessReport.tsx`

**Changes Required:**

#### A. Save to guest_essays after analysis
After comments are generated and scores are extracted:
1. Save the complete essay data to `guest_essays` table
2. Store the `guest_essay_id` in component state
3. Show a "Sign Up to Save" button prominently

#### B. Add "Discard Essay" button
- Add a button to discard the preview essay
- On click: Delete from `guest_essays` table and reset component state
- Show confirmation dialog before deleting

#### C. Update "Sign Up" flow
- When user clicks "Sign Up" button, pass `guest_essay_id` to signup flow
- After successful signup, trigger migration

#### D. Cleanup on dialog close
- If user closes dialog without signing up, optionally delete the guest essay
- Or keep it for 7 days (expiration) in case user returns

**Implementation Details:**

```typescript
// After analysis completes, save to guest_essays
const saveGuestEssay = async () => {
  if (!document || !gradingScores) return;
  
  const guestEssayData = {
    title: document.title,
    school_name: document.metadata.schoolName,
    prompt_text: document.metadata.prompt || '',
    word_limit: document.metadata.wordLimit?.toString() || '650',
    essay_content: document.blocks.map(b => b.content).join('\n\n'),
    semantic_document: document, // Full SemanticDocument
    semantic_annotations: annotations, // All annotations with comments
    grading_scores: gradingScores,
    session_id: getSessionId(), // Generate or get from localStorage
    user_agent: navigator.userAgent,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  };
  
  const { data, error } = await supabase
    .from('guest_essays')
    .insert(guestEssayData)
    .select()
    .single();
    
  if (error) {
    console.error('Failed to save guest essay:', error);
    return null;
  }
  
  return data.id; // Return guest_essay_id
};
```

---

### 3. Create Migration Service

**File:** `src/services/guestEssayMigrationService.ts`

Create a new service to handle migration:

```typescript
export class GuestEssayMigrationService {
  /**
   * Migrate guest essay to user's account after signup
   */
  static async migrateGuestEssayToUser(
    guestEssayId: string,
    userId: string
  ): Promise<{
    success: boolean;
    essayId?: string;
    semanticDocumentId?: string;
    error?: string;
  }> {
    // 1. Fetch guest essay
    // 2. Create essay in essays table
    // 3. Create semantic document
    // 4. Create semantic annotations
    // 5. Delete guest essay
    // 6. Return IDs
  }
  
  /**
   * Delete guest essay (when user discards)
   */
  static async deleteGuestEssay(guestEssayId: string): Promise<boolean> {
    // Delete from guest_essays table
  }
  
  /**
   * Get guest essay by ID (for preview before signup)
   */
  static async getGuestEssay(guestEssayId: string): Promise<any> {
    // Fetch guest essay data
  }
}
```

**Migration Logic:**

1. **Create Essay:**
   ```typescript
   const essay = await supabase.from('essays').insert({
     user_id: userId,
     title: guestEssay.title,
     school_name: guestEssay.school_name,
     prompt_text: guestEssay.prompt_text,
     word_limit: guestEssay.word_limit,
     content: {
       blocks: guestEssay.semantic_document.blocks,
       metadata: guestEssay.semantic_document.metadata
     },
     word_count: calculateWordCount(guestEssay.essay_content),
     character_count: guestEssay.essay_content.length,
     status: 'draft'
   });
   ```

2. **Create Semantic Document:**
   ```typescript
   const semanticDoc = await supabase.from('semantic_documents').insert({
     id: guestEssay.semantic_document.id, // Preserve original ID
     title: guestEssay.semantic_document.title,
     blocks: guestEssay.semantic_document.blocks,
     metadata: {
       ...guestEssay.semantic_document.metadata,
       essayId: essay.id, // Link to new essay
       author: userId
     }
   });
   ```

3. **Create Semantic Annotations:**
   ```typescript
   const annotations = guestEssay.semantic_annotations.map(annotation => ({
     id: annotation.id, // Preserve original IDs
     document_id: semanticDoc.id,
     block_id: annotation.targetBlockId,
     type: annotation.type,
     author: annotation.author,
     content: annotation.content,
     target_text: annotation.targetText,
     resolved: annotation.resolved || false,
     metadata: annotation.metadata,
     created_at: annotation.createdAt,
     updated_at: annotation.updatedAt
   }));
   
   await supabase.from('semantic_annotations').insert(annotations);
   ```

4. **Delete Guest Essay:**
   ```typescript
   await supabase.from('guest_essays').delete().eq('id', guestEssayId);
   ```

---

### 4. Update Signup Flow

**File:** `src/pages/Auth.tsx` (or wherever signup happens)

**Changes:**
1. Check for `guest_essay_id` in URL params or localStorage
2. After successful signup, call `GuestEssayMigrationService.migrateGuestEssayToUser()`
3. Redirect user to the new essay page
4. Show success message: "Your preview essay has been saved!"

**Implementation:**
```typescript
// After signup success
const guestEssayId = searchParams.get('guest_essay_id') || 
                     localStorage.getItem('pending_guest_essay_id');

if (guestEssayId && user) {
  const result = await GuestEssayMigrationService.migrateGuestEssayToUser(
    guestEssayId,
    user.id
  );
  
  if (result.success) {
    // Redirect to essay
    navigate(`/essays?essayId=${result.essayId}`);
    toast({
      title: "Essay Saved!",
      description: "Your preview essay and comments have been saved to your account."
    });
  }
}
```

---

### 5. Update IvyReadinessReport UI

**Add UI Elements:**

1. **"Sign Up to Save" Button** (prominent, after analysis)
   - Navigate to signup with `guest_essay_id` in URL
   - Store `guest_essay_id` in localStorage as backup

2. **"Discard Essay" Button** (secondary, in header or footer)
   - Show confirmation dialog
   - Delete from `guest_essays` table
   - Reset component state

3. **Status Indicator**
   - Show "Essay saved temporarily" badge
   - Display expiration time: "Expires in 7 days"

---

### 6. Edge Cases to Handle

1. **User closes dialog without action:**
   - Keep guest essay for 7 days (expiration)
   - If user returns and signs up, migrate it
   - Auto-cleanup after expiration

2. **User signs up on different device:**
   - Use session_id or email-based matching (optional enhancement)
   - For now, rely on URL params/localStorage

3. **Migration fails:**
   - Log error
   - Keep guest essay for retry
   - Show error message to user

4. **User already has account:**
   - If logged in, directly migrate (no signup needed)
   - Show "Save to My Essays" button instead of "Sign Up"

5. **Multiple guest essays:**
   - Support multiple previews per session
   - Migrate all on signup (or let user choose)

---

### 7. Testing Requirements

1. **Test Guest Essay Creation:**
   - Submit essay in Ivy Readiness Report
   - Verify it's saved to `guest_essays` table
   - Check all fields are populated correctly

2. **Test Migration:**
   - Create guest essay
   - Sign up new user
   - Verify essay appears in user's essays list
   - Verify semantic document is created
   - Verify all annotations are preserved
   - Verify guest essay is deleted

3. **Test Discard:**
   - Create guest essay
   - Click "Discard Essay"
   - Verify deletion from database
   - Verify component state resets

4. **Test Expiration:**
   - Create guest essay with past expiration
   - Verify cleanup function works
   - Test auto-cleanup cron job (if implemented)

5. **Test Error Handling:**
   - Test migration with invalid guest_essay_id
   - Test migration when user already exists
   - Test network failures during migration

---

### 8. Files to Create/Modify

**New Files:**
- `supabase/migrations/[timestamp]_create_guest_essays_table.sql`
- `src/services/guestEssayMigrationService.ts`

**Modified Files:**
- `src/components/IvyReadinessReport.tsx`
- `src/pages/Auth.tsx` (or signup component)
- `src/integrations/supabase/types.ts` (add guest_essays type)

---

### 9. Implementation Order

1. ✅ Create database migration for `guest_essays` table
2. ✅ Create `GuestEssayMigrationService`
3. ✅ Update `IvyReadinessReport` to save guest essays
4. ✅ Add "Discard Essay" functionality
5. ✅ Update signup flow to handle migration
6. ✅ Add UI elements (buttons, status indicators)
7. ✅ Test end-to-end flow
8. ✅ Handle edge cases
9. ✅ Add cleanup/expiration logic

---

### 10. Key Considerations

- **Preserve Comment IDs:** Keep original annotation IDs when migrating to maintain consistency
- **Preserve Timestamps:** Keep original created_at timestamps for comments
- **Error Recovery:** If migration fails, keep guest essay for retry
- **Privacy:** Don't store sensitive data in guest_essays (no PII)
- **Performance:** Batch insert annotations for better performance
- **Security:** Validate guest_essay_id belongs to session before migration

---

## 🎯 Success Criteria

✅ Anonymous users can preview essays and see comments  
✅ Preview data is saved to `guest_essays` table  
✅ Users can sign up and their preview essay is migrated  
✅ Users see the **exact same comments** they previewed  
✅ Users can discard preview essays  
✅ Old guest essays are automatically cleaned up  
✅ Migration handles errors gracefully  

---

## 📝 Notes

- The `guest_essays` table should be accessible without authentication (no RLS or permissive policy)
- Consider adding a unique constraint on `session_id` if you want one essay per session
- The expiration time (7 days) can be adjusted based on business needs
- Consider adding analytics to track conversion rate (guest essays → signups)

