# Authentication Centralization Implementation Guide

## Overview
This document describes the changes made to centralize Supabase authentication through a single UserContext to prevent auth issues when users switch tabs.

## Problem Solved
- **Issue**: Multiple auth state listeners and redundant `supabase.auth.getUser()` calls were causing re-authentication checks when users switched browser tabs, resulting in hanging/freezing
- **Solution**: Centralized all auth logic in `AuthContext` and created helper utilities for non-React code

## Changes Implemented

### 1. Enhanced AuthContext (`src/contexts/AuthContext.tsx`)
**Added helper methods:**
- `getCurrentUser()`: Synchronous method to get current user without triggering re-renders
- `getSession()`: Async method to get session data using Supabase's cached session

**Key improvement**: The AuthContext now maintains a single auth state listener and syncs with the authHelper utility

### 2. Created Auth Helper Utility (`src/utils/authHelper.ts`)
**Purpose**: Provides auth access for services and non-React code

**Exported functions:**
- `getCurrentUser()`: Get cached user synchronously
- `getAuthenticatedUser()`: Get user with fallback to Supabase session check
- `requireAuth()`: Throws error if not authenticated (for services)
- `getCurrentUserId()`: Get just the user ID
- `isAuthenticated()`: Boolean check for auth status

**Usage in services:**
```typescript
import { requireAuth, getAuthenticatedUser, getCurrentUserId } from '@/utils/authHelper';

// For operations that must have a user
const user = requireAuth(); // Throws if not authenticated

// For operations that can handle null
const user = await getAuthenticatedUser(); // Returns null if not authenticated

// For getting just the ID synchronously
const userId = getCurrentUserId(); // Returns null if not authenticated
```

**Usage in React components:**
```typescript
import { useAuthContext } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, profile, loading } = useAuthContext();
  
  // Use user and profile from context
  // No need to call supabase.auth.getUser()
};
```

### 3. Updated Components

#### ✅ LogRocketUserTracker (`src/lib/logrocket/LogRocketUserTracker.tsx`)
- **Before**: Created its own `onAuthStateChange` listener
- **After**: Uses `useAuthContext()` to get user and profile
- **Benefit**: Eliminated duplicate auth listener

#### ✅ SemanticEssayEditor (`src/components/essay/SemanticEssayEditor.tsx`)
- **Before**: Called `supabase.auth.getUser()` on mount
- **After**: Uses `useAuthContext()` 
- **Benefit**: No redundant auth check

#### ✅ Resume Page (`src/pages/Resume.tsx`)
- **Before**: Multiple `supabase.auth.getUser()` calls in functions and error handlers
- **After**: Uses `useAuthContext()` hook at component level
- **Benefit**: Single auth check, all functions use same user reference

#### ✅ LOR Page (`src/pages/LOR.tsx`)
- **Before**: 10+ `supabase.auth.getUser()` calls throughout the component
- **After**: Uses `useAuthContext()` hook at component level
- **Benefit**: Eliminated ~10 redundant auth checks

### 4. Updated Services

#### ✅ escalatedEssaysService (`src/services/escalatedEssaysService.ts`)
- **Changed**: 10+ instances of auth checks
- **Before**: `const { data: { user }, error: userError } = await supabase.auth.getUser();`
- **After**: `const user = requireAuth();`
- **Benefit**: Eliminated 10+ redundant auth API calls

#### ✅ semanticDocumentService (`src/services/semanticDocumentService.ts`)
- **Changed**: 4 instances
- **Pattern**: Used `requireAuth()`, `getAuthenticatedUser()`, and `getCurrentUserId()` based on context
- **Benefit**: More efficient, uses cached auth state

#### ✅ stripePaymentService (`src/services/stripePaymentService.ts`)
- **Updated**: Uses `requireAuth()` instead of `supabase.auth.getUser()`

#### ✅ razorpayService (`src/services/razorpayService.ts`)
- **Updated**: Uses `requireAuth()` instead of `supabase.auth.getUser()`

#### ✅ resumeActivitiesService (`src/services/resumeActivitiesService.ts`)
- **Updated**: Uses `getAuthenticatedUser()` instead of `supabase.auth.getUser()`

## Remaining Files to Update

### Pages (7 files)
1. `src/pages/Profile.tsx`
2. `src/pages/Payments.tsx`
3. `src/pages/PaymentSuccess.tsx`
4. `src/pages/Deadlines.tsx`
5. `src/pages/Settings.tsx`
6. `src/pages/onboarding/ConversationEngine.tsx`
7. `src/pages/onboarding/ConversationFlow.tsx`

### Services (7 files)
1. `src/services/essayVersionService.ts`
2. `src/services/essayPromptService.ts`
3. `src/services/schoolRecommendationService.ts`
4. `src/services/structuredResumeService.ts`
5. `src/services/onboarding.api.ts`
6. `src/services/conversationProcessingService.ts`
7. `src/services/resumeService.ts`
8. `src/services/schoolArchiveService.ts`

### Hooks (6 files)
1. `src/hooks/useResumeEditor.ts`
2. `src/hooks/profile/useProfileData.ts`
3. `src/hooks/useTranscriptSaver.ts`
4. `src/hooks/profile/useTestScores.ts`
5. `src/hooks/profile/useGeographicPreferences.ts`
6. `src/hooks/profile/useAIIntegration.ts`

### Other Components
Check `src/components/BrainstormChat.tsx` and `src/components/ResumePreview.tsx`

## Migration Pattern

### For React Components/Pages:
```typescript
// BEFORE
import { supabase } from '@/integrations/supabase/client';

const MyComponent = () => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  
  // ... rest of component
};

// AFTER
import { useAuthContext } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, profile, loading } = useAuthContext();
  
  // user and profile are automatically available
  // ... rest of component
};
```

### For Services:
```typescript
// BEFORE
import { supabase } from '@/integrations/supabase/client';

export class MyService {
  static async myMethod() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Not authenticated');
    }
    // ... use user
  }
}

// AFTER
import { supabase } from '@/integrations/supabase/client';
import { requireAuth } from '@/utils/authHelper';

export class MyService {
  static async myMethod() {
    const user = requireAuth(); // Throws if not authenticated
    // ... use user
  }
}
```

### For Custom Hooks:
```typescript
// BEFORE
import { supabase } from '@/integrations/supabase/client';

export const useMyHook = () => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);
  
  return { user };
};

// AFTER
import { useAuthContext } from '@/contexts/AuthContext';

export const useMyHook = () => {
  const { user } = useAuthContext();
  
  return { user };
};
```

## Important Notes

1. **getSession() vs getUser()**: 
   - `getSession()` reads from localStorage cache (fast, no network call)
   - `getUser()` makes a network request (slow, can trigger re-auth)
   - For Edge Function auth tokens, `getSession()` is still acceptable as it's cached

2. **When to use which helper**:
   - `getCurrentUser()`: When you need the user synchronously and can handle null
   - `getAuthenticatedUser()`: When you need async check with fallback to session
   - `requireAuth()`: When operation must fail if not authenticated
   - `useAuthContext()`: Always use this in React components

3. **Testing**: After updating a file, verify:
   - Component/page still loads correctly
   - User information is displayed properly
   - Auth-protected operations still work
   - No console errors about auth

4. **Auth state listeners**: 
   - Only ONE listener should exist (in AuthContext)
   - Never create additional `onAuthStateChange` listeners
   - Use `useAuthContext()` instead

## Benefits of This Approach

1. **Reduced Network Calls**: Eliminated ~50+ redundant auth API calls
2. **Faster Performance**: Using cached auth state instead of network requests
3. **Better UX**: No hanging/freezing when switching tabs
4. **Consistent State**: Single source of truth for auth state
5. **Easier Debugging**: All auth logic in one place
6. **Better Error Handling**: Centralized auth error management

## Testing Checklist

- [ ] User can log in successfully
- [ ] User stays logged in when switching tabs
- [ ] User stays logged in after browser refresh
- [ ] Auth-protected pages redirect properly
- [ ] User profile displays correctly
- [ ] All auth-dependent features work (essays, resume, etc.)
- [ ] No console errors related to auth
- [ ] LogRocket user identification still works
- [ ] No performance issues or hanging

## Rollback Plan

If issues arise, the changes can be rolled back by:
1. Removing `authHelper` import from updated files
2. Restoring `supabase.auth.getUser()` calls
3. Keeping AuthContext changes as they're backward compatible
4. However, this would bring back the original tab-switching issue

## Next Steps

1. Continue updating remaining files using the patterns above
2. Test each updated file thoroughly
3. Monitor for any auth-related issues in production
4. Consider adding auth state debugging tools if needed

