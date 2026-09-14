import React from 'react';
import {
  Inbox,
  Mail,
  AlertCircle,
  Clock,
  Sparkles,
  CheckSquare,
  FileText,
  Star,
  Sliders,
  Award,
  Briefcase,
  GraduationCap,
  Folder,
  Layers,
  Calendar,
  Flame,
  PhoneCall,
  CalendarCheck,
  ListTodo,
  Zap,
  DollarSign,
  Code,
  Tag,
  Bell,
  Timer,
} from 'lucide-react';
import { CustomCategory } from '../../types';
import { MailCategoryType, getCategoryTheme, DEFAULT_CUSTOM_CATEGORIES } from '../../utils/categoryClassifier';

export type MailView =
  | 'inbox'
  | 'action-center'
  | 'todo-daywise'
  | 'habit-tracker'
  | 'pomodoro'
  | 'call-sheet'
  | 'deadline-calendar'
  | 'daily-brief'
  | 'senders'
  | 'settings';

export type MailPriorityFilter = 'all' | 'urgent' | 'important' | 'normal' | 'low';

const ICON_MAP: Record<string, React.ReactNode> = {
  Mail: <Mail className="w-4 h-4" />,
  Award: <Award className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  GraduationCap: <GraduationCap className="w-4 h-4" />,
  Folder: <Folder className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  Code: <Code className="w-4 h-4" />,
  Star: <Star className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Tag: <Tag className="w-4 h-4" />,
  Bell: <Bell className="w-4 h-4" />,
  Flame: <Flame className="w-4 h-4" />,
};

interface MailSidebarProps {
  currentView: MailView;
  onNavigateView: (view: MailView) => void;
  activePriorityFilter: MailPriorityFilter;
  onSelectPriorityFilter: (filter: MailPriorityFilter) => void;
  activeCategory: 'all' | MailCategoryType;
  onSelectCategory: (category: 'all' | MailCategoryType) => void;
  categories?: CustomCategory[];
  categoryCounts?: Record<string, number>;
  onOpenManageCategories?: () => void;
  counts: {
    total: number;
    urgent: number;
    important: number;
    normal: number;
    low: number;
    tasks: number;
    vips: number;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const MailSidebar: React.FC<MailSidebarProps> = ({
  currentView,
  onNavigateView,
  activePriorityFilter,
  onSelectPriorityFilter,
  activeCategory,
  onSelectCategory,
  categories = DEFAULT_CUSTOM_CATEGORIES,
  categoryCounts = {},
  onOpenManageCategories,
  counts,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const isInboxActive = currentView === 'inbox';

  const handleNav = (view: MailView) => {
    onNavigateView(view);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto w-64 md:w-60 bg-white dark:bg-[#0c0d12] border-r border-slate-200/80 dark:border-[#1e2230] flex flex-col p-4 space-y-6 flex-shrink-0 select-none overflow-y-auto transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 1. INTELLIGENCE INBOX */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-2">
            Intelligence
          </div>
        <div className="space-y-0.5">
          {/* All Inbox */}
          <button
            onClick={() => {
              onNavigateView('inbox');
              onSelectPriorityFilter('all');
              onSelectCategory('all');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              isInboxActive && activeCategory === 'all'
                ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 border border-transparent dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-blue-600 dark:text-orange-400" />
              <span className="font-semibold text-xs">All Inbox</span>
            </div>
            {counts.total > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-100 dark:bg-[#181a26] text-slate-600 dark:text-slate-400">
                {counts.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. CATEGORIES SECTION */}
      <div>
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Entities & Rules
          </div>
          {onOpenManageCategories && (
            <button
              onClick={onOpenManageCategories}
              className="text-[10px] font-semibold text-blue-600 dark:text-orange-400 hover:underline"
              title="Manage Categories"
            >
              + Edit
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {categories.map((cat) => {
            const isCatActive = isInboxActive && activeCategory === cat.id;
            const themeTokens = getCategoryTheme(cat.color);
            const iconNode = ICON_MAP[cat.icon || ''] || <Tag className="w-4 h-4" />;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  onNavigateView('inbox');
                  onSelectCategory(cat.id);
                  onSelectPriorityFilter('all');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isCatActive
                    ? `${themeTokens.bg} ${themeTokens.text} dark:bg-orange-500/10 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs`
                    : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className={`flex-shrink-0 ${isCatActive ? `${themeTokens.text} dark:text-orange-400` : 'text-slate-500 dark:text-orange-400/80'}`}>
                    {iconNode}
                  </div>
                  <span className="truncate">{cat.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TOOLS SECTION (Productivity & Tracking) */}
      <div className="pt-2 border-t border-slate-100 dark:border-[#1e2230]">
        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-2">
          Forensic & Action Tools
        </div>
        <div className="space-y-0.5">
          {/* Action Center Kanban */}
          <button
            onClick={() => onNavigateView('action-center')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'action-center'
                ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-orange-400" />
              <span>Kanban Tasks</span>
            </div>
            {counts.tasks > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-blue-100 dark:bg-orange-950 text-blue-700 dark:text-orange-300 font-semibold">
                {counts.tasks}
              </span>
            )}
          </button>

          {/* Daily Brief */}
          <button
            onClick={() => onNavigateView('daily-brief')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'daily-brief'
                ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-orange-400" />
              <span>Daily Brief</span>
            </div>
          </button>

          {/* Day-Wise To-Do */}
          <button
            onClick={() => onNavigateView('todo-daywise')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'todo-daywise'
                ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-blue-600 dark:text-orange-400" />
              <span>Day-Wise To-Do</span>
            </div>
          </button>

          {/* Habit Tracker */}
          <button
            onClick={() => onNavigateView('habit-tracker')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'habit-tracker'
                ? 'bg-amber-50 dark:bg-orange-500/10 text-amber-800 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500 dark:text-orange-400" />
              <span>Habit Tracker</span>
            </div>
          </button>

          {/* Pomodoro Focus Timer */}
          <button
            onClick={() => onNavigateView('pomodoro')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'pomodoro'
                ? 'bg-indigo-50 dark:bg-orange-500/10 text-indigo-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-600 dark:text-orange-400" />
              <span>Pomodoro Timer</span>
            </div>
          </button>

          {/* Unified Calendar */}
          <button
            onClick={() => onNavigateView('call-sheet')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'call-sheet' || currentView === 'deadline-calendar'
                ? 'bg-purple-50 dark:bg-orange-500/10 text-purple-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-orange-400" />
              <span>Calendar</span>
            </div>
          </button>

          {/* VIP Senders */}
          <button
            onClick={() => onNavigateView('senders')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'senders'
                ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 dark:text-orange-400" />
              <span>VIP Senders</span>
            </div>
            {counts.vips > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 dark:bg-orange-950 text-amber-700 dark:text-orange-300 font-semibold">
                {counts.vips}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => onNavigateView('settings')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500 dark:text-orange-400" />
              <span>Settings</span>
            </div>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

