import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isLogRocketReady } from "./init";

/**
 * React Router route change tracker for LogRocket page views.
 * Usage example (in your `App.tsx`, inside `BrowserRouter`):
 *
 *   <LogRocketRouteTracker />
 *
 * This tracks page navigation for session replay.
 */
const LogRocketRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (!isLogRocketReady()) return;
    
    try {
      const pagePath = location.pathname + (location.search || "");
      
      // LogRocket automatically captures page navigation through DOM changes
      // We can add custom event tracking using console logs or custom events
      // For now, LogRocket's session replay will automatically capture route changes
      
      const debug = ((import.meta as any)?.env?.VITE_ANALYTICS_DEBUG ?? (typeof process !== 'undefined' ? (process as any)?.env?.VITE_ANALYTICS_DEBUG : undefined)) === 'true';
      if (debug) {
        console.log('📄 LogRocket: Page view (automatically captured)', { pagePath });
      }
    } catch (err) {
      console.warn('LogRocket page view tracking failed', err);
    }
  }, [location.pathname, location.search]);

  return null;
};

export default LogRocketRouteTracker;
