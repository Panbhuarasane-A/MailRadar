import {
  Email,
  Task,
  SenderProfile,
  DailyBriefData,
  SystemSettings,
  SimulationPreset,
  PriorityTier,
  SensitivityLevel,
  UserProfile,
  CustomCategory,
  AdminDashboardMetrics,
  AdminFeedbackItem,
  AdminUserItem,
  AdminApiLogItem,
  UserFeedback,
} from '../types';

const API_BASE = '/api';

// Manage active user locally
export const authStorage = {
  getActiveUserEmail(): string {
    return localStorage.getItem('mailhinge_user_email') || localStorage.getItem('mailradar_user_email') || '';
  },
  setActiveUserEmail(email: string) {
    if (!email) {
      localStorage.removeItem('mailhinge_user_email');
      localStorage.removeItem('mailradar_user_email');
    } else {
      localStorage.setItem('mailhinge_user_email', email.toLowerCase().trim());
      localStorage.setItem('mailradar_user_email', email.toLowerCase().trim());
    }
  },
  getActiveTheme(): 'dark' | 'light' {
    const t = localStorage.getItem('mailhinge_theme') || localStorage.getItem('mailradar_theme');
    return (t as 'dark' | 'light') || 'dark';
  },
  setActiveTheme(theme: 'dark' | 'light') {
    localStorage.setItem('mailhinge_theme', theme);
    localStorage.setItem('mailradar_theme', theme);
  },
  clearActiveUserEmail() {
    localStorage.removeItem('mailhinge_user_email');
    localStorage.removeItem('mailradar_user_email');
  },
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

async function customFetch(input: string, init?: RequestInit, isRetry = false): Promise<Response> {
  const activeEmail = authStorage.getActiveUserEmail();
  const headers = new Headers(init?.headers || {});
  if (activeEmail) {
    headers.set('x-user-email', activeEmail);
  }

  // Attach Double-Submit CSRF Token on mutating requests
  const method = (init?.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const xsrfToken = getCookie('XSRF-TOKEN');
    if (xsrfToken) {
      headers.set('x-xsrf-token', xsrfToken);
    }
  }

  const response = await fetch(input, {
    ...init,
    credentials: 'include', // Automatically send and receive HttpOnly cookies
    headers,
  });

  // If 401 occurs on authenticated endpoints, attempt silent token refresh once
  if (
    response.status === 401 &&
    !input.includes('/auth/login') &&
    !input.includes('/auth/register') &&
    !input.includes('/auth/refresh') &&
    !isRetry
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'x-xsrf-token': getCookie('XSRF-TOKEN') || '',
          },
        });
        isRefreshing = false;
        if (refreshRes.ok) {
          onRefreshed(true);
          return customFetch(input, init, true);
        } else {
          onRefreshed(false);
        }
      } catch {
        isRefreshing = false;
        onRefreshed(false);
      }
    } else {
      return new Promise<Response>((resolve) => {
        refreshSubscribers.push((success) => {
          if (success) {
            resolve(customFetch(input, init, true));
          } else {
            resolve(response);
          }
        });
      });
    }
  }

  return response;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `HTTP error ${res.status}`);
  }
  return json.data;
}

export const api = {
  // Auth & User Management
  async getAuthMe(): Promise<{ user: UserProfile; availableUsers: UserProfile[] }> {
    const res = await customFetch(`${API_BASE}/auth/me`);
    return handleResponse<{ user: UserProfile; availableUsers: UserProfile[] }>(res);
  },

  async login(email: string, password?: string, name?: string): Promise<{ user: UserProfile; availableUsers: UserProfile[] }> {
    const res = await customFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await handleResponse<{ user: UserProfile; availableUsers: UserProfile[] }>(res);
    if (data.user?.email) {
      authStorage.setActiveUserEmail(data.user.email);
    }
    return data;
  },

  async register(data: {
    email: string;
    name?: string;
    password?: string;
    initialChannels?: string[];
    mailboxConfig?: any;
  }): Promise<{ user: UserProfile; availableUsers: UserProfile[] }> {
    const res = await customFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const resData = await handleResponse<{ user: UserProfile; availableUsers: UserProfile[] }>(res);
    if (resData.user?.email) {
      authStorage.setActiveUserEmail(resData.user.email);
    }
    return resData;
  },

  async logout(): Promise<void> {
    try {
      await customFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // Ignore logout network errors
    } finally {
      authStorage.clearActiveUserEmail();
    }
  },

  async getCSRFToken(): Promise<string | null> {
    try {
      const res = await customFetch(`${API_BASE}/auth/csrf`);
      const data = await handleResponse<{ csrfToken: string }>(res);
      return data.csrfToken;
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<UserProfile[]> {
    const res = await customFetch(`${API_BASE}/auth/users`);
    return handleResponse<UserProfile[]>(res);
  },

  async updatePreferences(preferences: {
    theme?: 'dark' | 'light';
    dailyBriefTime?: string;
    soundAlerts?: boolean;
    savedTelegramChannels?: string[];
    connectedMailbox?: any;
    customCategories?: CustomCategory[];
  }): Promise<any> {
    const res = await customFetch(`${API_BASE}/auth/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    return handleResponse(res);
  },

  async updateProfile(data: { name?: string; sensitivity?: string; password?: string }): Promise<any> {
    const res = await customFetch(`${API_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteAccount(): Promise<any> {
    const res = await customFetch(`${API_BASE}/auth/account`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async syncAllForUser(mailboxPassword?: string): Promise<{
    syncedAt: string;
    mailboxResult?: any;
    telegramResults?: any[];
    totalEmails: number;
    unreadEmails: number;
  }> {
    const res = await customFetch(`${API_BASE}/auth/sync-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mailboxPassword }),
    });
    return handleResponse(res);
  },

  // Google OAuth 2.0 & Gmail API
  async getGoogleAuthStatus(): Promise<{
    isConfigured: boolean;
    authUrl: string;
    clientId: string | null;
    redirectUri: string;
  }> {
    const res = await customFetch(`${API_BASE}/auth/google/url`);
    return handleResponse(res);
  },

  async configureGoogleOAuth(clientId: string, clientSecret: string): Promise<{
    isConfigured: boolean;
    authUrl: string;
    clientId: string | null;
    redirectUri: string;
  }> {
    const res = await customFetch(`${API_BASE}/auth/google/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    return handleResponse(res);
  },

  async syncGmailOAuth(limit: number = 25): Promise<{
    syncedCount: number;
    newCount: number;
    message: string;
  }> {
    const res = await customFetch(`${API_BASE}/auth/google/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });
    return handleResponse(res);
  },

  // Telegram Job Channels
  async getTelegramChannels(): Promise<string[]> {
    const res = await customFetch(`${API_BASE}/telegram/channels`);
    return handleResponse<string[]>(res);
  },

  async syncTelegramChannel(channelLink: string, limit: number = 20): Promise<{
    channelHandle: string;
    channelTitle: string;
    totalScraped: number;
    newIngested: number;
    message: string;
  }> {
    const res = await customFetch(`${API_BASE}/telegram/channel/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelLink, limit }),
    });
    return handleResponse(res);
  },

  async syncAllTelegramChannels(): Promise<any[]> {
    const res = await customFetch(`${API_BASE}/telegram/channel/sync-all`, {
      method: 'POST',
    });
    return handleResponse<any[]>(res);
  },

  async removeTelegramChannel(channelHandle: string): Promise<string[]> {
    const res = await customFetch(`${API_BASE}/telegram/channel`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelHandle }),
    });
    return handleResponse<string[]>(res);
  },

  async ingestTelegramJob(channelName: string, messageText: string, postUrl?: string): Promise<any> {
    const res = await customFetch(`${API_BASE}/telegram/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelName, messageText, postUrl }),
    });
    return handleResponse(res);
  },

  async verifyAllJobs(): Promise<any> {
    const res = await customFetch(`${API_BASE}/telegram/verify-all`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async crawlDeadline(url: string, emailId?: string): Promise<any> {
    const res = await customFetch(`${API_BASE}/telegram/crawl-deadline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, emailId }),
    });
    return handleResponse(res);
  },

  async resolveLink(url: string, emailId?: string): Promise<any> {
    const res = await customFetch(`${API_BASE}/telegram/resolve-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, emailId }),
    });
    return handleResponse(res);
  },

  // Emails
  async getEmails(params?: { tier?: string; status?: string; category?: string; search?: string }): Promise<Email[]> {
    const query = new URLSearchParams();
    if (params?.tier) query.append('tier', params.tier);
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    const res = await customFetch(`${API_BASE}/emails?${query.toString()}`);
    return handleResponse<Email[]>(res);
  },

  async getEmailById(id: string): Promise<Email> {
    const res = await customFetch(`${API_BASE}/emails/${id}`);
    return handleResponse<Email>(res);
  },

  async updateEmailStatus(id: string, status: 'unread' | 'read' | 'archived'): Promise<void> {
    const res = await customFetch(`${API_BASE}/emails/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async updateEmailCategory(id: string, category: string): Promise<Email> {
    const res = await customFetch(`${API_BASE}/emails/${id}/category`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    return handleResponse<Email>(res);
  },

  async snoozeEmail(id: string, snoozedUntil: string, snoozeReason?: string): Promise<Email> {
    const res = await customFetch(`${API_BASE}/emails/${id}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snoozedUntil, snoozeReason }),
    });
    return handleResponse<Email>(res);
  },

  async unsnoozeEmail(id: string): Promise<Email> {
    const res = await customFetch(`${API_BASE}/emails/${id}/unsnooze`, {
      method: 'POST',
    });
    return handleResponse<Email>(res);
  },

  async deleteEmail(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await customFetch(`${API_BASE}/emails/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; message?: string }>(res);
  },

  // Tasks (Action Center)
  async getTasks(status?: string): Promise<Task[]> {
    const query = status ? `?status=${status}` : '';
    const res = await customFetch(`${API_BASE}/tasks${query}`);
    return handleResponse<Task[]>(res);
  },

  async createTask(task: {
    title: string;
    description?: string;
    deadline?: string | null;
    priority?: string;
    sourceEmailId?: string;
  }): Promise<Task> {
    const res = await customFetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return handleResponse<Task>(res);
  },

  async updateTaskStatus(id: string, status: 'todo' | 'in_progress' | 'done'): Promise<void> {
    const res = await customFetch(`${API_BASE}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const res = await customFetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Task>(res);
  },

  async deleteTask(id: string): Promise<void> {
    const res = await customFetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Daily Brief
  async getDailyBrief(): Promise<DailyBriefData> {
    const res = await customFetch(`${API_BASE}/daily-brief`);
    return handleResponse<DailyBriefData>(res);
  },

  // Senders & VIP
  async getSenders(vipOnly?: boolean, search?: string): Promise<SenderProfile[]> {
    const query = new URLSearchParams();
    if (vipOnly) query.append('vipOnly', 'true');
    if (search) query.append('search', search);

    const res = await customFetch(`${API_BASE}/senders?${query.toString()}`);
    return handleResponse<SenderProfile[]>(res);
  },

  async toggleVip(senderEmail: string, isVip: boolean): Promise<SenderProfile> {
    const res = await customFetch(`${API_BASE}/senders/vip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderEmail, isVip }),
    });
    return handleResponse<SenderProfile>(res);
  },

  // Feedback
  async submitFeedback(
    emailId?: string | null,
    action: 'thumbs_up' | 'thumbs_down' | 'manual_override' | 'direct_feedback' | 'bug_report' | 'feature_request' | string = 'direct_feedback',
    overrideTier?: PriorityTier,
    comments?: string,
    extra?: { subject?: string; category?: string }
  ): Promise<void> {
    const res = await customFetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: emailId || undefined,
        action,
        overrideTier,
        comments,
        subject: extra?.subject,
        category: extra?.category,
      }),
    });
    return handleResponse(res);
  },

  async sendFeedbackToAdmin(data: {
    category: 'general' | 'bug_report' | 'feature_request' | 'accuracy_issue' | 'other';
    subject: string;
    message: string;
    rating?: number;
    emailId?: string;
  }): Promise<any> {
    const res = await customFetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: data.emailId || undefined,
        action: data.category === 'bug_report' ? 'bug_report' : data.category === 'feature_request' ? 'feature_request' : 'direct_feedback',
        subject: data.subject,
        category: data.category,
        comments: data.rating ? `[Rating: ${data.rating}/5 stars] ${data.message}` : data.message,
      }),
    });
    return handleResponse(res);
  },

  async getUserFeedbacks(): Promise<UserFeedback[]> {
    const res = await customFetch(`${API_BASE}/feedback`);
    return handleResponse<UserFeedback[]>(res);
  },

  async deleteFeedback(id: string): Promise<void> {
    const res = await customFetch(`${API_BASE}/feedback/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Real Mailbox (Gmail, Outlook, IMAP)
  async getMailboxStatus(): Promise<{ connected: boolean; connectedMailbox: any; totalRealEmails: number }> {
    const res = await customFetch(`${API_BASE}/mailbox/status`);
    return handleResponse(res);
  },

  async testMailboxConnection(data: {
    email: string;
    password: string;
    host?: string;
    port?: number;
    provider?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await customFetch(`${API_BASE}/mailbox/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async syncRealMailbox(data: {
    email: string;
    password: string;
    host?: string;
    port?: number;
    provider?: string;
    limit?: number;
  }): Promise<{ syncedCount: number; newCount: number; message: string }> {
    const res = await customFetch(`${API_BASE}/mailbox/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await customFetch(`${API_BASE}/settings`);
    return handleResponse<SystemSettings>(res);
  },

  async updateSensitivity(sensitivity: SensitivityLevel): Promise<{ sensitivity: SensitivityLevel; thresholds: any }> {
    const res = await customFetch(`${API_BASE}/settings/sensitivity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensitivity }),
    });
    return handleResponse(res);
  },

  // Ingestion Simulator & Sync
  async getPresets(): Promise<SimulationPreset[]> {
    const res = await customFetch(`${API_BASE}/sync/presets`);
    return handleResponse<SimulationPreset[]>(res);
  },

  async simulateEmail(presetId?: string, customEmail?: any): Promise<Email> {
    const res = await customFetch(`${API_BASE}/sync/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId, customEmail }),
    });
    return handleResponse<Email>(res);
  },

  async triggerSync(): Promise<{ syncedAt: string; unreadCount: number }> {
    const res = await customFetch(`${API_BASE}/sync/trigger`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Admin Intelligence Dashboard & Feedback Review Hub
  async getAdminMetrics(): Promise<AdminDashboardMetrics> {
    const res = await customFetch(`${API_BASE}/admin/metrics`);
    return handleResponse<AdminDashboardMetrics>(res);
  },

  async getAdminFeedbacks(): Promise<AdminFeedbackItem[]> {
    const res = await customFetch(`${API_BASE}/admin/feedbacks`);
    return handleResponse<AdminFeedbackItem[]>(res);
  },

  async getAdminUsers(): Promise<AdminUserItem[]> {
    const res = await customFetch(`${API_BASE}/admin/users`);
    return handleResponse<AdminUserItem[]>(res);
  },

  async getAdminApiUsage(): Promise<AdminApiLogItem[]> {
    const res = await customFetch(`${API_BASE}/admin/api-usage`);
    return handleResponse<AdminApiLogItem[]>(res);
  },
};
