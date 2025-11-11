# Session Management System

This document describes the enhanced session management and automatic refresh system implemented for the Diya AI application.

## Overview

The session management system provides:
- ✅ Automatic session refresh before expiration
- ✅ Session validation and recovery
- ✅ Enhanced localStorage handling with error recovery
- ✅ Network error handling and recovery
- ✅ PKCE flow for better security
- ✅ Tab visibility-based session health checks

## Architecture

### 1. Session Manager (`src/lib/supabase/session-manager.ts`)

The core session management service that handles:

- **Automatic Refresh**: Checks session every 5 minutes and refreshes if expiring within 10 minutes
- **Session Validation**: Validates current session and refreshes if expired
- **Session Recovery**: Attempts to recover from localStorage corruption
- **Cleanup**: Properly cleans up corrupted session data

```typescript
import { sessionManager } from '@/lib/supabase/session-manager';

// Manually refresh session
await sessionManager.refreshSession();

// Validate current session
const isValid = await sessionManager.validateSession();

// Start/stop auto-refresh (handled automatically by AuthContext)
sessionManager.startAutoRefresh();
sessionManager.stopAutoRefresh();
```

### 2. Session Storage (`src/lib/supabase/session-storage.ts`)

Enhanced localStorage adapter that provides:

- **Automatic expiry checking**: Removes expired sessions on read
- **Error handling**: Gracefully handles localStorage quota errors
- **Corruption recovery**: Detects and removes corrupted session data
- **Storage utilities**: Check storage availability and size

```typescript
import { isStorageAvailable, getSessionStorageSize } from '@/lib/supabase/session-storage';

// Check if localStorage is available
if (isStorageAvailable()) {
  // Safe to use storage
}

// Get current storage size used by sessions
const size = getSessionStorageSize();
console.log(`Session storage: ${size} bytes`);
```

### 3. Supabase Client Configuration (`src/integrations/supabase/client.ts`)

Enhanced client configuration with:

- **Custom storage adapter**: Uses our enhanced session storage
- **PKCE flow**: More secure authentication flow
- **Session detection**: Automatically detects sessions in URLs
- **Auto-refresh**: Enabled by default

### 4. Auth Context Integration (`src/contexts/AuthContext.tsx`)

The AuthContext now:

- Validates session on initialization
- Starts automatic refresh when user signs in
- Stops refresh on sign out
- Handles session refresh events properly

### 5. Session Recovery Hook (`src/hooks/useSessionRecovery.ts`)

Optional hook for advanced session monitoring:

```typescript
import { useSessionRecovery } from '@/hooks/useSessionRecovery';

function MyComponent() {
  const { 
    isRecovering, 
    recoveryError,
    recoverSession,
    checkSessionHealth 
  } = useSessionRecovery();

  // Manually trigger recovery
  const handleRecovery = async () => {
    const success = await recoverSession();
    if (success) {
      console.log('Session recovered!');
    }
  };

  // Check session health
  const handleHealthCheck = async () => {
    const health = await checkSessionHealth();
    if (health.healthy) {
      console.log('Session expires in:', health.timeUntilExpiry, 'ms');
    } else {
      console.log('Session unhealthy:', health.error);
    }
  };

  return (
    <div>
      {isRecovering && <p>Recovering session...</p>}
      {recoveryError && <p>Error: {recoveryError}</p>}
      <button onClick={handleRecovery}>Recover Session</button>
      <button onClick={handleHealthCheck}>Check Health</button>
    </div>
  );
}
```

## Features

### Automatic Session Refresh

Sessions are automatically refreshed:
- Every 5 minutes (configurable)
- When session expires within 10 minutes
- On sign in and token refresh events
- When tab becomes visible after being hidden
- When network connection is restored

### Session Validation

On app initialization and after network recovery:
1. Check if session exists in localStorage
2. Validate session hasn't expired
3. If expired, attempt to refresh using refresh token
4. If refresh fails, clear corrupted data

### Error Recovery

The system handles:
- **Corrupted localStorage data**: Automatically detected and cleared
- **Network errors**: Auto-recovery when connection restored
- **Quota exceeded**: Clears old sessions to make space
- **Expired sessions**: Automatic refresh using refresh token
- **Invalid JSON**: Detects and removes corrupted session data

### Tab Visibility Monitoring

When user returns to the tab:
1. Check session health
2. If unhealthy, attempt recovery
3. Refresh if expired or about to expire

### Network Monitoring

When network connection is restored:
1. Automatically attempt session recovery
2. Validate and refresh if needed

## Configuration

### Adjust Refresh Intervals

Edit `src/lib/supabase/session-manager.ts`:

```typescript
private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
private readonly SESSION_EXPIRY_THRESHOLD = 10 * 60 * 1000; // Refresh 10 min before expiry
```

### Storage Key

The session storage key is configured in `src/integrations/supabase/client.ts`:

```typescript
auth: {
  storageKey: 'sb-auth-token', // Change if needed
  // ...
}
```

## Security Enhancements

### PKCE Flow

The system uses PKCE (Proof Key for Code Exchange) flow for OAuth:
- More secure than implicit flow
- Protects against authorization code interception
- Recommended for SPAs and mobile apps

### Secure Token Storage

- Tokens stored in localStorage with validation
- Automatic expiry checking on read
- Corruption detection and cleanup
- Quota error handling

## Monitoring and Debugging

### Check Session Status

```typescript
import { sessionManager } from '@/lib/supabase/session-manager';
import { supabase } from '@/integrations/supabase/client';

// Get current session
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);

// Check if valid
const isValid = await sessionManager.validateSession();
console.log('Session valid:', isValid);
```

### Storage Diagnostics

```typescript
import { getSessionStorageSize, isStorageAvailable } from '@/lib/supabase/session-storage';

console.log('Storage available:', isStorageAvailable());
console.log('Session storage size:', getSessionStorageSize(), 'bytes');
```

### Enable Debug Logging

To add debug logging, uncomment console.log statements in:
- `src/lib/supabase/session-manager.ts`
- `src/lib/supabase/session-storage.ts`

## Migration Notes

### From Previous Version

No migration needed! The new system:
- ✅ Automatically migrates existing sessions
- ✅ Cleans up old corrupted data
- ✅ Works with existing auth flow
- ✅ No breaking changes to AuthContext API

### Testing Checklist

- [ ] Sign in and verify session persists across page refreshes
- [ ] Leave tab idle for 10+ minutes and verify auto-refresh
- [ ] Go offline, then online, and verify session recovery
- [ ] Switch tabs and return to verify session health check
- [ ] Clear localStorage and verify clean session start
- [ ] Sign out and verify session cleanup

## Best Practices

1. **Don't manually manage sessions**: The system handles it automatically
2. **Use `useAuth()` hook**: Access user and session state through the hook
3. **Handle edge cases**: Use `useSessionRecovery()` for critical flows
4. **Monitor errors**: Check console for session-related errors
5. **Test offline scenarios**: Ensure your app handles network errors

## Troubleshooting

### Session not persisting
- Check localStorage is enabled in browser
- Verify no browser extensions blocking storage
- Check storage quota (use `getSessionStorageSize()`)

### Session expires too quickly
- Check system clock is correct
- Verify Supabase project settings
- Increase `SESSION_EXPIRY_THRESHOLD` if needed

### Auto-refresh not working
- Check browser console for errors
- Verify network connectivity
- Ensure tab is not being throttled when hidden

### Corrupted session data
- The system auto-detects and cleans up
- If issues persist, clear localStorage manually
- Check browser console for error details

## Performance Impact

- **Minimal**: Refresh check runs every 5 minutes
- **Efficient**: Only refreshes when needed (< 10 min to expiry)
- **Optimized**: Uses localStorage adapter with smart caching
- **Network**: Only makes API calls when necessary

## Future Enhancements

Potential improvements:
- [ ] Add metrics/analytics for session events
- [ ] Implement session sync across tabs
- [ ] Add session duration tracking
- [ ] Implement adaptive refresh intervals based on usage
- [ ] Add session warning notifications before expiry

