import React from 'react';
import { AlertCircle, Clock, CheckCircle2, Layers, Flame } from 'lucide-react';

interface PrioritySummaryCardsProps {
  urgentCount: number;
  importantCount: number;
  normalCount: number;
  lowCount: number;
  totalCount: number;
  activeFilter?: string;
  onSelectFilter?: (filter: any) => void;
}

export const PrioritySummaryCards: React.FC<PrioritySummaryCardsProps> = ({
  urgentCount,
  importantCount,
  normalCount,
  lowCount,
  totalCount,
  activeFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      id: 'urgent',
      label: 'Urgent Hotspot',
      count: urgentCount,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50/70 dark:bg-red-950/40',
      border: 'border-red-200/80 dark:border-red-500/30',
      activeBorder: 'border-red-500 dark:border-red-400 ring-2 ring-red-100 dark:ring-red-900/40',
      dot: 'bg-red-500',
    },
    {
      id: 'important',
      label: 'Important',
      count: importantCount,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/70 dark:bg-amber-950/40',
      border: 'border-amber-200/80 dark:border-amber-500/30',
      activeBorder: 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/40',
      dot: 'bg-amber-500',
    },
    {
      id: 'normal',
      label: 'Normal',
      count: normalCount,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50/70 dark:bg-blue-950/40',
      border: 'border-blue-200/80 dark:border-blue-500/30',
      activeBorder: 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/40',
      dot: 'bg-blue-500',
    },
    {
      id: 'low',
      label: 'Low Priority',
      count: lowCount,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
      border: 'border-emerald-200/80 dark:border-emerald-500/30',
      activeBorder: 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-900/40',
      dot: 'bg-emerald-500',
    },
    {
      id: 'all',
      label: 'Total Mails',
      count: totalCount,
      color: 'text-slate-800 dark:text-white',
      bg: 'bg-slate-50 dark:bg-[#181a26]',
      border: 'border-slate-200 dark:border-[#1e2230]',
      activeBorder: 'border-slate-500 dark:border-orange-500 ring-2 ring-slate-100 dark:ring-orange-900/40',
      dot: 'bg-slate-500 dark:bg-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.id;
        return (
          <div
            key={card.id}
            onClick={() => onSelectFilter && onSelectFilter(card.id)}
            className={`p-3.5 rounded-2xl bg-white dark:bg-[#12141c] border transition-all cursor-pointer select-none ${
              isActive
                ? card.activeBorder
                : 'border-slate-200/80 dark:border-[#1e2230] hover:border-slate-300 dark:hover:border-[#2a2f40] hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.label}</span>
              <div className={`w-2 h-2 rounded-full ${card.dot}`} />
            </div>
            <div className={`text-2xl font-bold font-sans mt-1.5 ${card.color}`}>
              {card.count}
            </div>
          </div>
        );
      })}
    </div>
  );
};
