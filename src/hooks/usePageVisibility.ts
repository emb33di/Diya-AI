import { useEffect } from 'react';

/**
 * Hook to handle page visibility changes
 * Calls the provided callback when the page becomes visible after being hidden
 */
export const usePageVisibility = (callback: () => void) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, execute callback
        callback();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callback]);
};
