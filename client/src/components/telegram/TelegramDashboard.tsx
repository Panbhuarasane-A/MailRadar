import React, { useState } from 'react';
import { Email } from '../../types';
import { TelegramJobCard } from './TelegramJobCard';
import {
  filterAndSortTelegramJobs,
  JobSortOption,
  JobLocationFilter,
  JobSalaryFilter,
} from '../../utils/jobSorter';
import {
  Send,
  Plus,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle2,
  MapPin,
  DollarSign,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface TelegramDashboardProps {
  emails: Email[];
  isLoading: boolean;
  selectedChannel: string | null;
  onSelectChannel: (handle: string | null) => void;
  activePriorityFilter: string;
  onSelectPriorityFilter: (filter: string) => void;
  searchQuery: string;
  savedChannels: {
    handle: string;
    title?: string;
    messageCount: number;
    urgentCount: number;
    importantCount: number;
  }[];
  onOpenAddChannel: () => void;
  onSelectMessage: (msg: Email) => void;
  onRefresh: () => void;
  onStatusChange?: (emailId: string, status: 'read' | 'unread' | 'archived') => void;
}

export const TelegramDashboard: React.FC<TelegramDashboardProps> = ({
  emails,
  isLoading,
  selectedChannel,
  onSelectChannel,
  activePriorityFilter,
  onSelectPriorityFilter,
  searchQuery,
  savedChannels,
  onOpenAddChannel,
  onSelectMessage,
  onRefresh,
  onStatusChange,
}) => {
  // Tabs: 'active' | 'completed'
  const [statusTab, setStatusTab] = useState<'active' | 'completed'>('active');
  const [isVerifyingSites, setIsVerifyingSites] = useState(false);

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<JobSortOption>('date-desc');
  const [locationFilter, setLocationFilter] = useState<JobLocationFilter>('all');
  const [salaryFilter, setSalaryFilter] = useState<JobSalaryFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const handleVerifyAllSites = async () => {
    setIsVerifyingSites(true);
    try {
      const res = await fetch('/api/telegram/verify-all', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to verify sites:', err);
    } finally {
      setIsVerifyingSites(false);
    }
  };

  // Filter for Telegram messages only
  const telegramMessages = emails.filter((e) => e.provider === 'telegram');

  // Count active vs completed
  const activeCount = telegramMessages.filter((m) => m.status !== 'archived').length;
  const completedCount = telegramMessages.filter((m) => m.status === 'archived').length;

  // Use the advanced filter and sorter
  const { filtered } = filterAndSortTelegramJobs(telegramMessages, {
    statusTab,
    priorityFilter: activePriorityFilter,
    selectedChannel,
    searchQuery,
    locationFilter,
    salaryFilter,
    sortBy,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Connected Channel Overview Cards */}
      {savedChannels.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Connected Channels
            </h2>
            {selectedChannel && (
              <button
                onClick={() => onSelectChannel(null)}
                className="text-xs text-blue-600 dark:text-orange-400 hover:underline font-semibold"
              >
                Show All Channels
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {savedChannels.map((ch) => {
              const isSelected = selectedChannel === ch.handle;
              return (
                <div
                  key={ch.handle}
                  onClick={() => onSelectChannel(isSelected ? null : ch.handle)}
                  className={`p-4 rounded-2xl bg-white dark:bg-[#12141c] border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 dark:border-orange-500/80 dark:ring-orange-500/20 shadow-xs'
                      : 'border-slate-200/80 dark:border-[#1e2230] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-100 dark:border-orange-500/20 flex items-center justify-center text-blue-600 dark:text-orange-400">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {ch.title || `@${ch.handle}`}
                        </h3>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">@{ch.handle}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-sans">
                      {ch.messageCount} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">jobs</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Telegram Message Feed Container */}
      <div className="space-y-4">
        {/* Main Controls Bar */}
        <div className="p-4 bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Active vs Completed Tabs with Smooth Sliding Pills */}
            <div className="flex items-center p-1 bg-slate-100/90 dark:bg-[#0c0d12] border border-slate-200/60 dark:border-[#1e2230] rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setStatusTab('active')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  statusTab === 'active'
                    ? 'bg-white dark:bg-[#181a26] text-blue-700 dark:text-orange-400 tab-pill-active border border-slate-200/60 dark:border-orange-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#151722]/50'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 transition-transform duration-200 ${statusTab === 'active' ? 'scale-110' : ''}`} />
                <span>Active Openings</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                  statusTab === 'active'
                    ? 'bg-blue-100 dark:bg-orange-500/20 text-blue-800 dark:text-orange-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusTab('completed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  statusTab === 'completed'
                    ? 'bg-white dark:bg-[#181a26] text-emerald-700 dark:text-emerald-400 tab-pill-active border border-slate-200/60 dark:border-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#151722]/50'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 transition-transform duration-200 ${statusTab === 'completed' ? 'scale-110' : ''}`} />
                <span>Completed / Applied</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                  statusTab === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {completedCount}
                </span>
              </button>
            </div>

            {/* Right Controls: Sort & Filter Toggle, Add Channel */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span className="font-semibold text-[11px] text-slate-500 dark:text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="priority" className="dark:bg-[#151722] dark:text-slate-200">Priority Score</option>
                  <option value="salary-desc" className="dark:bg-[#151722] dark:text-slate-200">Highest Salary (LPA)</option>
                  <option value="salary-asc" className="dark:bg-[#151722] dark:text-slate-200">Lowest Salary</option>
                  <option value="date-desc" className="dark:bg-[#151722] dark:text-slate-200">Newest Posted</option>
                  <option value="company-asc" className="dark:bg-[#151722] dark:text-slate-200">Company (A-Z)</option>
                </select>
              </div>

              {/* Verify Portals Button */}
              <button
                onClick={handleVerifyAllSites}
                disabled={isVerifyingSites}
                title="Verify employer career portals: auto-detects closed openings & updates deadlines"
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#151722] hover:bg-slate-50 dark:hover:bg-[#1c2030] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
              >
                <ShieldCheck className={`w-3.5 h-3.5 text-blue-600 dark:text-orange-400 ${isVerifyingSites ? 'animate-spin' : ''}`} />
                <span>{isVerifyingSites ? 'Verifying Portals...' : 'Verify Portals'}</span>
              </button>

              {/* Toggle Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  showFilters || locationFilter !== 'all' || salaryFilter !== 'all'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-orange-500/15 dark:border-orange-500/40 dark:text-orange-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-[#151722] dark:border-[#1e2230] dark:text-slate-300 dark:hover:bg-[#1c2030]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {(locationFilter !== 'all' || salaryFilter !== 'all') && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-orange-500" />
                )}
              </button>

              {/* Add Channel Button */}
              <button
                onClick={onOpenAddChannel}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Channel</span>
              </button>
            </div>
          </div>

          {/* Expandable Filter Panel: Salary Range & Location */}
          {showFilters && (
            <div className="pt-3 border-t border-slate-100 dark:border-[#1e2230] grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-[#0c0d12] p-3 rounded-xl">
              {/* Location Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Location / Mode
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value as any)}
                  className="w-full bg-white dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] rounded-xl p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all" className="dark:bg-[#151722]">All Locations</option>
                  <option value="remote" className="dark:bg-[#151722]">Work From Home / Remote</option>
                  <option value="bengaluru" className="dark:bg-[#151722]">Bengaluru / Bangalore</option>
                  <option value="pune" className="dark:bg-[#151722]">Pune</option>
                  <option value="chennai" className="dark:bg-[#151722]">Chennai</option>
                  <option value="hyderabad" className="dark:bg-[#151722]">Hyderabad</option>
                  <option value="mumbai" className="dark:bg-[#151722]">Mumbai / Maharashtra</option>
                </select>
              </div>

              {/* Salary Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Salary Package Range
                </label>
                <select
                  value={salaryFilter}
                  onChange={(e) => setSalaryFilter(e.target.value as any)}
                  className="w-full bg-white dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] rounded-xl p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all" className="dark:bg-[#151722]">All Salary Ranges</option>
                  <option value="10plus" className="dark:bg-[#151722]">₹10+ LPA (High CTC)</option>
                  <option value="6to10" className="dark:bg-[#151722]">₹6 LPA – ₹10 LPA</option>
                  <option value="3to6" className="dark:bg-[#151722]">₹3 LPA – ₹6 LPA</option>
                  <option value="internship" className="dark:bg-[#151722]">Internships / Stipend</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Priority Tier
                </label>
                <div className="flex items-center gap-1 pt-0.5">
                  {['all', 'urgent', 'important', 'normal'].map((p) => (
                    <button
                      key={p}
                      onClick={() => onSelectPriorityFilter(p)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                        activePriorityFilter === p
                          ? 'bg-blue-600 text-white dark:bg-orange-500 dark:text-slate-950 dark:font-bold'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-[#151722] dark:border-[#1e2230] dark:text-slate-300 dark:hover:bg-[#1c2030]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Feed - Structured Job Cards */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2 bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/80 dark:border-[#1e2230]">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-orange-400" />
            <div className="text-xs font-medium">Loading Telegram job postings...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-3 bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/80 dark:border-[#1e2230]">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              {statusTab === 'completed' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Send className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {statusTab === 'completed'
                  ? 'No completed or applied jobs yet'
                  : 'No active job postings matching filters'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {statusTab === 'completed'
                  ? 'Click "Mark Applied" on any job card to track it here.'
                  : 'Try adjusting your location, salary range, or priority filters.'}
              </p>
            </div>
            {(locationFilter !== 'all' || salaryFilter !== 'all' || activePriorityFilter !== 'all') && (
              <button
                onClick={() => {
                  setLocationFilter('all');
                  setSalaryFilter('all');
                  onSelectPriorityFilter('all');
                }}
                className="text-xs text-blue-600 dark:text-orange-400 font-semibold hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((msg) => (
              <TelegramJobCard
                key={msg.id}
                message={msg}
                onSelect={onSelectMessage}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
