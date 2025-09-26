import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTop } from '@/utils/scrollRestoration';

/**
 * Component that handles scroll restoration on route changes
 * This ensures pages always load at the top unless specifically overridden
 */
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Only scroll to top if there's no hash in the URL
    // Hash navigation should be handled by specific components
    if (!location.hash) {
      // Small delay to ensure it runs after any component-level scrolling
      setTimeout(() => {
        scrollToTop();
      }, 50);
    }
  }, [location.pathname, location.hash]);

  return null;
};

export default ScrollToTop;
