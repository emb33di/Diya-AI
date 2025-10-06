import { isGAReady, getGAId } from "@/lib/ga/init";
import { EventNames, ErrorLevel, PerformanceName, ConversionType, OnboardingAction, VoiceAction, VoiceType, EssayAction, SchoolAction, SchoolCategory } from "@/lib/ga/events";

const DEBUG = ((import.meta as any)?.env?.NEXT_PUBLIC_ANALYTICS_DEBUG ?? (typeof process !== 'undefined' ? (process as any)?.env?.NEXT_PUBLIC_ANALYTICS_DEBUG : undefined)) === 'true'
  || ((import.meta as any)?.env?.VITE_ANALYTICS_DEBUG ?? (typeof process !== 'undefined' ? (process as any)?.env?.VITE_ANALYTICS_DEBUG : undefined)) === 'true';

const lastEvents: { name: string; time: number }[] = [];
const lastErrors: Record<string, { count: number; last: number }> = {};
const MAX_PARAMS = 25;

const truncate = (val: any): any => {
  if (typeof val === 'string') return val.length > 100 ? val.slice(0, 100) + '…' : val;
  return val;
};

const sanitizeParams = (params?: Record<string, any>): Record<string, any> | undefined => {
  if (!params) return undefined;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    // Basic PII guard: avoid obvious keys
    if (/email|e-mail|phone|fullname|full_name|first_name|last_name/i.test(k)) {
      if (DEBUG) console.warn(`Analytics: skipped potentially sensitive field "${k}"`);
      continue;
    }
    if (Array.isArray(v)) continue; // skip large arrays
    out[k] = truncate(v);
    if (Object.keys(out).length >= MAX_PARAMS) break;
  }
  if (Object.keys(params).length > MAX_PARAMS && DEBUG) {
    console.warn('Analytics: Too many details—skipping some to keep GA happy.');
  }
  return out;
};

const normalizeEventName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);

const recentlySent = (name: string, windowMs = 2000): boolean => {
  const now = Date.now();
  const recent = lastEvents.find(e => e.name === name && now - e.time < windowMs);
  if (recent) return true;
  lastEvents.push({ name, time: now });
  // keep small
  if (lastEvents.length > 50) lastEvents.shift();
  return false;
};

export const trackEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  const id = getGAId();
  if (!isGAReady() || !id) return;
  const name = normalizeEventName(eventName);
  const params = sanitizeParams(parameters);
  try {
    if (recentlySent(`${name}:${JSON.stringify(params)}`)) {
      if (DEBUG) console.log('Analytics: Duplicate skipped');
      return;
    }
    (window as any).gtag('event', name, params);
    if (DEBUG) console.log('📊 Analytics Event:', name, params);
  } catch (err) {
    if (DEBUG) console.warn('GA send failed - will retry later', err);
  }
};

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  const id = getGAId();
  if (!isGAReady() || !id) return;
  try {
    (window as any).gtag('config', id, {
      page_path: pagePath,
      page_title: pageTitle,
    });
    if (DEBUG) console.log('📄 Page View:', pagePath, pageTitle);
  } catch (err) {
    if (DEBUG) console.warn('GA pageview failed', err);
  }
};

export const trackSignup = (method: 'email' | 'google' | 'apple') => {
  trackEvent('sign_up', {
    method,
  });
};

export const trackOnboardingEvent = (
  action: OnboardingAction,
  sessionNumber: number,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('onboarding_session', {
    session_number: sessionNumber,
    action: action,
    ...additionalData,
  });
};

export const trackVoiceEvent = (
  action: VoiceAction,
  conversationType: VoiceType,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('voice_conversation', {
    type: conversationType,
    action,
    ...additionalData,
  });
};

export const trackEssayEvent = (
  action: EssayAction,
  essayType?: string,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('essay_interaction', {
    type: essayType,
    action,
    word_count: additionalData?.word_count,
    ...additionalData,
  });
};

export const trackSchoolEvent = (
  action: SchoolAction,
  schoolName?: string,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('school_interaction', {
    action,
    school_name: schoolName,
    category: additionalData?.category as SchoolCategory | undefined,
    ...additionalData,
  });
};

export const trackFeatureUsage = (
  featureName: string,
  action: 'opened' | 'used' | 'completed' | 'abandoned',
  additionalData?: { [key: string]: any }
) => {
  trackEvent('feature_usage', {
    feature_name: featureName,
    action: action,
    ...additionalData,
  });
};

export const trackConversion = (
  conversionType: ConversionType,
  value?: number,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('conversion', {
    type: conversionType,
    value,
    ...additionalData,
  });
  if (DEBUG) {
    const friendly = {
      onboarding_complete: 'User completed onboarding!',
      school_list_created: 'User created a school list!',
      paid_upgrade: 'User upgraded to paid!',
    } as Record<ConversionType, string>;
    console.log(`✅ Tracked: ${friendly[conversionType] || conversionType}`);
  }
};

export const trackError = (
  errorType: string,
  errorMessage: string,
  context?: {
    source?: string;
    level?: ErrorLevel;
    [key: string]: any;
  }
) => {
  const key = `${errorType}:${errorMessage}`;
  const now = Date.now();
  const entry = lastErrors[key] || { count: 0, last: 0 };
  if (now - entry.last < 10000 && entry.count >= 5) {
    if (DEBUG) console.warn('Repeated error skipped to avoid noise');
    return;
  }
  entry.count = now - entry.last < 10000 ? entry.count + 1 : 1;
  entry.last = now;
  lastErrors[key] = entry;

  const payload = sanitizeParams({
    type: errorType,
    message: errorMessage?.slice(0, 100), // GA also timestamps automatically
    source: context?.source,
    level: context?.level || 'error',
    ...context,
  });

  trackEvent(EventNames.Error, payload);

  if (DEBUG) {
    const level = (context?.level || 'error') as ErrorLevel;
    const log = level === 'critical' ? console.error : level === 'warning' ? console.warn : console.log;
    log(`🚨 Error logged: [${errorMessage?.slice(0, 100)}]. Check GA4 DebugView for details.`, payload);
  }
};

export const trackMilestone = (
  milestone: 'first_essay' | 'first_school_added',
  additionalData?: { [key: string]: any }
) => {
  trackEvent('user_milestone', {
    milestone: milestone,
    ...additionalData,
  });
};

export const trackPerformance = (
  name: PerformanceName,
  value: number,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('performance_metric', {
    name,
    value,
    ...additionalData,
  });
};

// Export all tracking functions for easy importing
export const analytics = {
  trackEvent,
  trackPageView,
  trackSignup,
  trackOnboardingEvent,
  trackVoiceEvent,
  trackEssayEvent,
  trackSchoolEvent,
  trackFeatureUsage,
  trackConversion,
  trackError,
  trackMilestone,
  trackPerformance,
};