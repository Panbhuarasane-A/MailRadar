import React, { useState } from 'react';
import { DailyBriefData } from '../../types';
import { Sparkles, Calendar, CheckSquare, ArrowRight, TrendingUp, Trash2, CheckCircle2 } from 'lucide-react';
import { getPriorityTheme, getPriorityLabel } from '../../utils/categoryClassifier';

interface DailyBriefViewProps {
  data: DailyBriefData | null;
  isLoading: boolean;
  onNavigateToHotspots: () => void;
  onNavigateToActionCenter: () => void;
  onSelectEmailById: (id: string) => void;
  onRemoveItem?: (id: string) => void;
}

export function cleanBriefReason(raw?: string | null): string {
  if (!raw) return '';
  return raw
    // Strip bracketed tag strings like [VIP Sender • Critical Urgency • ...]
    .replace(/\[[^\]]*\]\s*/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanActionSummary(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/^(?:Investigate and resolve critical incident|Authorize financial payment \/ contract|Complete placement drive application|Review requested deliverables for|Action needed|Task)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const DailyBriefView: React.FC<DailyBriefViewProps> = ({
  data,
  isLoading,
  onNavigateToHotspots,
  onNavigateToActionCenter,
  onSelectEmailById,
  onRemoveItem,
}) => {
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  if (isLoading || !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-44 rounded-2xl bg-slate-100 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-slate-100 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { headline, summaryStats, topHighlights } = data;
  const visibleHighlights = topHighlights.filter((item) => !removedIds.includes(item.id));
  const activeHotspotsCount = Math.max(0, summaryStats.hotspotsCount - removedIds.length);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemovedIds((prev) => [...prev, id]);
    if (onRemoveItem) {
      onRemoveItem(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* AI Morning Intelligence Digest Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-5 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 text-blue-700 dark:text-orange-400 text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400" />
            <span>AI MORNING BRIEFING • {new Date(data.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>

          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
            {headline}
          </h1>
        </div>
      </div>

      {/* Metric Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Urgent Alerts</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{activeHotspotsCount}</div>
        </div>

        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Important Notices</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summaryStats.importantCount}</div>
        </div>

        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Action Required</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-orange-400 mt-1">{summaryStats.actionRequiredCount}</div>
        </div>

        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deadlines in 24h</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{summaryStats.deadlines24hCount}</div>
        </div>
      </div>

      {/* Top Highlights List */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2230] flex items-center justify-between bg-slate-50/50 dark:bg-[#151722]/50">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Today's Priority Highlights</h2>
          <button
            onClick={onNavigateToHotspots}
            className="text-xs text-blue-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>View in Inbox</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {visibleHighlights.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">All priority highlights cleared</div>
            <p className="text-[11px] text-slate-400">No urgent briefing items remaining for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1e2230]">
            {visibleHighlights.map((item) => {
              const theme = getPriorityTheme(item.priorityTier);
              const label = getPriorityLabel(item.priorityTier);
              const cleanReason = cleanBriefReason(item.reasoning);
              const cleanAction = cleanActionSummary(item.actionSummary);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectEmailById(item.id)}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-[#151722]/80 transition-colors cursor-pointer select-none space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${theme.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                        {label}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{item.sender}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemove(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                        title="Remove from brief"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {cleanReason && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal line-clamp-2">
                      {cleanReason}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {cleanAction ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 border border-blue-200/80 dark:border-orange-500/20">
                        ⚡ Action: {cleanAction}
                      </span>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleRemove(item.id, e)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-1 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
