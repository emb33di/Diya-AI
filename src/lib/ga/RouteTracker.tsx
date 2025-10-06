import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getGAId, isGAReady } from "./init";

/**
 * React Router route change tracker for GA4 page views.
 * Usage example (in your `App.tsx`, inside `BrowserRouter`):
 *
 *   <RouteTracker />
 *
 * This sends gtag('config', id, { page_path, page_title }) on route changes.
 */
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (!isGAReady()) return;
    const id = getGAId();
    if (!id) return;
    
    try {
      const pagePath = location.pathname + (location.search || "");
      const pageTitle = typeof document !== "undefined" ? document.title : undefined;
      
      (window as any).gtag('config', id, {
        page_path: pagePath,
        page_title: pageTitle,
      });

      const debug = ((import.meta as any)?.env?.VITE_ANALYTICS_DEBUG ?? (typeof process !== 'undefined' ? (process as any)?.env?.VITE_ANALYTICS_DEBUG : undefined)) === 'true';
      if (debug) {
        console.log('📄 GA Page View', { pagePath, pageTitle });
      }
    } catch (err) {
      console.warn('GA page view send failed', err);
    }
  }, [location.pathname, location.search]);

  return null;
};

export default RouteTracker;


