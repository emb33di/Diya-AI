// Centralized string literal unions and helpers for analytics events

export type OnboardingAction = 'started' | 'completed' | 'abandoned';
export type VoiceAction = 'started' | 'ended' | 'error' | 'saved';
export type VoiceType = 'onboarding' | 'brainstorming';
export type EssayAction = 'generated' | 'edited' | 'saved' | 'downloaded';
export type SchoolAction = 'viewed' | 'clicked' | 'added' | 'removed';
export type SchoolCategory = 'reach' | 'target' | 'safety';
export type ConversionType = 'onboarding_complete' | 'school_list_created' | 'paid_upgrade';
export type ErrorLevel = 'warning' | 'error' | 'critical';
export type PerformanceName = 'load_time' | 'response_time';

export const EventNames = {
  Onboarding: 'onboarding_session',
  Voice: 'voice_conversation',
  Essay: 'essay_interaction',
  School: 'school_interaction',
  Conversion: 'conversion',
  Error: 'error_occurred',
  Milestone: 'user_milestone',
  Performance: 'performance_metric',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];


