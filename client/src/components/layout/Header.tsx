import React, { useState } from 'react';
import { SensitivityLevel } from '../../types';
import { Flame, RotateCcw, Sparkles, Sliders, Radio, Shield, Mail, Send } from 'lucide-react';

interface HeaderProps {
  hotspotsCount: number;
  sensitivity: SensitivityLevel;
  onSync: () => void;
  onOpenSimulator: () => void;
  onOpenConnectMailbox: () => void;
  onOpenTelegram: () => void;
  onOpenSettings: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hotspotsCount,
  sensitivity,
  onSync,
  onOpenSimulator,
  onOpenConnectMailbox,
  onOpenTelegram,
  onOpenSettings,
  isSyncing,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0a0d14]/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
      {/* Left: Logo & Radar Pulse */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden bg-black border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.4)] flex-shrink-0">
          <img
            src="/mailhinge-logo.jpg"
            alt="MailHinge"
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-white font-sans">
              MAIL HINGE <span className="text-rose-500">AI</span>
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              AI Priority Engine
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Multi-Channel Ingestion: Active</span>
          </div>
        </div>
      </div>

      {/* Right: Quick Controls & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Telegram Job Ingest Button */}
        <button
          onClick={onOpenTelegram}
          className="px-3 py-1.5 rounded-xl bg-sky-950/70 hover:bg-sky-900/80 border border-sky-500/50 text-sky-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          title="Ingest Telegram Job Postings"
        >
          <Send className="w-3.5 h-3.5 text-sky-400" />
          <span>+ Telegram Job</span>
        </button>

        {/* Connect Real Mailbox Button */}
        <button
          onClick={onOpenConnectMailbox}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Connect Mail</span>
        </button>

        {/* Simulator Button */}
        <button
          onClick={onOpenSimulator}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Test</span> Simulator
        </button>

        {/* Sync Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Sync Mailbox"
        >
          <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-rose-400' : ''}`} />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500/30 to-purple-500/30 border border-rose-500/30 flex items-center justify-center font-bold text-xs text-rose-300">
            MH
          </div>
          <div className="hidden lg:block text-left text-xs">
            <div className="font-semibold text-slate-200 leading-none">Mail Hinge AI Workspace</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Multi-User Isolated</div>
          </div>
        </div>
      </div>
    </header>
  );
};
