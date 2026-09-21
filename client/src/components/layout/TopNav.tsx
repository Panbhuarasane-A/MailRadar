import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Send,
  Search,
  RotateCcw,
  Settings,
  Sun,
  Moon,
  Users,
  ChevronDown,
  CheckCircle2,
  Plus,
  LogOut,
  User,
  ShieldCheck,
  Sparkles,
  Menu,
} from 'lucide-react';
import { UserProfile } from '../../types';

export type AppSection = 'mail' | 'telegram' | 'admin';

interface TopNavProps {
  currentSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  onNavigateHome?: () => void;
  mailCount: number;
  telegramCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenSettings: () => void;
  onOpenConnectMailbox: () => void;
  onOpenTutorial?: () => void;
  onToggleMobileSidebar?: () => void;
  // Theme & User Props
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: UserProfile | null;
  availableUsers?: UserProfile[];
  onOpenLoginModal: () => void;
  onOpenAuthPage?: () => void;
  onQuickSwitchUser?: (email: string, name?: string) => void;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentSection,
  onSectionChange,
  onNavigateHome,
  mailCount,
  telegramCount,
  searchQuery,
  onSearchChange,
  onSync,
  isSyncing,
  onOpenSettings,
  onOpenConnectMailbox,
  onOpenTutorial,
  onToggleMobileSidebar,
  theme,
  onToggleTheme,
  currentUser,
  availableUsers = [],
  onOpenLoginModal,
  onOpenAuthPage,
  onQuickSwitchUser,
  onLogout,
}) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';
  const userEmail = currentUser?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();
  const isAdmin = currentUser?.role === 'admin' || userEmail.toLowerCase().includes('admin');

  // Filter out any dummy emails from real accounts
  const dummyFilter = ['alex.chen@mailhinge.ai', 'elena.rostova@finance-exec.com', 'testuser@example.com'];
  const realOtherUsers = availableUsers.filter(
    (u) => u.email.toLowerCase() !== userEmail.toLowerCase() && !dummyFilter.includes(u.email.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0c0d12]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1e2230] px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-xs transition-colors duration-200">
      {/* Left: Brand Logo & Navigation Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Drawer Toggle */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-xl border border-slate-200/80 dark:border-[#222636] bg-slate-50 dark:bg-[#141620] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c1f2e] transition-colors active:scale-95"
            title="Open Menu"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div 
          onClick={() => {
            if (onNavigateHome) {
              onNavigateHome();
            } else {
              onSectionChange('mail');
            }
          }}
          className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer"
          title="Go to Dashboard"
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2">
            <img
              src="/mailhinge-logo.png"
              alt="Mail Hinge AI Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
            />
          </div>
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-sans flex items-center gap-1 select-none">
            <span>Mail Hinge</span>
            <span className="text-orange-500 font-black">AI</span>
            <span className="text-amber-400 text-xs">✦</span>
          </div>
        </div>

        {/* Workspace Switcher: Mail vs Telegram for standard users */}
        {!isAdmin && (
          <div className="flex items-center p-0.5 sm:p-1 bg-slate-100/90 dark:bg-[#13151f] rounded-xl border border-slate-200/60 dark:border-[#222636]">
            <button
              onClick={() => onSectionChange('mail')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                currentSection === 'mail'
                  ? 'bg-white dark:bg-[#1e2230] text-blue-600 dark:text-orange-400 shadow-xs border border-slate-200/80 dark:border-orange-500/30 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              <span>Mail</span>
              {mailCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-all ${
                    currentSection === 'mail'
                      ? 'bg-blue-100 dark:bg-orange-950/60 text-blue-700 dark:text-orange-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {mailCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSectionChange('telegram')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                currentSection === 'telegram'
                  ? 'bg-white dark:bg-[#1e2230] text-blue-600 dark:text-orange-400 shadow-xs border border-slate-200/80 dark:border-orange-500/30 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              <span>Telegram</span>
              {telegramCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-all ${
                    currentSection === 'telegram'
                      ? 'bg-blue-100 dark:bg-orange-950/60 text-blue-700 dark:text-orange-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {telegramCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Universal Search Input */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              isAdmin || currentSection === 'admin'
                ? 'Search users, feedbacks, API logs...'
                : currentSection === 'mail'
                ? 'Trace email, sender, company...'
                : 'Trace Telegram job alerts...'
            }
            className="w-full bg-slate-50 dark:bg-[#141620] border border-slate-200 dark:border-[#222636] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#181a26] focus:border-blue-500 dark:focus:border-orange-500/70 focus:ring-1 focus:ring-blue-500 dark:focus:ring-orange-500/30 transition-all"
          />
        </div>

        {/* Smooth Animated Theme Toggle Pill */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="relative inline-flex items-center h-8 w-14 rounded-full p-1 border border-slate-200/90 dark:border-[#2a2f40] bg-slate-100/90 dark:bg-[#151722] hover:bg-slate-200/80 dark:hover:bg-[#1a1d2b] transition-all duration-300 shadow-2xs group cursor-pointer select-none"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {/* Track background icons for context: Sun on left, Moon on right */}
          <div className="w-full flex items-center justify-between px-1 text-[11px] pointer-events-none">
            <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${theme === 'light' ? 'text-amber-500 opacity-100' : 'text-slate-400 opacity-60'}`} />
            <Moon className={`w-3.5 h-3.5 transition-opacity duration-200 ${theme === 'dark' ? 'text-indigo-400 opacity-100' : 'text-slate-400 opacity-60'}`} />
          </div>

          {/* Smooth Sliding Pill Thumb */}
          <div
            className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-[#222738] shadow-sm transform transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-90 ${
              theme === 'dark'
                ? 'translate-x-6 text-indigo-400 dark:text-orange-400 shadow-[0_0_10px_rgba(129,140,248,0.3)]'
                : 'translate-x-0 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
            }`}
          >
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 rotate-0 transition-transform duration-300 group-hover:-rotate-12 text-indigo-400 dark:text-orange-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 rotate-0 transition-transform duration-300 group-hover:rotate-45 text-amber-500" />
            )}
          </div>
        </button>

        {/* Manual Sync Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#141620] hover:bg-slate-50 dark:hover:bg-[#1c1f2e] text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
          title="Synchronize real mailbox and telemetry"
        >
          <RotateCcw
            className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${
              isSyncing ? 'animate-spin text-blue-600 dark:text-orange-400' : ''
            }`}
          />
          <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Interactive Tutorial Tour Button (Only for standard users) */}
        {!isAdmin && onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all hover:scale-102 active:scale-95 shadow-2xs group"
            title="Open Interactive Tutorial Tour"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 group-hover:rotate-12 transition-transform" />
            <span>Tour</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#141620] hover:bg-slate-50 dark:hover:bg-[#1c1f2e] text-slate-600 dark:text-slate-300 transition-colors shadow-2xs"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Connect Real Mailbox Shortcut (Only for standard users) */}
        {!isAdmin && (
          <button
            onClick={onOpenConnectMailbox}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-orange-950/40 border border-blue-200 dark:border-orange-500/30 text-blue-700 dark:text-orange-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-orange-900/40 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Connect Email</span>
          </button>
        )}

        {/* Interactive User Profile Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-1.5 pl-2.5 sm:pl-3 border-l border-slate-200 dark:border-[#1e2230] hover:opacity-80 transition-opacity"
            title="User Profile & Settings"
          >
            <div className={`w-8 h-8 rounded-xl ${isAdmin ? 'bg-gradient-to-br from-rose-600 to-red-700 ring-2 ring-rose-500/50' : 'bg-blue-600 dark:bg-gradient-to-br dark:from-orange-500 dark:to-orange-600'} text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0`}>
              {userInitial}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Clean User Profile Dropdown Menu with spring scale animation */}
          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-[#12141c]/95 backdrop-blur-xl border border-slate-200 dark:border-[#222636] rounded-2xl shadow-2xl py-2 z-50 animate-scale-in-spring text-slate-900 dark:text-slate-100 origin-top-right">
              {/* Active Profile Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1e2230]">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${isAdmin ? 'bg-gradient-to-br from-rose-600 to-red-700' : 'bg-blue-600 dark:bg-gradient-to-br dark:from-orange-500 dark:to-orange-600'} text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0`}>
                    {userInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {userName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{userEmail}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <ShieldCheck className="w-2.5 h-2.5 text-rose-500" />
                          <span>Admin Portal</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                          <span>Active Account</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Other Registered Accounts (Only visible to System Admin) */}
              {isAdmin && realOtherUsers.length > 0 && onQuickSwitchUser && (
                <div className="p-2 border-b border-slate-100 dark:border-[#1e2230]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Other Accounts
                  </div>
                  {realOtherUsers.map((acc) => (
                    <button
                      key={acc.id || acc.email}
                      onClick={() => {
                        onQuickSwitchUser(acc.email, acc.name || undefined);
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs flex items-center justify-between transition-colors hover:bg-slate-50 dark:hover:bg-[#181a26] text-slate-700 dark:text-slate-300"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200">
                          {(acc.name || acc.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="truncate">{acc.name || acc.email}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{acc.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Navigation & Actions */}
              <div className="p-2 space-y-1">
                {/* Admin Dashboard Switch (Strictly for Administrators) */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onSectionChange('admin');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-500" />
                    <span>Admin Intelligence Dashboard</span>
                  </button>
                )}

                {onOpenTutorial && (
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenTutorial();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2.5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>Interactive Tour & Guide</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    onOpenConnectMailbox();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181a26] flex items-center gap-2.5 transition-colors"
                >
                  <Mail className="w-4 h-4 text-blue-500 dark:text-orange-400" />
                  <span>Connect / Manage Email</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181a26] flex items-center gap-2.5 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings & Preferences</span>
                </button>

                <button
                  onClick={() => {
                    onToggleTheme();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#181a26] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-600" />
                    )}
                    <span>Theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-[#181a26] font-mono text-slate-500">
                    Toggle
                  </span>
                </button>
              </div>

              {/* Auth / Sign Out footer */}
              <div className="pt-2 px-2 border-t border-slate-100 dark:border-[#1e2230] space-y-1">
                {onOpenAuthPage && (
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenAuthPage();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2.5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>Switch / Add Account</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
