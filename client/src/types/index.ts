export type PriorityTier = 'hotspot' | 'urgent' | 'important' | 'normal' | 'low';
export type Category = string;
export type Intent = 'request' | 'fyi' | 'meeting_invite' | 'approval_needed' | 'complaint' | 'deadline_notice' | 'other';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type SensitivityLevel = 'conservative' | 'balanced' | 'aggressive';

export interface CustomCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  keywords: string[];
  senderDomains?: string[];
  isDefault?: boolean;
}

export interface ScoreFactorBreakdown {
  deadlineProximityScore: number;
  senderImportanceScore: number;
  actionRequirementScore: number;
  urgencyStakesScore: number;
  interactionHistoryScore: number;
  finalCalculatedScore: number;
  weightsApplied: {
    deadlineProximity: number;
    senderImportance: number;
    actionRequirement: number;
    urgencyStakes: number;
    interactionHistory: number;
  };
}

export interface Email {
  id: string;
  userId: string;
  externalId?: string;
  provider: 'gmail' | 'outlook' | 'simulated' | 'telegram';
  sender: string;
  senderName?: string;
  recipient: string;
  subject: string;
  bodySnippet: string;
  bodyFull?: string;
  receivedAt: string;
  category: Category;
  intent: Intent;
  urgency: Urgency;
  requiresAction: boolean;
  deadline?: string | null;
  actionSummary?: string | null;
  priorityScore: number;
  priorityTier: PriorityTier;
  reasoning: string;
  scoreBreakdown?: string | null;
  status: 'unread' | 'read' | 'archived' | 'snoozed';
  snoozedUntil?: string | null;
  snoozeReason?: string | null;
  tasks?: Task[];
  isSpam?: boolean;
  isPromotional?: boolean;
  feedbacks?: UserFeedback[];
  senderProfile?: SenderProfile;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  sourceEmailId?: string | null;
  title: string;
  description?: string | null;
  deadline?: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  sourceEmail?: {
    id: string;
    subject: string;
    sender: string;
    senderName?: string;
    priorityTier: PriorityTier;
    priorityScore: number;
  };
}

export interface SenderProfile {
  id: string;
  userId: string;
  senderEmail: string;
  senderName?: string | null;
  importanceScore: number;
  isVip: boolean;
  totalEmails: number;
  lastInteractionAt: string;
}

export interface UserFeedback {
  id: string;
  userId: string;
  emailId?: string | null;
  action: 'thumbs_up' | 'thumbs_down' | 'manual_override' | 'direct_feedback' | 'bug_report' | 'feature_request' | string;
  overrideTier?: PriorityTier | null;
  comments?: string | null;
  createdAt: string;
  email?: {
    id: string;
    subject: string;
    sender: string;
    senderName?: string | null;
    priorityScore: number;
    priorityTier: string;
    category?: string;
    receivedAt?: string;
  } | null;
}

export interface DailyBriefData {
  timestamp: string;
  headline: string;
  summaryStats: {
    hotspotsCount: number;
    importantCount: number;
    deadlines24hCount: number;
    actionRequiredCount: number;
    pendingApprovalsCount: number;
    totalActiveCount: number;
  };
  topHighlights: {
    id: string;
    subject: string;
    sender: string;
    priorityScore: number;
    priorityTier: PriorityTier;
    deadline?: string | null;
    actionSummary: string;
    reasoning: string;
  }[];
  categoryBreakdown: Record<string, number>;
}

export interface SystemSettings {
  id: string;
  email: string;
  name: string;
  sensitivity: SensitivityLevel;
  sensitivityThresholds: {
    hotspot: number;
    important: number;
    normal: number;
  };
  allThresholds: Record<SensitivityLevel, { hotspot: number; important: number; normal: number }>;
  hasApiKey: boolean;
  preferences: Record<string, any>;
}

export interface SimulationPreset {
  id: string;
  name: string;
  sender: string;
  senderName: string;
  subject: string;
  bodySnippet: string;
  bodyFull: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  role?: 'admin' | 'user';
  sensitivity?: SensitivityLevel;
  preferences?: Record<string, any> | string;
  hasGoogleOAuth?: boolean;
  createdAt?: string;
  _count?: {
    emails: number;
    tasks: number;
    feedbacks?: number;
    senders?: number;
  };
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  totalEmails: number;
  totalTasks: number;
  totalFeedbacks: number;
  totalSenders: number;
  satisfactionRate: number;
  priorityBreakdown: {
    hotspots: number;
    important: number;
    normal: number;
    low: number;
  };
  feedbackBreakdown: {
    thumbsUp: number;
    thumbsDown: number;
    manualOverride: number;
  };
  trafficSources: {
    telegram: number;
    simulated: number;
    realMailbox: number;
  };
  categoryBreakdown: Record<string, number>;
  apiUsage: {
    totalCalls: number;
    geminiCalls: number;
    scraperCalls: number;
    avgLatencyMs: number;
    estimatedTokens: number;
    successRate: number;
    activeEndpoints: number;
  };
  systemHealth: {
    database: string;
    queueStatus: string;
    geminiApiKey: string;
    uptime: string;
    serverUptimeSeconds: number;
  };
}

export interface AdminFeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  emailId?: string | null;
  emailSubject: string;
  emailSender: string;
  emailSenderName?: string | null;
  originalTier: string;
  emailCategory: string;
  action: 'thumbs_up' | 'thumbs_down' | 'manual_override' | 'direct_feedback' | 'bug_report' | 'feature_request' | string;
  overrideTier?: string | null;
  comments?: string | null;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  sensitivity: string;
  createdAt: string;
  emailsCount: number;
  tasksCount: number;
  feedbackCount: number;
  sendersCount: number;
}

export interface AdminApiLogItem {
  service: string;
  endpoint: string;
  method: string;
  totalCalls: number;
  avgLatencyMs: number;
  errorRate: string;
  status: string;
  tokensEstimated: number;
}

