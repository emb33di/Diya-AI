/**
 * Session Storage Adapter for Supabase
 * Provides better handling of session data with localStorage
 */

export interface SessionStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

/**
 * Enhanced localStorage adapter with error handling and recovery
 */
export const createSessionStorage = (): SessionStorage => {
  const STORAGE_PREFIX = 'sb-';

  return {
    getItem: (key: string) => {
      try {
        const item = localStorage.getItem(key);
        
        // Validate stored session data
        if (item && key.includes('auth-token')) {
          try {
            const parsed = JSON.parse(item);
            
            // Check if session has expired
            if (parsed.expires_at) {
              const expiresAt = new Date(parsed.expires_at).getTime();
              const now = Date.now();
              
              if (expiresAt < now) {
                // Session expired, remove it
                localStorage.removeItem(key);
                return null;
              }
            }
          } catch (e) {
            // Invalid JSON, remove corrupted data
            localStorage.removeItem(key);
            return null;
          }
        }
        
        return item;
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    },

    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        
        // Handle quota exceeded errors
        if (error instanceof DOMException && 
            (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          // Clear old Supabase sessions to make space
          clearOldSessions();
          
          // Try again
          try {
            localStorage.setItem(key, value);
          } catch (retryError) {
            console.error('Error writing to localStorage after cleanup:', retryError);
          }
        }
      }
    },

    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    }
  };
};

/**
 * Clear old or invalid Supabase sessions
 */
function clearOldSessions() {
  try {
    const keys = Object.keys(localStorage);
    const supabaseKeys = keys.filter(key => key.startsWith('sb-'));
    
    // Remove all Supabase auth keys
    supabaseKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
  } catch (error) {
    console.error('Error clearing old sessions:', error);
  }
}

/**
 * Check if localStorage is available and working
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get storage size used by Supabase sessions
 */
export function getSessionStorageSize(): number {
  try {
    const keys = Object.keys(localStorage);
    const supabaseKeys = keys.filter(key => key.startsWith('sb-'));
    
    let totalSize = 0;
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    });
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return 0;
  }
}

