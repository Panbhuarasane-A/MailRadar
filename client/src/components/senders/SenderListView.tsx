import React, { useState } from 'react';
import { SenderProfile } from '../../types';
import { Star, Search, User, Check } from 'lucide-react';

interface SenderListViewProps {
  senders: SenderProfile[];
  isLoading: boolean;
  onToggleVip: (senderEmail: string, isVip: boolean) => void;
}

export const SenderListView: React.FC<SenderListViewProps> = ({
  senders,
  isLoading,
  onToggleVip,
}) => {
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState(false);

  const filtered = senders.filter((s) => {
    if (vipFilter && !s.isVip) return false;
    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      return (
        s.senderEmail.toLowerCase().includes(q) ||
        (s.senderName && s.senderName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">VIP Senders & Profiles</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
              {senders.filter((s) => s.isVip).length} VIPs
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            VIP senders automatically receive priority scoring multipliers (+25 points) and instant attention weighting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVipFilter(!vipFilter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              vipFilter
                ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-[#151722] border-slate-200 dark:border-[#1e2230] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1e2230]'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${vipFilter ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
            VIP Senders Only
          </button>
        </div>
      </div>

      {/* Senders Table Container */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2230] flex items-center justify-between bg-slate-50/50 dark:bg-[#151722]/50">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender email or name..."
              className="w-full bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
            />
          </div>

          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{filtered.length} profiles</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
            No sender profiles found matching search.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1e2230]">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-[#151722]/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1e2230] border border-slate-200 dark:border-[#2a3044] flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                    {(s.senderName || s.senderEmail).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {s.senderName || s.senderEmail.split('@')[0]}
                      {s.isVip && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{s.senderEmail}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{s.totalEmails} emails</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      Score: {s.importanceScore}
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleVip(s.senderEmail, !s.isVip)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      s.isVip
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                        : 'bg-white dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1e2230]'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${s.isVip ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                    {s.isVip ? 'VIP Active' : 'Set as VIP'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
