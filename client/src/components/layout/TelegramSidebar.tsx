import React from 'react';
import { Send, Plus, Trash2, RotateCcw, ExternalLink } from 'lucide-react';

export type TelegramPriorityFilter = 'all' | 'urgent' | 'important' | 'normal' | 'low';

interface TelegramSidebarProps {
  activePriorityFilter: TelegramPriorityFilter;
  onSelectPriorityFilter: (filter: TelegramPriorityFilter) => void;
  selectedChannel: string | null; // null for All Channels, or channel handle
  onSelectChannel: (handle: string | null) => void;
  savedChannels: {
    handle: string;
    title?: string;
    messageCount: number;
    urgentCount: number;
    importantCount: number;
  }[];
  counts: {
    total: number;
    urgent: number;
    important: number;
    normal: number;
    low: number;
  };
  onOpenAddChannel: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  onRemoveChannel?: (handle: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const TelegramSidebar: React.FC<TelegramSidebarProps> = ({
  activePriorityFilter,
  onSelectPriorityFilter,
  selectedChannel,
  onSelectChannel,
  savedChannels,
  counts,
  onOpenAddChannel,
  onSyncAll,
  isSyncing,
  onRemoveChannel,
  isMobileOpen = false,
  onCloseMobile,
}) => {
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
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto w-64 bg-white dark:bg-[#0c0d12] border-r border-slate-200/80 dark:border-[#1e2230] flex flex-col p-4 space-y-6 flex-shrink-0 select-none overflow-y-auto transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 1. TELEGRAM PRIORITY SECTION */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-2">
            Telegram Intelligence
          </div>
        <div className="space-y-0.5">
          {/* All Channels */}
          <button
            onClick={() => {
              onSelectChannel(null);
              onSelectPriorityFilter('all');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              selectedChannel === null && activePriorityFilter === 'all'
                ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600 dark:text-orange-400" />
              <span>All Channels</span>
            </div>
            {counts.total > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-100 dark:bg-[#181a26] text-slate-600 dark:text-slate-400">
                {counts.total}
              </span>
            )}
          </button>

          {/* Urgent */}
          <button
            onClick={() => {
              onSelectChannel(null);
              onSelectPriorityFilter('urgent');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              selectedChannel === null && activePriorityFilter === 'urgent'
                ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 dark:border dark:border-red-800/60 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Urgent</span>
            </div>
            {counts.urgent > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-semibold">
                {counts.urgent}
              </span>
            )}
          </button>

          {/* Important */}
          <button
            onClick={() => {
              onSelectChannel(null);
              onSelectPriorityFilter('important');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              selectedChannel === null && activePriorityFilter === 'important'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 dark:border dark:border-amber-800/60 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Important</span>
            </div>
            {counts.important > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold">
                {counts.important}
              </span>
            )}
          </button>

          {/* Normal */}
          <button
            onClick={() => {
              onSelectChannel(null);
              onSelectPriorityFilter('normal');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              selectedChannel === null && activePriorityFilter === 'normal'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 dark:border dark:border-blue-800/60 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Normal</span>
            </div>
            {counts.normal > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                {counts.normal}
              </span>
            )}
          </button>

          {/* Low Priority */}
          <button
            onClick={() => {
              onSelectChannel(null);
              onSelectPriorityFilter('low');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              selectedChannel === null && activePriorityFilter === 'low'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 dark:border dark:border-emerald-800/60 font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Low Priority</span>
            </div>
            {counts.low > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                {counts.low}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. CONNECTED CHANNELS SECTION */}
      <div>
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Channels
          </span>
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="text-[10px] text-blue-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1"
            title="Sync all channels"
          >
            <RotateCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {savedChannels.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-[#222636] rounded-xl">
              No channels added yet.
            </div>
          ) : (
            savedChannels.map((ch) => (
              <div
                key={ch.handle}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  selectedChannel === ch.handle
                    ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 dark:border dark:border-orange-500/30 font-semibold shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151722] hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => onSelectChannel(ch.handle)}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-400 text-[11px]">#</span>
                  <span className="truncate">{ch.title || `@${ch.handle}`}</span>
                </div>

                {onRemoveChannel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveChannel(ch.handle);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-opacity"
                    title="Remove channel"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Channel Button */}
        <button
          onClick={onOpenAddChannel}
          className="mt-3 w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-[#2a2f40] hover:border-blue-500 dark:hover:border-orange-500 hover:bg-blue-50/50 dark:hover:bg-orange-500/5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-orange-400 flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Channel Link</span>
        </button>
      </div>
    </aside>
    </>
  );
};

