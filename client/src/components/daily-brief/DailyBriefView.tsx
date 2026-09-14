import React from 'react';
import { DailyBriefData } from '../../types';
import { Sparkles, Calendar, CheckSquare, ArrowRight, TrendingUp } from 'lucide-react';
import { getPriorityTheme, getPriorityLabel } from '../../utils/categoryClassifier';

interface DailyBriefViewProps {
  data: DailyBriefData | null;
  isLoading: boolean;
  onNavigateToHotspots: () => void;
  onNavigateToActionCenter: () => void;
  onSelectEmailById: (id: string) => void;
}

export const DailyBriefView: React.FC<DailyBriefViewProps> = ({
  data,
  isLoading,
  onNavigateToHotspots,
  onNavigateToActionCenter,
  onSelectEmailById,
}) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-44 rounded-2xl bg-slate-100 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 rounded-xl bg-slate-100 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { headline, summaryStats, topHighlights, categoryBreakdown } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* AI Morning Intelligence Digest Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 text-blue-700 dark:text-orange-400 text-[11px] font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400" />
            AI MORNING BRIEFING • {new Date(data.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug mb-2">
            {headline}
          </h1>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Here is your daily executive intelligence summary synthesizing your urgent emails, high-stakes placement opportunities, and pending deliverables.
          </p>
        </div>
      </div>

      {/* Metric Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Urgent Alerts</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summaryStats.hotspotsCount}</div>
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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Today's Key Priority Highlights</h2>
          <button
            onClick={onNavigateToHotspots}
            className="text-xs text-blue-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>View in Inbox</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-[#1e2230]">
          {topHighlights.map((item) => {
            const theme = getPriorityTheme(item.priorityTier);
            const label = getPriorityLabel(item.priorityTier);

            return (
              <div
                key={item.id}
                onClick={() => onSelectEmailById(item.id)}
                className="p-4 hover:bg-slate-50/80 dark:hover:bg-[#151722]/80 transition-colors cursor-pointer select-none space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                      {label}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.subject}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{item.sender}</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.reasoning}</p>

                {item.actionSummary && (
                  <div className="text-[11px] text-blue-700 dark:text-orange-400 font-medium pt-0.5">
                    ⚡ Suggested Action: {item.actionSummary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
