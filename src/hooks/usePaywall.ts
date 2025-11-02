import { useEffect } from 'react';
import { useAuth } from './useAuth';

export type UserTier = 'Free' | 'Pro';

export interface PaywallFeature {
  name: string;
  description: string;
  requiresPro: boolean;
}

export const PAYWALL_FEATURES: Record<string, PaywallFeature> = {
  // Essay features
  'unlimited_essay_feedback': {
    name: 'Unlimited Essay Feedback',
    description: 'Get unlimited AI-powered feedback and scoring on your essays',
    requiresPro: true,
  },
  'essay_scoring': {
    name: 'Essay Scoring',
    description: 'Detailed scoring and analysis of your essays',
    requiresPro: true,
  },
  'grammar_check': {
    name: 'Grammar Check',
    description: 'AI-powered grammar and style suggestions for your essay',
    requiresPro: true,
  },
  
  // Resume features
  'unlimited_resume_formatting': {
    name: 'Unlimited Resume Formatting',
    description: 'Unlimited access to AI-powered resume formatting and downloads',
    requiresPro: true,
  },
  'resume_download': {
    name: 'Resume Download',
    description: 'Download your formatted resume in multiple formats',
    requiresPro: true,
  },
  
  // Library features
  'full_library_access': {
    name: 'Full Library Access',
    description: 'Access to the entire library of successful LORs, resumes, and essays',
    requiresPro: true,
  },
  'limited_library_access': {
    name: 'Limited Library Access',
    description: 'Limited access to LOR templates, successful essays, and sample resumes',
    requiresPro: false,
  },
  
  // Webinar features
  'webinar_access': {
    name: 'Webinar Access',
    description: 'Access to weekly webinars and college guidance videos',
    requiresPro: true,
  },
  
  // Basic features (always available)
  'voice_onboarding': {
    name: 'Voice Onboarding',
    description: 'Voice onboarding call with Diya',
    requiresPro: false,
  },
  'deadline_tracking': {
    name: 'Deadline Tracking',
    description: 'Deadline tracking and reminders',
    requiresPro: false,
  },
  'essay_management': {
    name: 'Essay Management',
    description: 'All your essays, in one place',
    requiresPro: false,
  },
  'resume_management': {
    name: 'Resume Management',
    description: 'Basic resume management',
    requiresPro: false,
  },
};

export const usePaywall = () => {
  const { profile, loading } = useAuth();
  
  const userTier: UserTier = profile?.user_tier === 'Pro' ? 'Pro' : 'Free';
  const isPro = userTier === 'Pro';
  const isFree = userTier === 'Free';

  useEffect(() => {
    console.log('[PAYWALL_DEBUG] Paywall state snapshot', {
      loading,
      userTier,
      isPro,
      isFree,
      hasProfile: Boolean(profile),
      profileId: profile?.id ?? null,
    });
  }, [loading, userTier, isPro, isFree, profile?.id]);
  
  const hasAccess = (featureKey: string): boolean => {
    const feature = PAYWALL_FEATURES[featureKey];
    if (!feature) {
      console.warn(`Unknown paywall feature: ${featureKey}`);
      return true; // Default to allowing access for unknown features
    }
    
    // If feature doesn't require Pro, always allow access
    if (!feature.requiresPro) {
      return true;
    }
    
    // If feature requires Pro, check if user has Pro tier
    return isPro;
  };
  
  const getFeatureInfo = (featureKey: string): PaywallFeature | null => {
    return PAYWALL_FEATURES[featureKey] || null;
  };
  
  const getUpgradeMessage = (featureKey: string): string => {
    const feature = PAYWALL_FEATURES[featureKey];
    if (!feature) return 'This feature requires a Pro subscription.';
    
    if (feature.requiresPro && isFree) {
      return `Upgrade to Pro to access ${feature.name.toLowerCase()}.`;
    }
    
    return '';
  };
  
  const getProFeatures = (): PaywallFeature[] => {
    return Object.values(PAYWALL_FEATURES).filter(feature => feature.requiresPro);
  };
  
  const getFreeFeatures = (): PaywallFeature[] => {
    return Object.values(PAYWALL_FEATURES).filter(feature => !feature.requiresPro);
  };
  
  return {
    userTier,
    isPro,
    isFree,
    loading,
    hasAccess,
    getFeatureInfo,
    getUpgradeMessage,
    getProFeatures,
    getFreeFeatures,
    PAYWALL_FEATURES,
  };
};
