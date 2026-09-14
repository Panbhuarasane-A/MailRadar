import React from 'react';
import { PriorityTier } from '../../types';
import { Flame, AlertTriangle, Info, Clock } from 'lucide-react';

interface PriorityBadgeProps {
  tier: PriorityTier;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  tier,
  score,
  size = 'md',
  showScore = true,
}) => {
  const getBadgeConfig = () => {
    switch (tier) {
      case 'hotspot':
        return {
          bg: 'bg-rose-950/70 border-rose-500/80 text-rose-300',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.4)] ring-1 ring-rose-500/30',
          icon: <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
          label: 'HOTSPOT',
          textColor: 'text-rose-400 font-bold',
        };
      case 'important':
        return {
          bg: 'bg-amber-950/60 border-amber-500/70 text-amber-300',
          glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/30',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: 'IMPORTANT',
          textColor: 'text-amber-400 font-semibold',
        };
      case 'normal':
        return {
          bg: 'bg-sky-950/40 border-sky-500/40 text-sky-300',
          glow: 'shadow-[0_0_8px_rgba(56,189,248,0.15)]',
          icon: <Info className="w-3.5 h-3.5 text-sky-400" />,
          label: 'NORMAL',
          textColor: 'text-sky-400',
        };
      case 'low':
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-400',
          glow: '',
          icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
          label: 'LOW PRIORITY',
          textColor: 'text-slate-400',
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm'
      : 'px-2.5 py-1 text-xs';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wide uppercase transition-all duration-300 ${config.bg} ${config.glow} ${sizeClasses}`}
    >
      {config.icon}
      <span className={config.textColor}>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="ml-1 px-1.5 py-0.2 bg-black/40 rounded-full text-[10px] font-mono opacity-90">
          {Math.round(score)}
        </span>
      )}
    </div>
  );
};
