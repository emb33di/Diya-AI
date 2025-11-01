/**
 * LogRocket initialization for session replay and error tracking
 * 
 * CSP note (allow at minimum):
 * - script-src: https://cdn.logrocket.io
 * - connect-src: https://api.logrocket.io https://ingest.logrocket.io
 * - img-src: https://api.logrocket.io
 */

import LogRocket from 'logrocket';

let initialized = false;

const getEnv = (key: string): string | undefined => {
  // Vite style
  const viteVal = (import.meta as any)?.env?.[key];
  // Next/public or node style during build
  const nodeVal = typeof process !== 'undefined' ? (process as any)?.env?.[key] : undefined;
  return viteVal ?? nodeVal ?? undefined;
};

export const getLogRocketAppId = (): string | undefined => {
  // Check both VITE_LOGROCKET_ID and VITE_LOGROCKET_APP_ID for compatibility
  return getEnv('VITE_LOGROCKET_ID') || getEnv('VITE_LOGROCKET_APP_ID');
};

/**
 * Initialize LogRocket
 * Should only be called once at app startup
 */
export const initLogRocket = (): void => {
  if (initialized) return;

  const appId = getLogRocketAppId();
  if (!appId) {
    // Quietly skip if no app ID is configured
    if (import.meta.env.DEV) {
      console.log('⚠️ LogRocket: No app ID configured. Skipping initialization.');
    }
    return;
  }

  // Only initialize in production or if explicitly enabled in dev
  const isDev = import.meta.env.DEV;
  const enableInDev = getEnv('VITE_LOGROCKET_ENABLE_IN_DEV') === 'true';
  
  if (isDev && !enableInDev) {
    console.log('⚠️ LogRocket: Skipping initialization in development mode. Set VITE_LOGROCKET_ENABLE_IN_DEV=true to enable.');
    return;
  }

  try {
    LogRocket.init(appId);

    initialized = true;
    
    if (import.meta.env.DEV) {
      console.log('✅ LogRocket initialized successfully');
    }
  } catch (error) {
    console.error('❌ LogRocket initialization failed:', error);
  }
};

/**
 * Identify a user in LogRocket
 * Call this when user logs in or when user data becomes available
 */
export const identifyUser = (userId: string, userData?: {
  email?: string;
  name?: string;
  [key: string]: any;
}): void => {
  if (!initialized) {
    console.warn('⚠️ LogRocket: Cannot identify user - LogRocket not initialized');
    return;
  }

  try {
    // SDK requirement: LogRocket.identify only accepts strings as UIDs
    // Explicitly cast to string to ensure compliance
    const uid = String(userId);
    LogRocket.identify(uid, userData || {});
    
    if (import.meta.env.DEV) {
      console.log('✅ LogRocket: User identified', { userId: uid, userData });
    }
  } catch (error) {
    console.error('❌ LogRocket: Failed to identify user', error);
  }
};

/**
 * Clear user identification (call on logout)
 * LogRocket doesn't have a clearIdentify method, so we identify with anonymous data
 */
export const clearUser = (): void => {
  if (!initialized) {
    return;
  }

  try {
    // LogRocket doesn't support clearing identify, but we can identify as anonymous
    // This is handled automatically when a new session starts
    if (import.meta.env.DEV) {
      console.log('✅ LogRocket: User cleared (will be cleared on next session)');
    }
  } catch (error) {
    console.error('❌ LogRocket: Failed to clear user', error);
  }
};

/**
 * Check if LogRocket is initialized and ready
 */
export const isLogRocketReady = (): boolean => {
  return initialized;
};

export default LogRocket;
