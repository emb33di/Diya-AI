/**
 * GA4 initialization for SPA
 *
 * CSP note (allow at minimum):
 * - script-src: https://www.googletagmanager.com https://www.google-analytics.com
 * - connect-src: https://www.google-analytics.com https://region1.google-analytics.com
 * - img-src: https://www.google-analytics.com https://ssl.gstatic.com data:
 * - style-src 'unsafe-inline' (only if you already allow inline; GA doesn't require it)
 *
 * We set send_page_view: false and handle SPA page views manually.
 */

let initialized = false;
let injectedScript = false;

const getEnv = (key: string): string | undefined => {
  // Vite style
  const viteVal = (import.meta as any)?.env?.[key];
  // Next/public or node style during build
  const nodeVal = typeof process !== 'undefined' ? (process as any)?.env?.[key] : undefined;
  return viteVal ?? nodeVal ?? undefined;
};

export const getGAId = (): string | undefined => {
  return (
    getEnv('VITE_GA_ID') ||
    getEnv('NEXT_PUBLIC_GA_ID') ||
    'G-EG61TCBFGV'
  );
};

const getAppVersion = (): string | undefined => {
  return getEnv('VITE_APP_VERSION') || getEnv('NEXT_PUBLIC_APP_VERSION');
};

export const initAnalytics = (): void => {
  if (initialized) return;

  const id = getGAId();
  if (!id) {
    // Quietly skip if no ID is configured
    return;
  }

  // Define dataLayer/gtag early
  if (typeof window !== 'undefined') {
    if (!Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer = [];
    }
    if (typeof (window as any).gtag !== 'function') {
      (window as any).gtag = function gtag() {
        (window as any).dataLayer.push(arguments);
      } as any;
    }
  }

  // Inject GA script only once
  if (!injectedScript && typeof document !== 'undefined') {
    const existing = Array.from(document.getElementsByTagName('script')).find(s =>
      s.src && s.src.includes('https://www.googletagmanager.com/gtag/js')
    );
    if (!existing) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.setAttribute('data-origin', 'ga4-loader');
      document.head.appendChild(script);
    }
    injectedScript = true;
  }

  // Base configuration; manual SPA page views
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', id, {
    anonymize_ip: true,
    transport_type: 'beacon',
    send_page_view: false,
    app_version: getAppVersion(),
  });

  initialized = true;
};

export const isGAReady = (): boolean => {
  const hasWindow = typeof window !== 'undefined';
  const id = getGAId();
  return !!(hasWindow && (window as any).gtag && typeof (window as any).gtag === 'function' && id);
};


