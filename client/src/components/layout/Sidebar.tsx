import React from 'react';
import {
  Flame,
  CheckSquare,
  Sparkles,
  Users,
  Sliders,
  Radio,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export type NavView = 'inbox' | 'action-center' | 'daily-brief' | 'senders' | 'settings';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  hotspotsCount: number;
  tasksCount: number;
  vipsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  hotspotsCount,
  tasksCount,
  vipsCount,
}) => {
  const navItems = [
    {
      id: 'inbox' as NavView,
      label: 'Hotspot Inbox',
      icon: <Flame className="w-4 h-4" />,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'action-center' as NavView,
      label: 'Action Center',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'daily-brief' as NavView,
      label: 'Daily Brief',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      badge: 'AI',
      badgeColor: 'bg-purple-900/60 border border-purple-500 text-purple-300',
    },
    {
      id: 'senders' as NavView,
      label: 'VIP & Senders',
      icon: <Users className="w-4 h-4" />,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'settings' as NavView,
      label: 'Intelligence Tuning',
      icon: <Sliders className="w-4 h-4" />,
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <aside className="w-64 bg-[#0a0d14] border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)] flex-shrink-0">
      <div className="space-y-6">
        {/* Radar Status Widget */}
        <div className="p-3.5 rounded-2xl bg-[#111726] border border-slate-800 flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
            <Radio className="w-4 h-4 text-rose-400" />
            <div className="absolute inset-0 bg-rose-500/10 animate-ping opacity-40 rounded-full" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Mailo AI Intelligence</div>
            <div className="text-[10px] text-slate-400 font-mono">
              {hotspotsCount} Critical Hotspots
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 mb-2 font-bold">
            Navigation
          </div>

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-rose-400' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Explainable & Async
        </div>
        <div className="text-[10px] leading-tight text-slate-400">
          No fabricated deadlines. All AI scoring decisions are 100% transparent.
        </div>
      </div>
    </aside>
  );
};
