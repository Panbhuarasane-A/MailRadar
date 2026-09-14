import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Key, CheckCircle2, AlertCircle, Sparkles, X, ExternalLink, HelpCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';

interface ConnectMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMailboxSynced: () => void;
  currentUser?: UserProfile | null;
}

export const ConnectMailboxModal: React.FC<ConnectMailboxModalProps> = ({
  isOpen,
  onClose,
  onMailboxSynced,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'manual'>('oauth');
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'custom'>('gmail');
  const [email, setEmail] = useState(() => currentUser?.email || localStorage.getItem('mailradar_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('mailradar_app_pass') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [host, setHost] = useState('imap.gmail.com');
  const [port, setPort] = useState('993');
  const [syncLimit, setSyncLimit] = useState('25');

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if current user is already connected via Google OAuth
  const isGoogleOAuthConnected = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.hasGoogleOAuth) return true;
    try {
      const prefs =
        typeof currentUser.preferences === 'string'
          ? JSON.parse(currentUser.preferences)
          : currentUser.preferences;
      if (prefs?.connectedMailbox?.provider === 'google_oauth') return true;
    } catch {}
    return false;
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && currentUser) {
      if (currentUser.email) setEmail(currentUser.email);
      if (currentUser.preferences) {
        try {
          const prefs =
            typeof currentUser.preferences === 'string'
              ? JSON.parse(currentUser.preferences)
              : currentUser.preferences;
          if (prefs.connectedMailbox) {
            if (prefs.connectedMailbox.email) setEmail(prefs.connectedMailbox.email);
            if (prefs.connectedMailbox.password) setPassword(prefs.connectedMailbox.password);
            if (prefs.connectedMailbox.provider) {
              if (prefs.connectedMailbox.provider === 'google_oauth') {
                setActiveTab('oauth');
              } else {
                setProvider(prefs.connectedMailbox.provider);
                setActiveTab('manual');
              }
            }
            if (prefs.connectedMailbox.host) setHost(prefs.connectedMailbox.host);
            if (prefs.connectedMailbox.port) setPort(String(prefs.connectedMailbox.port));
          }
        } catch (e) {}
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleGoogleOAuthConnect = async () => {
    setIsOAuthLoading(true);
    setErrorMsg(null);
    try {
      const status = await api.getGoogleAuthStatus();
      if (status.isConfigured && status.authUrl) {
        window.location.href = status.authUrl;
      } else {
        setErrorMsg('Google OAuth client credentials need to be configured. Please use the Google sign-in prompt in the login modal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate Google OAuth');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const handleSyncOAuth = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);

    try {
      const limit = parseInt(syncLimit, 10) || 25;
      const res = await api.syncGmailOAuth(limit);
      setSyncResult(res.message || `Successfully synced ${res.newCount} new email(s) via Google OAuth!`);
      onMailboxSynced();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync emails via Google OAuth.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProviderChange = (newProvider: 'gmail' | 'outlook' | 'custom') => {
    setProvider(newProvider);
    setTestResult(null);
    setErrorMsg(null);
    if (newProvider === 'gmail') {
      setHost('imap.gmail.com');
      setPort('993');
    } else if (newProvider === 'outlook') {
      setHost('outlook.office365.com');
      setPort('993');
    } else {
      setHost('');
      setPort('993');
    }
  };

  const handleTest = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter your email and app password');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setErrorMsg(null);

    try {
      const res = await api.testMailboxConnection({
        email: email.trim(),
        password: password.trim(),
        host: provider === 'custom' ? host : undefined,
        port: port ? parseInt(port, 10) : undefined,
        provider,
      });

      setTestResult({
        success: Boolean(res.success),
        message: res.message || (res.success ? 'Connected successfully!' : 'Connection failed'),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter your email and app password');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);

    try {
      const res = await api.syncRealMailbox({
        email: email.trim(),
        password: password.trim(),
        host: provider === 'custom' ? host : undefined,
        port: port ? parseInt(port, 10) : undefined,
        provider,
        limit: parseInt(syncLimit, 10),
      });

      localStorage.setItem('mailradar_email', email.trim());
      localStorage.setItem('mailradar_app_pass', password.trim());

      setSyncResult(res.message || `Synchronized ${res.syncedCount} emails successfully (${res.newCount} new)!`);
      onMailboxSynced();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync emails');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 modal-backdrop">
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] rounded-3xl max-w-lg w-full p-6 shadow-2xl z-10 space-y-4 text-slate-900 dark:text-slate-100 transition-colors max-h-[90vh] overflow-y-auto animate-scale-in-spring">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2230]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-100 dark:border-orange-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Connect Your Real Mailbox</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Run Mailo AI Intelligence on your actual inbox</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: OAuth vs Manual */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 dark:bg-[#0c0d12] border border-slate-200/60 dark:border-[#1e2230] rounded-2xl text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`py-2 px-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'bg-white dark:bg-[#181a26] text-blue-600 dark:text-orange-400 font-bold tab-pill-active border border-slate-200/60 dark:border-orange-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-[#151722]/60'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 transition-transform duration-200 ${activeTab === 'oauth' ? 'scale-110 text-blue-600 dark:text-orange-400' : ''}`} />
            <span>Google OAuth 2.0 (No Password)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-[#181a26] text-blue-600 dark:text-orange-400 font-bold tab-pill-active border border-slate-200/60 dark:border-orange-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-[#151722]/60'
            }`}
          >
            <Key className={`w-3.5 h-3.5 transition-transform duration-200 ${activeTab === 'manual' ? 'scale-110 text-blue-600 dark:text-orange-400' : ''}`} />
            <span>Manual IMAP / App Password</span>
          </button>
        </div>

        {/* TAB 1: GOOGLE OAUTH 2.0 (NO APP PASSWORD NEEDED) */}
        {activeTab === 'oauth' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {isGoogleOAuthConnected ? (
              /* Already Connected State */
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                        <span>Google Mailbox Connected via OAuth 2.0</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                        {currentUser?.email || email}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                    ACTIVE & SYNCED
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your mailbox is securely authorized via Google OAuth tokens. <strong>No App Password is required</strong>. Mailo AI synchronizes messages directly using the official Google Gmail REST API.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <div className="w-full sm:flex-1">
                    <select
                      value={syncLimit}
                      onChange={(e) => setSyncLimit(e.target.value)}
                      className="w-full bg-white dark:bg-[#151722] border border-slate-300 dark:border-[#1e2230] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="10">Fetch last 10 emails</option>
                      <option value="25">Fetch last 25 emails (Recommended)</option>
                      <option value="50">Fetch last 50 emails</option>
                      <option value="100">Fetch last 100 emails</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncOAuth}
                    disabled={isSyncing}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing Inbox...' : 'Sync Gmail Now'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Not Connected - 1-Click Connect Prompt */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-orange-500/10 dark:to-amber-500/10 border border-blue-200/80 dark:border-orange-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 dark:text-orange-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400" />
                    1-Click Direct Google OAuth (No App Password Needed)
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-orange-500/20 text-blue-700 dark:text-orange-300">
                    RECOMMENDED
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Authenticate directly with your Google account. Mailo AI automatically connects and synchronizes your inbox securely without generating or entering any 16-character App Passwords.
                </p>

                <button
                  type="button"
                  onClick={handleGoogleOAuthConnect}
                  disabled={isOAuthLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-[#151722] border border-slate-300 dark:border-[#1e2230] hover:bg-slate-50 dark:hover:bg-[#1c2030] text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all hover:shadow-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isOAuthLoading ? 'Connecting to Google...' : 'Connect Gmail via Google OAuth 2.0'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL IMAP / APP PASSWORD (OUTLOOK, CUSTOM, ETC.) */}
        {activeTab === 'manual' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Provider Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100/90 dark:bg-[#0c0d12] border border-slate-200/60 dark:border-[#1e2230] rounded-2xl">
              {[
                { id: 'gmail', label: 'Gmail / Google' },
                { id: 'outlook', label: 'Outlook / 365' },
                { id: 'custom', label: 'Custom IMAP' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                    provider === p.id
                      ? 'bg-white dark:bg-[#181a26] text-blue-600 dark:text-orange-400 font-bold tab-pill-active border border-slate-200/60 dark:border-orange-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-[#151722]/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Instructions Banner */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-orange-400 font-semibold">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-orange-400" />
                {provider === 'gmail' && 'Gmail App Password Instructions:'}
                {provider === 'outlook' && 'Outlook / Microsoft 365 Instructions:'}
                {provider === 'custom' && 'Custom IMAP Server Instructions:'}
              </div>

              {provider === 'gmail' && (
                <ol className="list-decimal list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed pl-1">
                  <li>Enable <strong>2-Step Verification</strong> in Google Account.</li>
                  <li>
                    Generate 16-char password at{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-orange-400 underline inline-flex items-center gap-0.5 font-medium"
                    >
                      myaccount.google.com/apppasswords <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                </ol>
              )}
              {provider === 'outlook' && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                  Use your full Outlook / Office365 email and generate an App Password in Microsoft Security Settings.
                </p>
              )}
              {provider === 'custom' && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                  Enter your IMAP server host, port (default 993 with SSL), and credentials below.
                </p>
              )}
            </div>

            {/* Input Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Your Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@domain.com"
                  className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#0c0d12] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  App Password / Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter App Password..."
                    className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-2.5 pr-10 text-xs text-slate-900 dark:text-slate-100 font-mono focus:bg-white dark:focus:bg-[#0c0d12] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {provider === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      IMAP Host
                    </label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="imap.domain.com"
                      className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      IMAP Port
                    </label>
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="993"
                      className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Fetch Recent Emails Limit
                </label>
                <select
                  value={syncLimit}
                  onChange={(e) => setSyncLimit(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#0c0d12] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                >
                  <option value="10" className="dark:bg-[#151722]">Last 10 emails (Fast)</option>
                  <option value="25" className="dark:bg-[#151722]">Last 25 emails (Recommended)</option>
                  <option value="50" className="dark:bg-[#151722]">Last 50 emails</option>
                  <option value="100" className="dark:bg-[#151722]">Last 100 emails</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Alerts & Results */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>{testResult.message}</div>
          </div>
        )}

        {syncResult && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>{syncResult}</div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1e2230]">
          {activeTab === 'manual' ? (
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || isSyncing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#151722] hover:bg-slate-200 dark:hover:bg-[#1c2030] text-slate-700 dark:text-slate-200 border border-transparent dark:border-[#1e2230] transition-colors disabled:opacity-50"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] transition-colors"
            >
              Close
            </button>
            {activeTab === 'manual' && (
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSyncing ? 'Syncing...' : 'Connect & Sync Inbox'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
