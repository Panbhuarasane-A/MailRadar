export const SENSITIVITY_THRESHOLDS = {
  conservative: {
    hotspot: 85,
    important: 65,
    normal: 35,
  },
  balanced: {
    hotspot: 80,
    important: 60,
    normal: 30,
  },
  aggressive: {
    hotspot: 72,
    important: 50,
    normal: 25,
  },
} as const;

export type SensitivityLevel = keyof typeof SENSITIVITY_THRESHOLDS;

export const DEFAULT_SCORING_WEIGHTS = {
  deadlineProximity: 0.30,
  senderImportance: 0.25,
  actionRequirement: 0.20,
  urgencyStakes: 0.15,
  interactionHistory: 0.10,
};

export const CATEGORIES = [
  'work',
  'finance',
  'academic',
  'personal',
  'promotional',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const INTENTS = [
  'request',
  'fyi',
  'meeting_invite',
  'approval_needed',
  'complaint',
  'deadline_notice',
  'other',
] as const;

export type Intent = (typeof INTENTS)[number];

export const URGENCIES = ['low', 'medium', 'high', 'critical'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const PRIORITY_TIERS = ['hotspot', 'important', 'normal', 'low'] as const;
export type PriorityTier = (typeof PRIORITY_TIERS)[number];
