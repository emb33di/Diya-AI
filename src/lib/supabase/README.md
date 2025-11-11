# Supabase Session Management

This directory contains the session management infrastructure for the application.

## Files

### `session-manager.ts`
Core session management service that handles:
- Automatic session refresh
- Session validation
- Session recovery
- Cleanup of corrupted data

**Usage:**
```typescript
import { sessionManager } from '@/lib/supabase/session-manager';

// The AuthContext handles this automatically
// Manual usage for advanced scenarios:
await sessionManager.refreshSession();
const isValid = await sessionManager.validateSession();
```

### `session-storage.ts`
Enhanced localStorage adapter for Supabase sessions:
- Automatic expiry checking
- Corruption detection
- Quota error handling
- Storage utilities

**Usage:**
```typescript
import { 
  isStorageAvailable, 
  getSessionStorageSize 
} from '@/lib/supabase/session-storage';

if (isStorageAvailable()) {
  const size = getSessionStorageSize();
  console.log(`Storage: ${size} bytes`);
}
```

## Integration

These utilities are automatically integrated with:
- `AuthContext` - Handles session lifecycle
- `Supabase Client` - Uses enhanced storage adapter
- `useSessionRecovery` hook - Optional recovery utilities

See [SESSION_MANAGEMENT_README.md](../../../SESSION_MANAGEMENT_README.md) for full documentation.

