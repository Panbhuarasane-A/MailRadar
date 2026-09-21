import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Email,
  Task,
  SenderProfile,
  DailyBriefData,
  SystemSettings,
  TaskStatus,
  SensitivityLevel,
  UserProfile,
  CustomCategory,
} from './types';
import { api, authStorage } from './services/api';
import { useTheme } from './hooks/useTheme';
import { TopNav, AppSection } from './components/layout/TopNav';
import { MailSidebar, MailView, MailPriorityFilter } from './components/layout/MailSidebar';
import { TelegramSidebar, TelegramPriorityFilter } from './components/layout/TelegramSidebar';
import { MailDashboard } from './components/mail/MailDashboard';
import { TelegramDashboard } from './components/telegram/TelegramDashboard';
import { ActionCenter } from './components/action-center/ActionCenter';
import { DailyBriefView } from './components/daily-brief/DailyBriefView';
import { SenderListView } from './components/senders/SenderListView';
import { SettingsView } from './components/settings/SettingsView';
import { EmailDetailPage } from './components/email-detail/EmailDetailPage';
import { SnoozeModal } from './components/hotspot/SnoozeModal';
import { ConnectMailboxModal } from './components/mailbox/ConnectMailboxModal';
import { TelegramIngestModal } from './components/telegram/TelegramIngestModal';
import { ManageCategoriesModal } from './components/mail/ManageCategoriesModal';
import { LoginModal } from './components/auth/LoginModal';
import { AuthPage } from './components/auth/AuthPage';
import { TutorialTourModal } from './components/tutorial/TutorialTourModal';
import { DayWiseTodoView } from './components/tools/DayWiseTodoView';
import { HabitTrackerView } from './components/tools/HabitTrackerView';
import { PomodoroTimerView } from './components/tools/PomodoroTimerView';
import { CallSheetView } from './components/tools/CallSheetView';
import { DeadlineCalendarView } from './components/tools/DeadlineCalendarView';
import { FeedbackView } from './components/feedback/FeedbackView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { PublicLegalPage } from './components/legal/PublicLegalPage';
import { MailCategoryType, classifyMailCategory, DEFAULT_CUSTOM_CATEGORIES } from './utils/categoryClassifier';

export const App: React.FC = () => {
  // Check if viewing public legal/privacy route
  const [isLegalPage, setIsLegalPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      return p === '/privacy' || p === '/terms' || p === '/legal' || p === '/compliance';
    }
    return false;
  });
  // Theme state
  const { theme, toggleTheme, setTheme } = useTheme();

  // Active User Authentication & Profiles
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthPageOpen, setIsAuthPageOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = authStorage.getActiveUserEmail();
      const params = new URLSearchParams(window.location.search);
      const isGoogleCallback = params.get('google_auth_success') === 'true';
      return !savedEmail && !isGoogleCallback;
    }
    return false;
  });
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Navigation State
  const [currentSection, setCurrentSection] = useState<AppSection>('mail');
  const [mailView, setMailView] = useState<MailView>('inbox');
  const [mailCategory, setMailCategory] = useState<'all' | MailCategoryType>('all');
  const [mailPriorityFilter, setMailPriorityFilter] = useState<MailPriorityFilter>('all');

  const [selectedTelegramChannel, setSelectedTelegramChannel] = useState<string | null>(null);
  const [telegramPriorityFilter, setTelegramPriorityFilter] = useState<TelegramPriorityFilter>('all');

  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [emails, setEmails] = useState<Email[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [senders, setSenders] = useState<SenderProfile[]>([]);
  const [dailyBrief, setDailyBrief] = useState<DailyBriefData | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [savedChannelHandles, setSavedChannelHandles] = useState<string[]>([]);

  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingBrief, setIsLoadingBrief] = useState(true);
  const [isLoadingSenders, setIsLoadingSenders] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals & Active Email Detail Page
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [snoozeTargetEmail, setSnoozeTargetEmail] = useState<Email | null>(null);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [isConnectMailboxOpen, setIsConnectMailboxOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  // Active User Custom Categories (derived from user.preferences)
  const customCategories: CustomCategory[] = useMemo(() => {
    try {
      if (currentUser?.preferences) {
        const prefs =
          typeof currentUser.preferences === 'string'
            ? JSON.parse(currentUser.preferences)
            : currentUser.preferences;
        if (Array.isArray(prefs.customCategories) && prefs.customCategories.length > 0) {
          // Filter out legacy "others" / "other"
          const list: CustomCategory[] = prefs.customCategories.filter(
            (c: CustomCategory) => c.id !== 'others' && c.id !== 'other'
          );

          // Ensure Carrier and Password Reset & OTP exist
          const hasCareers = list.some(
            (c) => c.id === 'careers' || c.id === 'carrier' || c.name.toLowerCase() === 'carrier' || c.name.toLowerCase() === 'careers'
          );
          if (!hasCareers) {
            const defaultCareers = DEFAULT_CUSTOM_CATEGORIES.find((c) => c.id === 'careers');
            if (defaultCareers) list.unshift(defaultCareers);
          }

          const hasOtp = list.some(
            (c) => c.id === 'otp_security' || c.id === 'otp' || c.name.toLowerCase().includes('otp') || c.name.toLowerCase().includes('password')
          );
          if (!hasOtp) {
            const defaultOtp = DEFAULT_CUSTOM_CATEGORIES.find((c) => c.id === 'otp_security');
            if (defaultOtp) list.push(defaultOtp);
          }

          if (list.length > 0) {
            return list;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing user customCategories:', e);
    }
    return DEFAULT_CUSTOM_CATEGORIES;
  }, [currentUser?.preferences]);

  // Data Fetchers
  const loadEmails = useCallback(async () => {
    try {
      setIsLoadingEmails(true);
      const res = await api.getEmails();
      setEmails(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setIsLoadingEmails(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoadingTasks(true);
      const res = await api.getTasks();
      setTasks(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  const loadBrief = useCallback(async () => {
    try {
      setIsLoadingBrief(true);
      const res = await api.getDailyBrief();
      setDailyBrief(res);
    } catch (err) {
      console.error('Failed to load daily brief:', err);
    } finally {
      setIsLoadingBrief(false);
    }
  }, []);

  const loadSenders = useCallback(async () => {
    try {
      setIsLoadingSenders(true);
      const res = await api.getSenders();
      setSenders(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err) {
      console.error('Failed to load senders:', err);
    } finally {
      setIsLoadingSenders(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      setSettings(res);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const loadSavedChannels = useCallback(async () => {
    try {
      const channels = await api.getTelegramChannels();
      if (Array.isArray(channels)) {
        setSavedChannelHandles(channels);
      }
    } catch (err) {
      console.error('Failed to load telegram channels:', err);
    }
  }, []);

  // User Profile & Multi-Account loader
  const loadAuthUser = useCallback(async () => {
    try {
      const activeEmail = authStorage.getActiveUserEmail();
      if (!activeEmail) {
        setIsAuthPageOpen(true);
        return;
      }
      const res = await api.getAuthMe();
      if (res?.user) {
        setCurrentUser(res.user);
        authStorage.setActiveUserEmail(res.user.email);
        setIsAuthPageOpen(false);
        if (res.user.role === 'admin' || res.user.email?.toLowerCase().includes('admin')) {
          setCurrentSection('admin');
        }
      } else {
        setIsAuthPageOpen(true);
      }
      if (Array.isArray(res?.availableUsers)) {
        setAvailableUsers(res.availableUsers);
      }
    } catch (err) {
      console.error('Failed to load user info:', err);
    }
  }, []);

  const handleSwitchUser = async (email: string, password?: string, name?: string) => {
    try {
      setIsSyncing(true);
      const res = await api.login(email, password, name);
      if (res?.user) {
        setCurrentUser(res.user);
        setAvailableUsers(res.availableUsers || []);
        if (res.user.role === 'admin' || res.user.email?.toLowerCase().includes('admin')) {
          setCurrentSection('admin');
        } else {
          setCurrentSection('mail');
        }
      }
      await refreshAll();
    } catch (err) {
      console.error('Failed to switch user:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setIsAuthPageOpen(true);
  };

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    await Promise.allSettled([
      loadAuthUser(),
      loadEmails(),
      loadTasks(),
      loadBrief(),
      loadSenders(),
      loadSettings(),
      loadSavedChannels(),
    ]);
    setIsSyncing(false);
  }, [loadAuthUser, loadEmails, loadTasks, loadBrief, loadSenders, loadSettings, loadSavedChannels]);

  const [authToast, setAuthToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Check if redirected from Google OAuth
    const params = new URLSearchParams(window.location.search);
    const googleSuccess = params.get('google_auth_success');
    const authError = params.get('auth_error');
    const authEmail = params.get('email');
    const authName = params.get('name');

    if (googleSuccess === 'true' && authEmail) {
      authStorage.setActiveUserEmail(authEmail);
      setIsAuthPageOpen(false);
      setIsLoginModalOpen(false);
      setIsConnectMailboxOpen(false);
      setAuthToast({
        type: 'success',
        message: `Successfully authenticated with Google as ${authName || authEmail}! Gmail sync started.`,
      });
      // Clean up query string
      window.history.replaceState({}, document.title, window.location.pathname);
      refreshAll();
      setTimeout(() => setAuthToast(null), 5000);
    } else if (authError) {
      setAuthToast({
        type: 'error',
        message: `Google Authentication Error: ${authError}`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setAuthToast(null), 6000);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Sync active email detail with URL hash for browser back/forward support
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#email/')) {
        const id = hash.replace('#email/', '');
        const found = emails.find((e) => e.id === id);
        if (found) {
          setSelectedEmail(found);
          return;
        }
      }
      // If hash was removed or navigated back
      if (!hash || !hash.startsWith('#email/')) {
        setSelectedEmail(null);
      }
    };

    handleHashChange();
    window.addEventListener('popstate', handleHashChange);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handleHashChange);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [emails]);

  // Enforce Admin Dashboard for Admin Role
  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.email?.toLowerCase().includes('admin')) {
      setCurrentSection('admin');
    }
  }, [currentUser]);

  // First-Time User Onboarding Tutorial Auto-Trigger (Only for non-admin users)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && !currentUser.email?.toLowerCase().includes('admin')) {
      const userKey = currentUser.email || 'guest';
      const seen = localStorage.getItem(`mailo_tutorial_seen_${userKey}`);
      if (!seen) {
        const timer = setTimeout(() => {
          setIsTutorialOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  // Unified Synchronization
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await api.syncAllForUser();
      await refreshAll();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStatusChange = async (emailId: string, status: 'read' | 'unread' | 'archived') => {
    try {
      await api.updateEmailStatus(emailId, status);
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, status } : e))
      );
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      console.error('Failed to update email status:', err);
    }
  };

  const handleUpdateEmailCategory = async (emailId: string, category: string) => {
    try {
      await api.updateEmailCategory(emailId, category);
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, category } : e))
      );
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail((prev) => (prev ? { ...prev, category } : null));
      }
    } catch (err) {
      console.error('Failed to update email category:', err);
    }
  };

  const handleSaveCategories = async (newCategories: CustomCategory[]) => {
    try {
      await api.updatePreferences({ customCategories: newCategories });
      // Update local currentUser state
      setCurrentUser((prev) => {
        if (!prev) return null;
        let currentPrefs: any = {};
        try {
          currentPrefs = typeof prev.preferences === 'string' ? JSON.parse(prev.preferences) : (prev.preferences || {});
        } catch {}
        return {
          ...prev,
          preferences: {
            ...currentPrefs,
            customCategories: newCategories,
          },
        };
      });

      // If current category filter is not in the new category list, reset filter to 'all'
      if (mailCategory !== 'all' && !newCategories.some((c) => c.id === mailCategory)) {
        setMailCategory('all');
      }
    } catch (err) {
      console.error('Failed to save categories:', err);
      throw err;
    }
  };

  const handleOpenSnooze = (email: Email) => {
    setSnoozeTargetEmail(email);
    setIsSnoozeModalOpen(true);
  };

  const handleConfirmSnooze = async (emailId: string, snoozedUntil: string, reason: string) => {
    try {
      await api.snoozeEmail(emailId, snoozedUntil, reason);
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId ? { ...e, status: 'snoozed', snoozedUntil, snoozeReason: reason } : e
        )
      );
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail((prev) => (prev ? { ...prev, status: 'snoozed', snoozedUntil, snoozeReason: reason } : null));
      }
      setIsSnoozeModalOpen(false);
      setSnoozeTargetEmail(null);
    } catch (err) {
      console.error('Failed to snooze email:', err);
    }
  };

  const handleFeedback = async (emailId: string, action: 'thumbs_up' | 'thumbs_down') => {
    try {
      await api.submitFeedback(emailId, action);
      const scoreAdjustment = action === 'thumbs_up' ? 2 : -10;
      setEmails((prev) =>
        prev.map((e) => {
          if (e.id === emailId) {
            const newScore = Math.max(0, Math.min(100, e.priorityScore + scoreAdjustment));
            return { ...e, priorityScore: newScore };
          }
          return e;
        })
      );
      if (selectedEmail && selectedEmail.id === emailId) {
        const newScore = Math.max(0, Math.min(100, selectedEmail.priorityScore + scoreAdjustment));
        setSelectedEmail((prev) => (prev ? { ...prev, priorityScore: newScore } : null));
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    // 1. Instant optimistic local UI update (0ms latency)
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    setTasks((prev) => prev.filter((t) => t.sourceEmailId !== emailId));
    setDailyBrief((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        topHighlights: prev.topHighlights.filter((h) => h.id !== emailId),
        summaryStats: {
          ...prev.summaryStats,
          hotspotsCount: Math.max(0, prev.summaryStats.hotspotsCount - 1),
          totalActiveCount: Math.max(0, prev.summaryStats.totalActiveCount - 1),
        },
      };
    });
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail(null);
      if (window.location.hash.startsWith('#email/')) {
        window.history.pushState({}, '', window.location.pathname + window.location.search);
      }
    }

    // 2. Perform background API call
    try {
      await api.deleteEmail(emailId);
    } catch (err) {
      console.error('Failed to delete email on server:', err);
      refreshAll();
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, targetStatus: TaskStatus) => {
    // 1. Instant optimistic local UI update (0ms latency)
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    // 2. Perform background server update
    try {
      await api.updateTaskStatus(taskId, targetStatus);
    } catch (err) {
      console.error('Failed to update task status on server:', err);
      loadTasks();
    }
  };

  const handleCreateTask = async (taskData: {
    title: string;
    description?: string;
    deadline?: string | null;
    priority?: string;
  }) => {
    try {
      const res = await api.createTask(taskData);
      setTasks((prev) => [res, ...prev]);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // 1. Instant optimistic local UI removal (0ms latency)
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    // 2. Perform background server deletion
    try {
      await api.deleteTask(taskId);
    } catch (err) {
      console.error('Failed to delete task on server:', err);
      loadTasks();
    }
  };

  const handleToggleVip = async (senderEmail: string, isVip: boolean) => {
    try {
      await api.toggleVip(senderEmail, isVip);
      setSenders((prev) =>
        prev.map((s) => (s.senderEmail === senderEmail ? { ...s, isVip } : s))
      );
    } catch (err) {
      console.error('Failed to toggle VIP status:', err);
    }
  };

  const handleUpdateSensitivity = async (level: SensitivityLevel) => {
    try {
      await api.updateSensitivity(level);
      await refreshAll();
    } catch (err) {
      console.error('Failed to update sensitivity:', err);
    }
  };

  const handleOpenEmail = (email: Email) => {
    setSelectedEmail(email);
    window.history.pushState({ emailId: email.id }, '', `#email/${email.id}`);
  };

  const handleCloseEmail = () => {
    setSelectedEmail(null);
    if (window.location.hash.startsWith('#email/')) {
      window.history.pushState({}, '', window.location.pathname + window.location.search);
    }
  };

  const handleSelectEmailById = (id: string) => {
    const found = emails.find((e) => e.id === id);
    if (found) {
      handleOpenEmail(found);
    }
  };

  const handleGoToDashboard = () => {
    if (currentUser?.role === 'admin' || currentUser?.email?.toLowerCase().includes('admin')) {
      setCurrentSection('admin');
    } else {
      setCurrentSection('mail');
      setMailView('inbox');
    }
    setMailCategory('all');
    setMailPriorityFilter('all');
    setTelegramPriorityFilter('all');
    setSelectedTelegramChannel(null);
    setSearchQuery('');
    handleCloseEmail();
  };

  const handleRemoveTelegramChannel = async (handle: string) => {
    // Optimistic local UI update (0ms)
    setSavedChannelHandles((prev) => prev.filter((h) => h.toLowerCase() !== handle.toLowerCase()));
    setEmails((prev) =>
      prev.filter(
        (e) =>
          e.provider !== 'telegram' ||
          (!e.sender.toLowerCase().includes(handle.toLowerCase()) &&
            !e.senderName?.toLowerCase().includes(handle.toLowerCase()))
      )
    );
    if (selectedTelegramChannel?.toLowerCase() === handle.toLowerCase()) {
      setSelectedTelegramChannel(null);
    }
    try {
      const updated = await api.removeTelegramChannel(handle);
      if (Array.isArray(updated)) {
        setSavedChannelHandles(updated);
      }
    } catch (err) {
      console.error('Failed to remove channel:', err);
    }
  };

  // Compute live Mail and Telegram email sets
  const mailEmails = useMemo(() => emails.filter((e) => e.provider !== 'telegram'), [emails]);
  const telegramEmails = useMemo(() => emails.filter((e) => e.provider === 'telegram'), [emails]);

  // Compute live dynamic Category counts
  const categoryCounts = useMemo(() => {
    const countsMap: Record<string, number> = {};
    customCategories.forEach((c) => {
      countsMap[c.id] = 0;
    });

    mailEmails.forEach((e) => {
      const cat = classifyMailCategory(e, customCategories);
      countsMap[cat] = (countsMap[cat] || 0) + 1;
    });

    return countsMap;
  }, [mailEmails, customCategories]);

  const mailCounts = useMemo(() => {
    let urgent = 0;
    let important = 0;
    let normal = 0;
    let low = 0;

    mailEmails.forEach((e) => {
      const isUrgent = e.priorityTier === 'hotspot' || e.priorityTier === 'urgent';
      const isImportant = e.priorityTier === 'important';
      const isNormal = e.priorityTier === 'normal';
      const isLow = e.priorityTier === 'low';

      if (isUrgent) urgent++;
      if (isImportant) important++;
      if (isNormal) normal++;
      if (isLow) low++;
    });

    return {
      total: mailEmails.length,
      urgent,
      important,
      normal,
      low,
      tasks: tasks.filter((t) => t.status !== 'done').length,
      vips: senders.filter((s) => s.isVip).length,
    };
  }, [mailEmails, tasks, senders]);

  // Compute live Telegram counts & per-channel stats
  const telegramCounts = useMemo(() => {
    let urgent = 0;
    let important = 0;
    let normal = 0;
    let low = 0;
    let liveCrawlActive = 0;

    telegramEmails.forEach((m) => {
      if (m.priorityTier === 'hotspot' || m.priorityTier === 'urgent') urgent++;
      else if (m.priorityTier === 'important') important++;
      else if (m.priorityTier === 'normal') normal++;
      else low++;
    });

    return {
      total: telegramEmails.length,
      urgent,
      important,
      normal,
      low,
    };
  }, [telegramEmails]);

  // Build connected channels with dynamic message counts
  const savedChannelsWithStats = useMemo(() => {
    const rawHandles = [
      ...savedChannelHandles,
      ...telegramEmails.map((e) => {
        const match = (e.sender || '').match(/@([a-zA-Z0-9_]+)/);
        return match ? match[1] : '';
      }).filter(Boolean),
    ];

    const cleanHandles = Array.from(
      new Set(
        rawHandles
          .map((h) => {
            let clean = h.replace(/^@+/, '').trim();
            const tmeMatch = clean.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/(?:s\/)?([a-zA-Z0-9_+]+)/i);
            if (tmeMatch && tmeMatch[1]) return tmeMatch[1].trim();
            clean = clean
              .replace(/^https?:\/\//i, '')
              .replace(/^t\.me\/(s\/)?/i, '')
              .replace(/^@+/, '')
              .split('/')[0]
              .split('?')[0]
              .trim();
            return clean;
          })
          .filter((h) => h && h !== 'https' && h !== 'http')
      )
    );

    return cleanHandles.map((cleanHandle) => {
      const chEmails = telegramEmails.filter((e) =>
        (e.sender && e.sender.toLowerCase().includes(cleanHandle.toLowerCase())) ||
        (e.senderName && e.senderName.toLowerCase().includes(cleanHandle.toLowerCase())) ||
        (e.externalId && e.externalId.toLowerCase().includes(cleanHandle.toLowerCase()))
      );

      const urgentCount = chEmails.filter(
        (e) => e.priorityTier === 'hotspot' || e.priorityTier === 'urgent'
      ).length;
      const importantCount = chEmails.filter((e) => e.priorityTier === 'important').length;

      const validEmail = chEmails.find(
        (e) => e.senderName && !e.senderName.startsWith('@https') && !e.senderName.startsWith('Telegram: @https')
      );
      const firstTitle = validEmail?.senderName?.replace(/Telegram:\s*/i, '') || `@${cleanHandle}`;

      return {
        handle: cleanHandle,
        title: firstTitle,
        messageCount: chEmails.length,
        urgentCount,
        importantCount,
      };
    });
  }, [savedChannelHandles, telegramEmails]);

  // Dynamic Back Label for separate email page
  const getBackLabel = useCallback(() => {
    if (currentSection === 'telegram') {
      return selectedTelegramChannel ? `Back to @${selectedTelegramChannel}` : 'Back to Telegram Channels';
    }
    if (currentSection === 'admin') {
      return 'Back to Admin Hub';
    }
    switch (mailView) {
      case 'inbox':
        if (mailCategory !== 'all') {
          const catName = customCategories.find((c) => c.id === mailCategory)?.name || mailCategory;
          return `Back to ${catName}`;
        }
        return 'Back to Inbox';
      case 'action-center':
        return 'Back to Action Center';
      case 'daily-brief':
        return 'Back to Daily Brief';
      case 'call-sheet':
      case 'deadline-calendar':
        return 'Back to Call Sheet';
      case 'feedback':
        return 'Back to Feedback Hub';
      case 'senders':
        return 'Back to Senders';
      case 'settings':
        return 'Back to Settings';
      default:
        return 'Back to Inbox';
    }
  }, [currentSection, selectedTelegramChannel, mailView, mailCategory, customCategories]);

  // Dynamic active email list for Next/Previous navigation in separate page
  const activeEmailList = useMemo(() => {
    if (currentSection === 'telegram') {
      if (selectedTelegramChannel) {
        return telegramEmails.filter(
          (e) =>
            (e.sender && e.sender.toLowerCase().includes(selectedTelegramChannel.toLowerCase())) ||
            (e.senderName && e.senderName.toLowerCase().includes(selectedTelegramChannel.toLowerCase())) ||
            (e.externalId && e.externalId.toLowerCase().includes(selectedTelegramChannel.toLowerCase()))
        );
      }
      return telegramEmails;
    }
    if (mailView === 'inbox') {
      let list = mailEmails;
      if (mailCategory !== 'all') {
        list = list.filter((e) => classifyMailCategory(e, customCategories) === mailCategory);
      }
      if (mailPriorityFilter !== 'all') {
        list = list.filter((e) => {
          if (mailPriorityFilter === 'urgent') return e.priorityTier === 'hotspot' || e.priorityTier === 'urgent';
          return e.priorityTier === mailPriorityFilter;
        });
      }
      return list;
    }
    return emails;
  }, [currentSection, telegramEmails, selectedTelegramChannel, mailView, mailEmails, mailCategory, customCategories, mailPriorityFilter, emails]);

  if (isLegalPage) {
    return (
      <PublicLegalPage
        onBackToApp={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setIsLegalPage(false);
        }}
      />
    );
  }

  if (isAuthPageOpen) {
    return (
      <AuthPage
        currentUser={currentUser}
        availableUsers={availableUsers}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user?.email) {
            authStorage.setActiveUserEmail(user.email);
          }
          setIsAuthPageOpen(false);
          refreshAll();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 transition-colors duration-200">
      {/* 1. Main Clean Top Navigation */}
      <TopNav
        currentSection={currentSection}
        onSectionChange={(sec) => {
          setCurrentSection(sec);
          setSearchQuery('');
          handleCloseEmail();
          if (sec === 'mail') {
            setMailView('inbox');
            setMailCategory('all');
            setMailPriorityFilter('all');
          }
        }}
        onNavigateHome={handleGoToDashboard}
        mailCount={mailEmails.length}
        telegramCount={telegramEmails.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSync={handleTriggerSync}
        isSyncing={isSyncing}
        onOpenSettings={() => {
          setCurrentSection('mail');
          setMailView('settings');
          handleCloseEmail();
        }}
        onOpenConnectMailbox={() => setIsConnectMailboxOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenAuthPage={() => setIsAuthPageOpen(true)}
        onQuickSwitchUser={(email, name) => handleSwitchUser(email, undefined, name)}
        onLogout={handleLogout}
      />

      {/* Floating Auth Notification Toast */}
      {authToast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${
              authToast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/90 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}
          >
            <span>{authToast.message}</span>
            <button
              onClick={() => setAuthToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Body: Sidebar + Dynamic Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Dedicated for Mail or Telegram, hidden when reading full email detail) */}
        {!selectedEmail && currentSection === 'mail' && (
          <MailSidebar
            currentView={mailView}
            onNavigateView={(view) => {
              setMailView(view);
              handleCloseEmail();
              setIsMobileSidebarOpen(false);
            }}
            activePriorityFilter={mailPriorityFilter}
            onSelectPriorityFilter={(filter) => {
              setMailPriorityFilter(filter);
              handleCloseEmail();
            }}
            activeCategory={mailCategory}
            onSelectCategory={(cat) => {
              setMailCategory(cat);
              handleCloseEmail();
            }}
            categories={customCategories}
            categoryCounts={categoryCounts}
            onOpenManageCategories={() => setIsManageCategoriesOpen(true)}
            counts={mailCounts}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}
        {!selectedEmail && currentSection === 'telegram' && (
          <TelegramSidebar
            activePriorityFilter={telegramPriorityFilter}
            onSelectPriorityFilter={(filter) => {
              setTelegramPriorityFilter(filter);
              handleCloseEmail();
            }}
            selectedChannel={selectedTelegramChannel}
            onSelectChannel={(ch) => {
              setSelectedTelegramChannel(ch);
              handleCloseEmail();
              setIsMobileSidebarOpen(false);
            }}
            savedChannels={savedChannelsWithStats}
            counts={telegramCounts}
            onOpenAddChannel={() => setIsTelegramModalOpen(true)}
            onSyncAll={handleTriggerSync}
            isSyncing={isSyncing}
            onRemoveChannel={handleRemoveTelegramChannel}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto ${selectedEmail ? 'p-3 sm:p-6 md:p-8 max-w-5xl mx-auto w-full' : currentSection === 'admin' ? 'p-0 w-full' : 'p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full'}`}>
          {selectedEmail ? (
            <EmailDetailPage
              email={selectedEmail}
              allEmails={activeEmailList}
              categories={customCategories}
              backLabel={getBackLabel()}
              onBack={handleCloseEmail}
              onSelectEmail={handleOpenEmail}
              onStatusChange={handleStatusChange}
              onCategoryChange={handleUpdateEmailCategory}
              onSnooze={handleOpenSnooze}
              onFeedback={handleFeedback}
              onToggleTask={(taskId, currentStatus) => {
                const nextStatus: TaskStatus =
                  currentStatus === 'todo'
                    ? 'in_progress'
                    : currentStatus === 'in_progress'
                    ? 'done'
                    : 'todo';
                handleUpdateTaskStatus(taskId, nextStatus);
              }}
              onDelete={handleDeleteEmail}
            />
          ) : (
            <>
              {/* A. Mail Section Views */}
              {currentSection === 'mail' && (
                <>
                  {mailView === 'inbox' && (
                    <MailDashboard
                      currentUser={currentUser}
                      emails={emails}
                      isLoading={isLoadingEmails}
                      categories={customCategories}
                      activeCategory={mailCategory}
                      onSelectCategory={setMailCategory}
                      activePriorityFilter={mailPriorityFilter}
                      onSelectPriorityFilter={(filter) => setMailPriorityFilter(filter as MailPriorityFilter)}
                      onNavigateView={(view) => {
                        setMailView(view);
                        handleCloseEmail();
                      }}
                      searchQuery={searchQuery}
                      onSelectEmail={handleOpenEmail}
                      onStatusChange={handleStatusChange}
                      onCategoryChange={handleUpdateEmailCategory}
                      onSnooze={handleOpenSnooze}
                      onRefresh={refreshAll}
                      onOpenConnectMailbox={() => setIsConnectMailboxOpen(true)}
                      onOpenManageCategories={() => setIsManageCategoriesOpen(true)}
                      onReorderCategories={handleSaveCategories}
                      onDeleteEmail={handleDeleteEmail}
                    />
                  )}

                  {mailView === 'action-center' && (
                    <ActionCenter
                      tasks={tasks}
                      isLoading={isLoadingTasks}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onCreateTask={handleCreateTask}
                      onDeleteTask={handleDeleteTask}
                      onSelectEmailById={handleSelectEmailById}
                    />
                  )}

                  {mailView === 'todo-daywise' && <DayWiseTodoView />}

                  {mailView === 'habit-tracker' && <HabitTrackerView />}

                  {mailView === 'pomodoro' && <PomodoroTimerView />}

                  {(mailView === 'call-sheet' || mailView === 'deadline-calendar') && (
                    <CallSheetView
                      emails={emails}
                      onSelectEmail={handleOpenEmail}
                    />
                  )}

                  {mailView === 'daily-brief' && (
                    <DailyBriefView
                      data={dailyBrief}
                      isLoading={isLoadingBrief}
                      onNavigateToHotspots={() => setMailView('inbox')}
                      onNavigateToActionCenter={() => setMailView('action-center')}
                      onSelectEmailById={handleSelectEmailById}
                      onRemoveItem={handleDeleteEmail}
                    />
                  )}

                  {mailView === 'senders' && (
                    <SenderListView
                      senders={senders}
                      isLoading={isLoadingSenders}
                      onToggleVip={handleToggleVip}
                    />
                  )}

                  {mailView === 'feedback' && (
                    <FeedbackView onSelectEmailById={handleSelectEmailById} currentUser={currentUser} />
                  )}

                  {mailView === 'settings' && (
                    <SettingsView
                      settings={settings}
                      onUpdateSensitivity={handleUpdateSensitivity}
                      currentUser={currentUser}
                      categories={customCategories}
                      onOpenManageCategories={() => setIsManageCategoriesOpen(true)}
                      theme={theme}
                      onToggleTheme={toggleTheme}
                      onOpenConnectMailbox={() => setIsConnectMailboxOpen(true)}
                      onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
                      onOpenLoginModal={() => setIsLoginModalOpen(true)}
                      onOpenTutorial={() => setIsTutorialOpen(true)}
                      onRefresh={refreshAll}
                    />
                  )}
                </>
              )}

              {/* B. Telegram Section Views */}
              {currentSection === 'telegram' && (
                <TelegramDashboard
                  emails={emails}
                  isLoading={isLoadingEmails}
                  selectedChannel={selectedTelegramChannel}
                  onSelectChannel={setSelectedTelegramChannel}
                  activePriorityFilter={telegramPriorityFilter}
                  onSelectPriorityFilter={(filter) => setTelegramPriorityFilter(filter as TelegramPriorityFilter)}
                  searchQuery={searchQuery}
                  savedChannels={savedChannelsWithStats}
                  onOpenAddChannel={() => setIsTelegramModalOpen(true)}
                  onSelectMessage={handleOpenEmail}
                  onRefresh={refreshAll}
                  onStatusChange={handleStatusChange}
                  onRemoveChannel={handleRemoveTelegramChannel}
                />
              )}

              {/* C. Admin Intelligence & Telemetry Dashboard */}
              {currentSection === 'admin' && (
                <AdminDashboardView
                  currentUser={currentUser}
                  onSelectEmailById={handleSelectEmailById}
                  onSwitchUser={(email, name) => handleSwitchUser(email, undefined, name)}
                  onNavigateToMail={() => {
                    setCurrentSection('mail');
                    setMailView('inbox');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 4. Contextual Snooze Modal */}
      <SnoozeModal
        email={snoozeTargetEmail}
        isOpen={isSnoozeModalOpen}
        onClose={() => {
          setIsSnoozeModalOpen(false);
          setSnoozeTargetEmail(null);
        }}
        onConfirm={handleConfirmSnooze}
      />

      {/* 5. Connect Real Mailbox Modal */}
      <ConnectMailboxModal
        isOpen={isConnectMailboxOpen}
        onClose={() => setIsConnectMailboxOpen(false)}
        currentUser={currentUser}
        onMailboxSynced={() => {
          setTimeout(() => {
            refreshAll();
          }, 600);
        }}
      />

      {/* 6. Telegram Channel Ingest & Scraping Modal */}
      <TelegramIngestModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onPostIngested={() => {
          setTimeout(() => {
            refreshAll();
          }, 600);
        }}
      />

      {/* 7. Custom Categories & Automated Keyword Rules Modal */}
      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={customCategories}
        emails={emails}
        onSaveCategories={handleSaveCategories}
      />

      {/* 8. User Authentication & Multi-Account Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSelectUser={(u) => handleSwitchUser(u.email, undefined, u.name || undefined)}
        onLoginCustom={handleSwitchUser}
        onOpenFullAuthPage={() => setIsAuthPageOpen(true)}
        onRegisterCustom={async (data) => {
          await api.register(data);
          await handleSwitchUser(data.email, data.password, data.name);
        }}
      />

      {/* 9. Interactive Onboarding & Tutorial Tour */}
      <TutorialTourModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        userEmail={currentUser?.email}
        userName={currentUser?.name || currentUser?.email?.split('@')[0]}
        onNavigateSection={(sec) => {
          setCurrentSection(sec);
          if (sec === 'mail') setMailView('inbox');
        }}
        onNavigateMailView={(view) => {
          setCurrentSection('mail');
          setMailView(view);
        }}
        onOpenConnectMailbox={() => setIsConnectMailboxOpen(true)}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
      />
    </div>
  );
};

export default App;
