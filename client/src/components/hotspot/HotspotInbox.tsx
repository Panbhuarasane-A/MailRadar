import React, { useState, useMemo } from 'react';
import { Email, PriorityTier } from '../../types';
import { EmailCard } from './EmailCard';
import {
  Flame,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  Search,
  Filter,
  Inbox,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface HotspotInboxProps {
  emails: Email[];
  isLoading: boolean;
  onSelectEmail: (email: Email) => void;
  onStatusChange: (id: string, status: 'unread' | 'read' | 'archived') => void;
  onSnooze: (email: Email) => void;
  onFeedback: (emailId: string, action: 'thumbs_up' | 'thumbs_down') => void;
  onRefresh: () => void;
  onOpenSimulator: () => void;
}

export const HotspotInbox: React.FC<HotspotInboxProps> = ({
  emails,
  isLoading,
  onSelectEmail,
  onStatusChange,
  onSnooze,
  onFeedback,
  onRefresh,
  onOpenSimulator,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'active' | 'snoozed' | 'archived'>('active');

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      // View mode filter
      if (viewMode === 'active' && (email.status === 'archived' || email.status === 'snoozed')) return false;
      if (viewMode === 'snoozed' && email.status !== 'snoozed') return false;
      if (viewMode === 'archived' && email.status !== 'archived') return false;

      // Tier filter
      if (selectedTier !== 'all' && email.priorityTier !== selectedTier) return false;

      // Category filter
      if (selectedCategory !== 'all' && email.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchSubject = email.subject.toLowerCase().includes(q);
        const matchSender = (email.senderName || email.sender).toLowerCase().includes(q);
        const matchSnippet = email.bodySnippet.toLowerCase().includes(q);
        const matchReasoning = email.reasoning.toLowerCase().includes(q);
        if (!matchSubject && !matchSender && !matchSnippet && !matchReasoning) return false;
      }

      return true;
    });
  }, [emails, selectedTier, selectedCategory, searchQuery, viewMode]);

  const counts = useMemo(() => {
    const active = emails.filter((e) => e.status !== 'archived' && e.status !== 'snoozed');
    return {
      all: active.length,
      hotspot: active.filter((e) => e.priorityTier === 'hotspot').length,
      important: active.filter((e) => e.priorityTier === 'important').length,
      normal: active.filter((e) => e.priorityTier === 'normal').length,
      low: active.filter((e) => e.priorityTier === 'low').length,
      snoozed: emails.filter((e) => e.status === 'snoozed').length,
      archived: emails.filter((e) => e.status === 'archived').length,
    };
  }, [emails]);

  const tiers = [
    { id: 'all', label: 'All Items', icon: <Layers className="w-4 h-4" />, count: counts.all, color: 'text-slate-200' },
    {
      id: 'hotspot',
      label: 'Hotspots',
      icon: <Flame className="w-4 h-4 text-rose-500 animate-pulse" />,
      count: counts.hotspot,
      color: 'text-rose-400',
      activeBg: 'bg-rose-950/70 border-rose-500/80 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
    },
    {
      id: 'important',
      label: 'Important',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      count: counts.important,
      color: 'text-amber-400',
      activeBg: 'bg-amber-950/60 border-amber-500/70 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    },
    {
      id: 'normal',
      label: 'Normal',
      icon: <Info className="w-4 h-4 text-sky-400" />,
      count: counts.normal,
      color: 'text-sky-400',
      activeBg: 'bg-sky-950/50 border-sky-500/50 text-sky-300',
    },
    {
      id: 'low',
      label: 'Low Priority',
      icon: <Clock className="w-4 h-4 text-slate-400" />,
      count: counts.low,
      color: 'text-slate-400',
      activeBg: 'bg-slate-800 border-slate-700 text-slate-200',
    },
  ];

  const categories = ['all', 'work', 'finance', 'academic', 'personal', 'promotional'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Intelligence Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#121829] via-[#0f1523] to-[#0a0d14] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/30 to-amber-500/20 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <Flame className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Action-Centric Inbox
              {counts.hotspot > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono font-bold animate-pulse">
                  {counts.hotspot} HOTSPOT {counts.hotspot === 1 ? 'ALERT' : 'ALERTS'}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Emails dynamically prioritized by LLM urgency, explicit deadlines, VIP status, and action requirements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={onOpenSimulator}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simulate Incoming Email
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Ingestion Feed"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Priority Tier Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 bg-[#0e1320] p-1.5 rounded-2xl border border-slate-800">
          {tiers.map((tab) => {
            const isActive = selectedTier === tab.id && viewMode === 'active';
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedTier(tab.id);
                  setViewMode('active');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                  isActive
                    ? tab.activeBg || 'bg-slate-800 border-slate-600 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[11px] font-mono opacity-80">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Secondary Tabs (Snoozed / Archived) */}
        <div className="flex items-center gap-1 bg-[#0e1320] p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setViewMode('snoozed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'snoozed'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Snoozed ({counts.snoozed})
          </button>
          <button
            onClick={() => setViewMode('archived')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'archived'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived ({counts.archived})
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject, sender, reasoning..."
            className="w-full bg-[#111726] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium uppercase tracking-wider transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Email Cards Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredEmails.length > 0 ? (
        <div className="space-y-3.5">
          {filteredEmails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onSelect={onSelectEmail}
              onStatusChange={onStatusChange}
              onSnooze={onSnooze}
              onFeedback={onFeedback}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#0e1320] border border-slate-800/80">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No emails matching filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Try switching priority tier filters or simulate a new email scenario to see real-time intelligence scoring.
          </p>
          <button
            onClick={onOpenSimulator}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Simulate Email Scenario
          </button>
        </div>
      )}
    </div>
  );
};
