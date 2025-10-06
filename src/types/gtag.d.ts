// Minimal GA4 global typings to keep usage type-safe without overcomplicating
// These are intentionally simple; GA parameters are validated at runtime.

declare global {
  interface Window {
    dataLayer: any[];
    gtag: Gtag;
  }
}

type Gtag = {
  (command: 'js', value: Date): void;
  (command: 'config', targetId: string, config?: Record<string, any>): void;
  (command: 'event', eventName: string, params?: Record<string, any>): void;
  (command: 'set', target: 'user_properties', params: Record<string, any>): void;
  // Allow unknown signatures without losing type safety on known ones
  (...args: any[]): void;
};

export {};


