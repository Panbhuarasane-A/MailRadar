import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Email, CustomCategory, UserProfile } from '../../types';
import { MailCategoryType, classifyMailCategory, DEFAULT_CUSTOM_CATEGORIES } from '../../utils/categoryClassifier';
import { MailCategoryCards, CategoryStats } from './MailCategoryCards';
import { EmailRow } from './EmailRow';
import { MailView } from '../layout/MailSidebar';
import {
  Mail,
  Search,
  Sparkles,
  Filter,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Layers,
  Settings2,
  Plus,
  Flame,
  Clock,
  X,
  ArrowUpDown,
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from 'lucide-react';

interface MailDashboardProps {
  currentUser?: UserProfile | null;
  emails: Email[];
  isLoading: boolean;
  categories?: CustomCategory[];
  activeCategory: 'all' | MailCategoryType;
  onSelectCategory: (category: 'all' | MailCategoryType) => void;
  activePriorityFilter: string;
  onSelectPriorityFilter: (filter: string) => void;
  onNavigateView?: (view: MailView) => void;
  searchQuery: string;
  onSelectEmail: (email: Email) => void;
  onStatusChange: (emailId: string, status: 'read' | 'unread' | 'archived') => void;
  onCategoryChange?: (emailId: string, category: string) => void;
  onSnooze: (email: Email) => void;
  onRefresh: () => void;
  onOpenConnectMailbox: () => void;
  onOpenManageCategories?: () => void;
  onReorderCategories?: (categories: CustomCategory[]) => void;
  onDeleteEmail?: (emailId: string) => void;
}

export const MailDashboard: React.FC<MailDashboardProps> = ({
  currentUser,
  emails,
  isLoading,
  categories = DEFAULT_CUSTOM_CATEGORIES,
  activeCategory,
  onSelectCategory,
  activePriorityFilter,
  onSelectPriorityFilter,
  onNavigateView,
  searchQuery,
  onSelectEmail,
  onStatusChange,
  onCategoryChange,
  onSnooze,
  onRefresh,
  onOpenConnectMailbox,
  onOpenManageCategories,
  onReorderCategories,
  onDeleteEmail,
}) => {
  const [statusTab, setStatusTab] = useState<'active' | 'completed'>('active');
  const [categorySubView, setCategorySubView] = useState<'all' | 'priority' | 'recent'>('all');
  const [sortMode, setSortMode] = useState<'time_desc' | 'time_asc' | 'priority_desc' | 'priority_asc'>('time_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setIsPriorityMenuOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Separate emails (only mail provider, exclude telegram)
  const mailEmails = emails.filter((e) => e.provider !== 'telegram');

  // 2. Compute dynamic threshold for "Recent Added" emails
  const latestTimestamp = useMemo(() => {
    return mailEmails.reduce((max, e) => {
      const t = new Date(e.receivedAt || e.createdAt || 0).getTime();
      return t > max ? t : max;
    }, 0);
  }, [mailEmails]);

  const recentCutoff = useMemo(() => {
    if (latestTimestamp <= 0) return Date.now() - 7 * 86400000;
    // If mailbox has recent live emails (within 7 days of now), cutoff is 7 days from now.
    // Otherwise (historical sync / imported mailbox), cutoff is 7 days from the newest email in mailbox.
    const isLiveRecent = Date.now() - latestTimestamp <= 7 * 86400000;
    return isLiveRecent ? Date.now() - 7 * 86400000 : latestTimestamp - 7 * 86400000;
  }, [latestTimestamp]);

  const isEmailRecent = (e: Email) => {
    const t = new Date(e.receivedAt || e.createdAt || 0).getTime();
    return t >= recentCutoff;
  };

  const isEmailPriority = (e: Email) => {
    return (
      e.priorityTier === 'hotspot' ||
      e.priorityTier === 'urgent' ||
      e.priorityTier === 'important' ||
      !!e.requiresAction
    );
  };

  // 3. Compute category stats dynamically from real data and custom category definitions
  const stats: Record<string, CategoryStats> = {};
  categories.forEach((cat) => {
    stats[cat.id] = { total: 0, urgent: 0, important: 0, priorityCount: 0, recentCount: 0 };
  });

  let urgentCount = 0;
  let importantCount = 0;
  let normalCount = 0;
  let lowCount = 0;
  let allPriorityCount = 0;
  let allRecentCount = 0;

  mailEmails.forEach((e) => {
    const cat = classifyMailCategory(e, categories);
    const isUrgent = e.priorityTier === 'hotspot' || e.priorityTier === 'urgent';
    const isImportant = e.priorityTier === 'important';
    const isNormal = e.priorityTier === 'normal';
    const isLow = e.priorityTier === 'low';
    const isPriority = isEmailPriority(e);
    const isRecent = isEmailRecent(e);

    if (isUrgent) urgentCount++;
    if (isImportant) importantCount++;
    if (isNormal) normalCount++;
    if (isLow) lowCount++;
    if (isPriority) allPriorityCount++;
    if (isRecent) allRecentCount++;

    if (!stats[cat]) {
      stats[cat] = { total: 0, urgent: 0, important: 0, priorityCount: 0, recentCount: 0 };
    }
    stats[cat].total++;
    if (isUrgent) stats[cat].urgent++;
    if (isImportant) stats[cat].important++;
    if (isPriority) stats[cat].priorityCount++;
    if (isRecent) stats[cat].recentCount++;
  });

  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours

  const isCompletedRecent = (e: Email) => {
    if (e.status !== 'archived') return false;
    const completedTime = new Date(e.updatedAt || e.receivedAt || e.createdAt || 0).getTime();
    return Date.now() - completedTime <= TWO_DAYS_MS;
  };

  const activeMailCount = mailEmails.filter((e) => e.status !== 'archived').length;
  const completedMailCount = mailEmails.filter((e) => isCompletedRecent(e)).length;

  const currentCategoryStats =
    activeCategory === 'all'
      ? { total: mailEmails.length, priorityCount: allPriorityCount, recentCount: allRecentCount }
      : stats[activeCategory] || { total: 0, priorityCount: 0, recentCount: 0 };

  const activeCategoryObj = categories.find((c) => c.id === activeCategory);

  // 4. Filter emails based on statusTab (with 2-day auto-purge for completed), category, subView (priority/recent), priorityFilter, and search
  const filteredEmails = mailEmails
    .filter((e) => {
      // Status Tab (Active vs Completed) - Completed emails automatically expire after 2 days
      const isCompleted = e.status === 'archived';
      if (statusTab === 'active' && isCompleted) return false;
      if (statusTab === 'completed' && (!isCompleted || !isCompletedRecent(e))) return false;

      // Category filter
      if (activeCategory !== 'all') {
        const cat = classifyMailCategory(e, categories);
        if (cat !== activeCategory) return false;
      }

      // Sub-category View Filter (Priority vs Recent vs All)
      if (categorySubView === 'priority' && !isEmailPriority(e)) {
        return false;
      }
      if (categorySubView === 'recent' && !isEmailRecent(e)) {
        return false;
      }

      // Priority filter from top cards
      if (activePriorityFilter !== 'all') {
        if (activePriorityFilter === 'urgent' && e.priorityTier !== 'hotspot' && e.priorityTier !== 'urgent')
          return false;
        if (activePriorityFilter === 'important' && e.priorityTier !== 'important') return false;
        if (activePriorityFilter === 'normal' && e.priorityTier !== 'normal') return false;
        if (activePriorityFilter === 'low' && e.priorityTier !== 'low') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          e.subject.toLowerCase().includes(q) ||
          (e.senderName && e.senderName.toLowerCase().includes(q)) ||
          e.sender.toLowerCase().includes(q) ||
          e.reasoning.toLowerCase().includes(q) ||
          (e.bodySnippet && e.bodySnippet.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.receivedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.receivedAt || b.createdAt || 0).getTime();

      if (sortMode === 'priority_desc') {
        const getPriorityWeight = (tier?: string) => {
          if (tier === 'hotspot' || tier === 'urgent' || tier === 'critical') return 4;
          if (tier === 'important') return 3;
          if (tier === 'normal' || tier === 'medium') return 2;
          return 1;
        };
        const wA = getPriorityWeight(a.priorityTier);
        const wB = getPriorityWeight(b.priorityTier);
        if (wB !== wA) return wB - wA;
        return timeB - timeA;
      }

      if (sortMode === 'priority_asc') {
        const getPriorityWeight = (tier?: string) => {
          if (tier === 'hotspot' || tier === 'urgent' || tier === 'critical') return 4;
          if (tier === 'important') return 3;
          if (tier === 'normal' || tier === 'medium') return 2;
          return 1;
        };
        const wA = getPriorityWeight(a.priorityTier);
        const wB = getPriorityWeight(b.priorityTier);
        if (wA !== wB) return wA - wB;
        return timeB - timeA;
      }

      if (sortMode === 'time_asc') {
        return timeA - timeB;
      }

      // Default: time_desc (newest time added first)
      return timeB - timeA;
    });

  const priorityOptions = [
    { id: 'all', label: 'All Priorities', count: mailEmails.length, dot: 'bg-slate-400 dark:bg-slate-500', badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
    { id: 'urgent', label: 'Urgent', count: urgentCount, dot: 'bg-red-500', badgeClass: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
    { id: 'important', label: 'Important', count: importantCount, dot: 'bg-amber-500', badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
    { id: 'normal', label: 'Normal', count: normalCount, dot: 'bg-blue-500', badgeClass: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
    { id: 'low', label: 'Low Priority', count: lowCount, dot: 'bg-emerald-500', badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
  ];

  const sortOptions = [
    { id: 'time_desc', label: 'Newest Added First', shortLabel: 'Newest Time', icon: <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> },
    { id: 'time_asc', label: 'Oldest Added First', shortLabel: 'Oldest Time', icon: <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> },
    { id: 'priority_desc', label: 'Highest Priority First', shortLabel: 'Priority (High to Low)', icon: <Flame className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> },
    { id: 'priority_asc', label: 'Lowest Priority First', shortLabel: 'Priority (Low to High)', icon: <Zap className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> },
  ];

  // Reset to first page when any search/filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activePriorityFilter, searchQuery, statusTab, categorySubView, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredEmails.length);
  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Hi';
  }, []);

  const displayName = useMemo(() => {
    if (currentUser?.name && currentUser.name.trim()) return currentUser.name;
    if (currentUser?.email) {
      const prefix = currentUser.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Panbhuarasane';
  }, [currentUser]);

  const activePriorityObj = priorityOptions.find((p) => p.id === activePriorityFilter) || priorityOptions[0];
  const activeSortObj = sortOptions.find((s) => s.id === sortMode) || sortOptions[0];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Left Dynamic Greeting Header */}
      <div className="pt-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>
            {timeGreeting},{' '}
            <span className="text-blue-600 dark:text-orange-400">{displayName}</span>
          </span>
          <span className="text-xl select-none">👋</span>
        </h1>
      </div>

      {/* 1. 4-Column Stat / Metric Overview Grid (Interactive Navigation & Filtering) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: All Analyzed Emails */}
        <button
          type="button"
          onClick={() => {
            onSelectCategory('all');
            onSelectPriorityFilter('all');
            setCategorySubView('all');
            setStatusTab('active');
          }}
          className={`p-4 sm:p-5 rounded-2xl text-left bg-white dark:bg-[#12141c] border transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${
            activeCategory === 'all' && activePriorityFilter === 'all' && categorySubView === 'all'
              ? 'border-blue-500/80 dark:border-blue-500/80 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
              : 'border-slate-200/80 dark:border-[#1e2230] hover:border-blue-400 dark:hover:border-blue-500/60'
          }`}
          title="Show all analyzed emails in inbox"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Emails Analyzed
            </span>
            <span className="text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <Mail className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-sans">
              {mailEmails.length}
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Metric 2: High-Risk Hotspots */}
        <button
          type="button"
          onClick={() => {
            onSelectCategory('all');
            onSelectPriorityFilter('urgent');
            setStatusTab('active');
          }}
          className={`p-4 sm:p-5 rounded-2xl text-left bg-white dark:bg-[#12141c] border transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${
            activePriorityFilter === 'urgent'
              ? 'border-red-500/80 dark:border-red-500/80 ring-2 ring-red-500/20 bg-red-50/30 dark:bg-red-950/30'
              : 'border-slate-200/80 dark:border-[#1e2230] hover:border-red-400 dark:hover:border-red-500/60'
          }`}
          title="Filter high-risk urgent hotspots"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              High-Risk Hotspots
            </span>
            <span className="text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 font-sans">
              {urgentCount}
            </div>
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>Filter</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Metric 3: Active Action Tasks (Redirects to Action Center Page) */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateView) {
              onNavigateView('action-center');
            }
          }}
          className="p-4 sm:p-5 rounded-2xl text-left bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] hover:border-orange-400 dark:hover:border-orange-500/60 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.99]"
          title="Navigate to Action Center to view and manage all action tasks"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              Active Action Tasks
            </span>
            <span className="text-orange-500 dark:text-orange-400 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 dark:text-orange-400 font-sans">
              {allPriorityCount}
            </div>
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>Action Center</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Metric 4: Important Notices */}
        <button
          type="button"
          onClick={() => {
            onSelectCategory('all');
            onSelectPriorityFilter('important');
            setStatusTab('active');
          }}
          className={`p-4 sm:p-5 rounded-2xl text-left bg-white dark:bg-[#12141c] border transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${
            activePriorityFilter === 'important'
              ? 'border-amber-500/80 dark:border-amber-500/80 ring-2 ring-amber-500/20 bg-amber-50/30 dark:bg-amber-950/30'
              : 'border-slate-200/80 dark:border-[#1e2230] hover:border-amber-400 dark:hover:border-amber-500/60'
          }`}
          title="Filter important notices"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Important Notices
            </span>
            <span className="text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-sans">
              {importantCount}
            </div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>Filter</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>

      {/* Modular Custom Category Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Mail Categories & Entity Clusters ({categories.length})
            </h2>
          </div>
          {(activeCategory !== 'all' || categorySubView !== 'all' || activePriorityFilter !== 'all') && (
            <button
              onClick={() => {
                onSelectCategory('all');
                setCategorySubView('all');
                onSelectPriorityFilter('all');
              }}
              className="text-xs text-blue-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters (Show All)</span>
            </button>
          )}
        </div>

        <MailCategoryCards
          categories={categories}
          stats={stats}
          activeCategory={activeCategory}
          activeSubView={categorySubView}
          onSelectCategory={(cat) => {
            if (activeCategory === cat) {
              onSelectCategory('all');
              setCategorySubView('all');
            } else {
              onSelectCategory(cat);
            }
          }}
          onSelectCategoryAndSubView={(cat, subView) => {
            onSelectCategory(cat);
            setCategorySubView(subView);
          }}
          onOpenManageCategories={onOpenManageCategories}
          onReorderCategories={onReorderCategories}
        />
      </div>

      {/* Email Feed Container */}
      <div ref={feedContainerRef} className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl shadow-xs overflow-hidden scroll-mt-20">
        {/* Table / List Header Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2230] flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#151722]/80">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Active vs Completed Tabs with Smooth Sliding Pills */}
            <div className="flex items-center p-1 bg-slate-200/80 dark:bg-[#0c0d12] rounded-xl border border-slate-300/40 dark:border-[#1e2230] gap-1">
              <button
                type="button"
                onClick={() => setStatusTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  statusTab === 'active'
                    ? 'bg-white dark:bg-[#1e2230] text-blue-700 dark:text-orange-400 tab-pill-active border border-slate-200/80 dark:border-orange-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-[#151722]/50'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 transition-transform duration-200 ${statusTab === 'active' ? 'scale-110' : ''}`} />
                <span>Inbox</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                  statusTab === 'active'
                    ? 'bg-blue-100 dark:bg-orange-950/80 text-blue-800 dark:text-orange-300'
                    : 'bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {activeMailCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusTab('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  statusTab === 'completed'
                    ? 'bg-white dark:bg-[#1e2230] text-emerald-700 dark:text-emerald-300 tab-pill-active border border-slate-200/80 dark:border-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-[#151722]/50'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 transition-transform duration-200 ${statusTab === 'completed' ? 'scale-110' : ''}`} />
                <span>Completed</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                  statusTab === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {completedMailCount}
                </span>
              </button>
            </div>

            {/* Sub-Category Filtering: All vs Priority vs Recent with Smooth Pills */}
            <div className="flex items-center p-1 bg-slate-200/80 dark:bg-[#0c0d12] rounded-xl border border-slate-300/40 dark:border-[#1e2230] gap-1">
              <button
                type="button"
                onClick={() => setCategorySubView('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  categorySubView === 'all'
                    ? 'bg-white dark:bg-[#1e2230] text-slate-900 dark:text-white tab-pill-active border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-[#151722]/50'
                }`}
              >
                <span>All Mails</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-[#181a26] text-slate-700 dark:text-slate-300 font-mono">
                  {currentCategoryStats.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategorySubView('priority')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  categorySubView === 'priority'
                    ? 'bg-white dark:bg-[#1e2230] text-red-700 dark:text-red-400 tab-pill-active border border-slate-200/80 dark:border-red-800/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-slate-300/30 dark:hover:bg-[#151722]/50'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 text-red-500 transition-transform duration-200 ${categorySubView === 'priority' ? 'scale-110 animate-bounce-subtle' : ''}`} />
                <span>Priority Mail</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-mono">
                  {currentCategoryStats.priorityCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategorySubView('recent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  categorySubView === 'recent'
                    ? 'bg-white dark:bg-[#1e2230] text-orange-700 dark:text-orange-400 tab-pill-active border border-slate-200/80 dark:border-orange-500/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-orange-700 dark:hover:text-orange-400 hover:bg-slate-300/30 dark:hover:bg-[#151722]/50'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 text-blue-500 dark:text-orange-400 transition-transform duration-200 ${categorySubView === 'recent' ? 'scale-110' : ''}`} />
                <span>Recent Added</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-orange-950/60 text-blue-800 dark:text-orange-300 font-mono">
                  {currentCategoryStats.recentCount}
                </span>
              </button>
            </div>

            {/* 1. Priority / Importance Filter Dropdown */}
            <div className="relative" ref={priorityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsPriorityMenuOpen((prev) => !prev);
                  setIsSortMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 select-none ${
                  activePriorityFilter !== 'all'
                    ? 'bg-blue-50 dark:bg-orange-950/40 border-blue-300 dark:border-orange-500/40 text-blue-700 dark:text-orange-300 ring-2 ring-blue-100 dark:ring-orange-900/40 shadow-xs'
                    : 'bg-white dark:bg-[#141622] border-slate-200 dark:border-[#222636] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-[#2a2f40] shadow-xs'
                }`}
                title="Filter emails by priority level"
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${activePriorityObj.dot}`} />
                <span className="font-bold">{activePriorityObj.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${activePriorityObj.badgeClass}`}>
                  {activePriorityObj.count}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isPriorityMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPriorityMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#222636] shadow-xl z-30 py-1.5 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1e2230]">
                    Filter by Priority / Importance
                  </div>
                  <div className="py-1">
                    {priorityOptions.map((opt) => {
                      const isSelected = activePriorityFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onSelectPriorityFilter(opt.id);
                            setIsPriorityMenuOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181a26] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                            <span>{opt.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${opt.badgeClass}`}>
                              {opt.count}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400 flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Sort & Time Dropdown (Based on time & priority) */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSortMenuOpen((prev) => !prev);
                  setIsPriorityMenuOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141622] border border-slate-200 dark:border-[#222636] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-[#2a2f40] transition-all flex items-center gap-2 shadow-xs select-none"
                title="Sort emails by time added or priority"
              >
                {activeSortObj.icon}
                <span className="font-bold">{activeSortObj.shortLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSortMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#222636] shadow-xl z-30 py-1.5 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1e2230]">
                    Sort by Time & Priority
                  </div>
                  <div className="py-1">
                    {sortOptions.map((opt) => {
                      const isSelected = sortMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSortMode(opt.id as any);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181a26] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {opt.icon}
                            <span>{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {activeCategory !== 'all' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/40 flex items-center gap-1">
                <span>Category: {activeCategoryObj?.name || activeCategory}</span>
                <button
                  onClick={() => onSelectCategory('all')}
                  className="hover:text-orange-900 dark:hover:text-orange-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activePriorityFilter !== 'all' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-orange-950/60 text-blue-700 dark:text-orange-300 border border-blue-200 dark:border-orange-500/40 capitalize flex items-center gap-1">
                <span>Filter: {activePriorityFilter}</span>
                <button
                  onClick={() => onSelectPriorityFilter('all')}
                  className="hover:text-blue-900 dark:hover:text-orange-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusTab === 'completed' && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500" />
                <span>Cleared after 2 days (48h)</span>
              </span>
            )}
          </div>

          {/* Quick Dynamic Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            <button
              onClick={() => onSelectCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-blue-600 dark:bg-orange-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#181a26]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 dark:bg-orange-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#181a26]'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {stats['other'] && stats['other'].total > 0 && !categories.some((c) => c.id === 'other' || c.id === 'others') && (
              <button
                onClick={() => onSelectCategory('other')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeCategory === 'other'
                    ? 'bg-blue-600 dark:bg-orange-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#181a26]'
                }`}
              >
                Other Mail ({stats['other'].total})
              </button>
            )}
          </div>
        </div>

        {/* Email Rows */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <div className="text-xs font-medium">Loading emails from Mailo AI...</div>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              {statusTab === 'completed' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Mail className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {statusTab === 'completed' ? 'No completed emails yet' : 'No emails matching filters'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {statusTab === 'completed'
                  ? 'Completed emails are kept for 2 days (48 hours) and then automatically purged.'
                  : 'Try switching category tabs or clearing priority filters.'}
              </p>
            </div>
            <button
              onClick={() => {
                onSelectCategory('all');
                onSelectPriorityFilter('all');
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedEmails.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                categories={categories}
                onSelect={onSelectEmail}
                onStatusChange={onStatusChange}
                onCategoryChange={onCategoryChange}
                onSnooze={onSnooze}
                onDelete={onDeleteEmail}
              />
            ))}
          </div>
        )}

        {/* Pagination Footer Controls */}
        {filteredEmails.length > pageSize && (
          <div className="p-4 border-t border-slate-100 dark:border-[#1e2230] bg-slate-50/50 dark:bg-[#151722]/80 flex flex-wrap items-center justify-between gap-3 select-none">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
              <span>
                Showing <strong className="text-slate-900 dark:text-white font-bold">{startIndex + 1}</strong> to{' '}
                <strong className="text-slate-900 dark:text-white font-bold">{endIndex}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white font-bold">{filteredEmails.length}</strong> emails
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>
                Page <strong className="text-slate-900 dark:text-white font-bold">{currentPage}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white font-bold">{totalPages}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#181a26] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-orange-500/40 hover:text-blue-600 dark:hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {/* Page Number Buttons */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="px-1.5 text-xs text-slate-400 select-none">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePageChange(page)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            currentPage === page
                              ? 'bg-blue-600 dark:bg-orange-600 text-white shadow-xs'
                              : 'bg-white dark:bg-[#181a26] border border-slate-200 dark:border-[#222636] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-orange-500/40'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#181a26] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-orange-500/40 hover:text-blue-600 dark:hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

