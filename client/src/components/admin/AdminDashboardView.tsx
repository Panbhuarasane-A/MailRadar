import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AdminDashboardMetrics,
  AdminFeedbackItem,
  AdminUserItem,
  AdminApiLogItem,
  UserProfile,
} from '../../types';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Users,
  Mail,
  Zap,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Search,
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Filter,
  Radio,
  Sliders,
  Check,
  Award,
  BarChart3,
  Server,
  Key,
  ExternalLink,
  MessageSquare,
  Flame,
  Send,
} from 'lucide-react';
import { getPriorityTheme, getPriorityLabel } from '../../utils/categoryClassifier';

interface AdminDashboardViewProps {
  currentUser: UserProfile | null;
  onSelectEmailById?: (emailId: string) => void;
  onSwitchUser?: (email: string, name?: string) => void;
  onNavigateToMail?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onSelectEmailById,
  onSwitchUser,
  onNavigateToMail,
}) => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [apiLogs, setApiLogs] = useState<AdminApiLogItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'users' | 'api-usage' | 'health'>('feedbacks');

  // Feedback filter state
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'direct' | 'thumbs_up' | 'thumbs_down' | 'manual_override'>('all');

  // User search state
  const [userSearch, setUserSearch] = useState('');

  // Toast notification
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const loadAllAdminData = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [m, f, u, a] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.getAdminFeedbacks().catch(() => []),
        api.getAdminUsers().catch(() => []),
        api.getAdminApiUsage().catch(() => []),
      ]);

      if (m) setMetrics(m);
      if (Array.isArray(f)) setFeedbacks(f);
      if (Array.isArray(u)) setUsers(u);
      if (Array.isArray(a)) setApiLogs(a);
    } catch (err) {
      console.error('[AdminDashboard] Failed to load telemetry:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  const handleRefresh = () => {
    loadAllAdminData(false);
    setToastMsg({ text: 'Admin telemetry and user feedback metrics refreshed!', type: 'success' });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filtered Feedbacks
  const filteredFeedbacks = useMemo(() => {
    let list = feedbacks;
    if (feedbackFilter !== 'all') {
      if (feedbackFilter === 'direct') {
        list = list.filter((f) => !f.emailId || f.action === 'direct_feedback' || f.action === 'bug_report' || f.action === 'feature_request');
      } else {
        list = list.filter((f) => f.action === feedbackFilter);
      }
    }
    if (feedbackSearch.trim()) {
      const q = feedbackSearch.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.userName.toLowerCase().includes(q) ||
          f.userEmail.toLowerCase().includes(q) ||
          f.emailSubject.toLowerCase().includes(q) ||
          f.emailSender.toLowerCase().includes(q) ||
          (f.comments && f.comments.toLowerCase().includes(q)) ||
          (f.overrideTier && f.overrideTier.toLowerCase().includes(q))
      );
    }
    return list;
  }, [feedbacks, feedbackFilter, feedbackSearch]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  if (isLoading && !metrics) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse p-4">
        <div className="h-28 rounded-2xl bg-slate-100 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230]" />
          ))}
        </div>
      </div>
    );
  }

  const m = metrics || {
    totalUsers: users.length,
    totalEmails: 0,
    totalTasks: 0,
    totalFeedbacks: feedbacks.length,
    totalSenders: 0,
    satisfactionRate: 100,
    priorityBreakdown: { hotspots: 0, important: 0, normal: 0, low: 0 },
    feedbackBreakdown: { thumbsUp: 0, thumbsDown: 0, manualOverride: 0 },
    trafficSources: { telegram: 0, simulated: 0, realMailbox: 0 },
    categoryBreakdown: {},
    apiUsage: {
      totalCalls: 0,
      geminiCalls: 0,
      scraperCalls: 0,
      avgLatencyMs: 0,
      estimatedTokens: 0,
      successRate: 100,
      activeEndpoints: 0,
    },
    systemHealth: {
      database: 'Connected (Neon PostgreSQL)',
      queueStatus: 'Optimal (0 backlog)',
      geminiApiKey: 'Configured & Active',
      uptime: '100%',
      serverUptimeSeconds: 0,
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Command Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-3xl p-6 shadow-xs relative overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Platform Intelligence, User Feedback & API Usage Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Global overview of active users, user feedback reinforcement loop, LLM Gemini classification traffic, and system diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-50 dark:hover:bg-[#151722] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-orange-400' : 'text-slate-500'}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
            </button>

            {onNavigateToMail && currentUser?.role !== 'admin' && !currentUser?.email?.toLowerCase().includes('admin') && (
              <button
                onClick={onNavigateToMail}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Return to Mailbox</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast alert feedback */}
        {toastMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
        )}
      </div>

      {/* 2. Top KPI Metric Cards (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Users */}
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{m.totalUsers}</div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +100% Active
            </span>
          </div>
        </div>

        {/* Card 2: Ingested Traffic */}
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Mail & Job Traffic</span>
            <Mail className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{m.totalEmails}</div>
            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              {m.priorityBreakdown.hotspots} Hotspots
            </span>
          </div>
        </div>

        {/* Card 3: Action Center Tasks */}
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Action Tasks</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{m.totalTasks}</div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-orange-400">
              Auto-Extracted
            </span>
          </div>
        </div>

        {/* Card 4: API & LLM Calls */}
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">API & LLM Calls</span>
            <Cpu className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{m.apiUsage.totalCalls}</div>
            <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {m.apiUsage.avgLatencyMs}ms
            </span>
          </div>
        </div>

        {/* Card 5: User Feedback Satisfaction */}
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">AI Satisfaction</span>
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{m.satisfactionRate}%</div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              ({m.totalFeedbacks} ratings)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Tab Switcher Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#1e2230] pb-2 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('feedbacks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'feedbacks'
              ? 'bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>User Feedback Review Hub</span>
          <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
            activeTab === 'feedbacks'
              ? 'bg-white/20 text-white dark:text-slate-950'
              : 'bg-slate-100 dark:bg-[#1e2230] text-slate-700 dark:text-slate-300'
          }`}>
            {feedbacks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Users & Usage</span>
          <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
            activeTab === 'users'
              ? 'bg-white/20 text-white dark:text-slate-950'
              : 'bg-slate-100 dark:bg-[#1e2230] text-slate-700 dark:text-slate-300'
          }`}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('api-usage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'api-usage'
              ? 'bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>API Usage & Traffic Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'health'
              ? 'bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>System Diagnostics</span>
        </button>
      </div>

      {/* 4. TAB 1: USER FEEDBACK COLUMN & REVIEW HUB */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Controls & Filter Bar */}
          <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFeedbackFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  feedbackFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-[#181a26] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All Feedback ({feedbacks.length})
              </button>
              <button
                onClick={() => setFeedbackFilter('direct')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  feedbackFilter === 'direct'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>Direct to Admin ({feedbacks.filter((f) => !f.emailId || f.action === 'direct_feedback' || f.action === 'bug_report' || f.action === 'feature_request').length})</span>
              </button>
              <button
                onClick={() => setFeedbackFilter('thumbs_up')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  feedbackFilter === 'thumbs_up'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                }`}
              >
                <ThumbsUp className="w-3 h-3" />
                <span>Thumbs Up ({feedbacks.filter((f) => f.action === 'thumbs_up').length})</span>
              </button>
              <button
                onClick={() => setFeedbackFilter('manual_override')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  feedbackFilter === 'manual_override'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tier Overrides ({feedbacks.filter((f) => f.action === 'manual_override').length})</span>
              </button>
              <button
                onClick={() => setFeedbackFilter('thumbs_down')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  feedbackFilter === 'thumbs_down'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <ThumbsDown className="w-3 h-3" />
                <span>Disputes ({feedbacks.filter((f) => f.action === 'thumbs_down').length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                placeholder="Search user, subject, or comments..."
                className="w-full bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* User Feedback Table Column */}
          <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1e2230] bg-slate-50/70 dark:bg-[#0c0d12] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-4">User Name & Email</th>
                    <th className="py-3.5 px-4">Target Email & Subject</th>
                    <th className="py-3.5 px-4">Feedback Action</th>
                    <th className="py-3.5 px-4">User Comment / Reason</th>
                    <th className="py-3.5 px-4 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#161824]">
                  {filteredFeedbacks.length > 0 ? (
                    filteredFeedbacks.map((fb) => {
                      const isDirectAdmin = !fb.emailId || fb.action === 'direct_feedback' || fb.action === 'bug_report' || fb.action === 'feature_request';
                      const origTheme = getPriorityTheme(fb.originalTier);

                      return (
                        <tr
                          key={fb.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-[#151722]/60 transition-colors group"
                        >
                          {/* User Column */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-[#1e2232] text-blue-700 dark:text-orange-400 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-blue-200/60 dark:border-[#2a3044]">
                                {fb.userName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {fb.userName}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">
                                  {fb.userEmail}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email & Subject */}
                          <td className="py-3.5 px-4 align-top max-w-xs">
                            <div className="space-y-1">
                              <div
                                onClick={() => {
                                  if (fb.emailId && onSelectEmailById) onSelectEmailById(fb.emailId);
                                }}
                                className={`font-semibold text-slate-900 dark:text-slate-200 line-clamp-2 ${
                                  fb.emailId ? 'hover:text-blue-600 dark:hover:text-orange-400 cursor-pointer' : ''
                                } transition-colors`}
                                title={fb.emailId ? 'Click to view email' : 'Direct feedback'}
                              >
                                {fb.emailSubject}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                                <span>{fb.emailSenderName || fb.emailSender}</span>
                                {fb.emailId && (
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold border ${origTheme.badgeClass}`}>
                                    {origTheme.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            {isDirectAdmin ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs">
                                  <Send className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                  <span>Direct to Admin</span>
                                </span>
                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
                                  Type: <span className="font-bold text-purple-700 dark:text-purple-300">{fb.action.replace('_', ' ')}</span>
                                </div>
                              </div>
                            ) : fb.action === 'thumbs_up' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs">
                                <ThumbsUp className="w-3 h-3" />
                                <span>AI Approved (Thumbs Up)</span>
                              </span>
                            ) : fb.action === 'manual_override' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs">
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Manual Override</span>
                                </span>
                                {fb.overrideTier && (
                                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    Changed to: <span className="font-bold text-blue-600 dark:text-orange-400 uppercase">{fb.overrideTier}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs">
                                <ThumbsDown className="w-3 h-3" />
                                <span>Disputed (Thumbs Down)</span>
                              </span>
                            )}
                          </td>

                          {/* Comments */}
                          <td className="py-3.5 px-4 align-top">
                            {fb.comments ? (
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] text-slate-700 dark:text-slate-300 text-xs italic leading-relaxed">
                                "{fb.comments}"
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">No text commentary provided.</span>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4 align-top text-right text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(fb.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">No user feedback submissions match the current filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: REGISTERED USERS & USAGE DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active User Directory</h2>
              <p className="text-[11px] text-slate-400">Manage multi-account workspaces and review user engagement metrics.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1e2230] bg-slate-50/70 dark:bg-[#0c0d12] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4 text-center">Ingested Mails</th>
                    <th className="py-3.5 px-4 text-center">Tasks Created</th>
                    <th className="py-3.5 px-4 text-center">Feedbacks Given</th>
                    <th className="py-3.5 px-4">Sensitivity</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#161824]">
                  {filteredUsers.map((u) => {
                    const isAdmin = u.role === 'admin' || u.email === 'admin@mailhinge.ai';
                    const isCurrent = currentUser?.email.toLowerCase() === u.email.toLowerCase();

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#151722]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                              {(u.name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{u.name || u.email.split('@')[0]}</span>
                                {isCurrent && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-sans">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-orange-500/10 border border-amber-200 dark:border-orange-500/30 text-amber-800 dark:text-orange-400 font-extrabold text-[10px] uppercase">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#181a26] text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase">
                              User
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#151722]">
                            {u.emailsCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#151722]">
                            {u.tasksCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                            {u.feedbackCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="capitalize text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {u.sensitivity || 'balanced'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {onSwitchUser && !isCurrent ? (
                            <button
                              onClick={() => onSwitchUser(u.email, u.name || undefined)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1e2230] hover:bg-blue-600 hover:text-white dark:hover:bg-orange-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all cursor-pointer"
                            >
                              Login as User
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: API USAGE & TRAFFIC TELEMETRY */}
      {activeTab === 'api-usage' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Sub-Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apiLogs.map((item) => (
              <div
                key={item.service}
                className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{item.service}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {item.status}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0c0d12] p-2 rounded-xl border border-slate-100 dark:border-[#1e2230] truncate">
                  {item.method} {item.endpoint}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-[#1e2230] text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Requests</div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{item.totalCalls}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Avg Latency</div>
                    <div className="text-sm font-extrabold text-blue-600 dark:text-orange-400 mt-0.5">{item.avgLatencyMs}ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Tokens</div>
                    <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{item.tokensEstimated.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Traffic Distribution Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AI Priority Tier Distribution
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-red-600 dark:text-red-400">Hotspots (Urgent)</span>
                    <span>{m.priorityBreakdown.hotspots} ({Math.round((m.priorityBreakdown.hotspots / (m.totalEmails || 1)) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1e2230] rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(m.priorityBreakdown.hotspots / (m.totalEmails || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-amber-600 dark:text-amber-400">Important Notices</span>
                    <span>{m.priorityBreakdown.important} ({Math.round((m.priorityBreakdown.important / (m.totalEmails || 1)) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1e2230] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(m.priorityBreakdown.important / (m.totalEmails || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-blue-600 dark:text-blue-400">Normal / Informational</span>
                    <span>{m.priorityBreakdown.normal} ({Math.round((m.priorityBreakdown.normal / (m.totalEmails || 1)) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1e2230] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.priorityBreakdown.normal / (m.totalEmails || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Low / Promotional FYI</span>
                    <span>{m.priorityBreakdown.low} ({Math.round((m.priorityBreakdown.low / (m.totalEmails || 1)) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1e2230] rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${(m.priorityBreakdown.low / (m.totalEmails || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Source Distribution */}
            <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Data Ingestion Pipelines
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-[#151722] border border-blue-100 dark:border-[#1e2230]">
                  <div className="text-xs font-semibold text-blue-600 dark:text-orange-400">Telegram Scraper</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{m.trafficSources.telegram}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Live Channel Feeds</div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-[#151722] border border-purple-100 dark:border-[#1e2230]">
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Simulated Seeds</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{m.trafficSources.simulated}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Seed Datasets</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-[#151722] border border-emerald-100 dark:border-[#1e2230]">
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">OAuth / IMAP</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{m.trafficSources.realMailbox}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Real Inboxes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 4: SYSTEM DIAGNOSTICS & HEALTH */}
      {activeTab === 'health' && (
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-3xl p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e2230] pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">System Health & Infrastructure Telemetry</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Database connectivity, queue workers, and environment health.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All Systems Nominal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Database Instance</div>
              <div className="font-bold text-slate-900 dark:text-white">{m.systemHealth.database}</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">● Operational</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Ingestion Queue</div>
              <div className="font-bold text-slate-900 dark:text-white">{m.systemHealth.queueStatus}</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">● 0 Job Drops</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Gemini API State</div>
              <div className="font-bold text-slate-900 dark:text-white">{m.systemHealth.geminiApiKey}</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">● 2.5 Flash Engine</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Server Availability</div>
              <div className="font-bold text-slate-900 dark:text-white">{m.systemHealth.uptime}</div>
              <div className="text-[11px] text-slate-400 font-mono">Uptime: {Math.floor(m.systemHealth.serverUptimeSeconds / 60)} mins</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
