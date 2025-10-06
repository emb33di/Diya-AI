/**
 * Google Analytics utility functions for tracking user interactions
 * in the Diya-AI college counseling platform
 */

// Extend the global Window interface to include gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

/**
 * Track custom events with Google Analytics
 */
export const trackEvent = (
  eventName: string,
  parameters?: {
    event_category?: string;
    event_label?: string;
    value?: number;
    [key: string]: any;
  }
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
    console.log('📊 Analytics Event:', eventName, parameters);
  }
};

/**
 * Track page views
 */
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-EG61TCBFGV', {
      page_path: pagePath,
      page_title: pageTitle,
    });
    console.log('📊 Page View:', pagePath, pageTitle);
  }
};

/**
 * Track user signup events
 */
export const trackSignup = (method: 'email' | 'google' | 'apple') => {
  trackEvent('sign_up', {
    event_category: 'engagement',
    event_label: method,
    method: method,
  });
};

/**
 * Track onboarding session events
 */
export const trackOnboardingEvent = (
  action: 'started' | 'completed' | 'abandoned',
  sessionNumber: number,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('onboarding_session', {
    event_category: 'onboarding',
    event_label: `${action}_session_${sessionNumber}`,
    session_number: sessionNumber,
    action: action,
    ...additionalData,
  });
};

/**
 * Track voice conversation events
 */
export const trackVoiceEvent = (
  action: 'started' | 'ended' | 'error' | 'transcript_saved',
  conversationType: 'onboarding' | 'brainstorming' | 'general',
  additionalData?: { [key: string]: any }
) => {
  trackEvent('voice_conversation', {
    event_category: 'voice_interaction',
    event_label: `${action}_${conversationType}`,
    conversation_type: conversationType,
    action: action,
    ...additionalData,
  });
};

/**
 * Track essay-related events
 */
export const trackEssayEvent = (
  action: 'generated' | 'edited' | 'saved' | 'downloaded',
  essayType?: string,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('essay_interaction', {
    event_category: 'essay_workflow',
    event_label: `${action}_${essayType || 'unknown'}`,
    essay_type: essayType,
    action: action,
    ...additionalData,
  });
};

/**
 * Track school recommendation events
 */
export const trackSchoolEvent = (
  action: 'viewed' | 'clicked' | 'added_to_list' | 'removed_from_list',
  schoolName?: string,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('school_interaction', {
    event_category: 'school_recommendations',
    event_label: `${action}_${schoolName || 'unknown'}`,
    school_name: schoolName,
    action: action,
    ...additionalData,
  });
};

/**
 * Track user engagement with specific features
 */
export const trackFeatureUsage = (
  featureName: string,
  action: 'opened' | 'used' | 'completed' | 'abandoned',
  additionalData?: { [key: string]: any }
) => {
  trackEvent('feature_usage', {
    event_category: 'feature_engagement',
    event_label: `${featureName}_${action}`,
    feature_name: featureName,
    action: action,
    ...additionalData,
  });
};

/**
 * Track conversion events (important for business metrics)
 */
export const trackConversion = (
  conversionType: 'onboarding_complete' | 'essay_generated' | 'school_list_created' | 'profile_complete',
  value?: number,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('conversion', {
    event_category: 'conversion',
    event_label: conversionType,
    conversion_type: conversionType,
    value: value,
    ...additionalData,
  });
};

/**
 * Track errors for debugging
 */
export const trackError = (
  errorType: string,
  errorMessage: string,
  context?: { [key: string]: any }
) => {
  trackEvent('error_occurred', {
    event_category: 'error_tracking',
    event_label: errorType,
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
};

/**
 * Track user journey milestones
 */
export const trackMilestone = (
  milestone: 'first_voice_session' | 'first_essay' | 'first_school_added' | 'profile_complete',
  additionalData?: { [key: string]: any }
) => {
  trackEvent('user_milestone', {
    event_category: 'user_journey',
    event_label: milestone,
    milestone: milestone,
    ...additionalData,
  });
};

/**
 * Track performance metrics
 */
export const trackPerformance = (
  metric: 'page_load_time' | 'voice_response_time' | 'essay_generation_time',
  value: number,
  additionalData?: { [key: string]: any }
) => {
  trackEvent('performance_metric', {
    event_category: 'performance',
    event_label: metric,
    metric_name: metric,
    value: value,
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
