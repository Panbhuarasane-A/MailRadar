import React, { useState, useMemo } from 'react';
import { Mail, CheckCircle2, AlertCircle, Sparkles, X, ExternalLink, RotateCcw } from 'lucide-react';
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
  const [syncLimit, setSyncLimit] = useState('25');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct Google OAuth 2.0 Synchronization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GOOGLE OAUTH 2.0 MAIN CONTENT */}
        <div className="space-y-4">
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
                      {currentUser?.email}
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
                  className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer"
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
                Authenticate directly with your Google account. Mailo AI automatically connects and synchronizes your inbox securely without generating or entering any passwords.
              </p>

              <button
                type="button"
                onClick={handleGoogleOAuthConnect}
                disabled={isOAuthLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-[#151722] border border-slate-300 dark:border-[#1e2230] hover:bg-slate-50 dark:hover:bg-[#1c2030] text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all hover:shadow-sm disabled:opacity-50 cursor-pointer"
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

        {/* Alerts & Results */}
        {syncResult && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>{syncResult}</div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="leading-relaxed">
                {(() => {
                  const urlRegex = /(https?:\/\/[^\s]+)/g;
                  const match = errorMsg.match(urlRegex);
                  if (match && match[0]) {
                    const url = match[0];
                    return (
                      <>
                        <p>{errorMsg.split(url)[0]}</p>
                        <div className="pt-1">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all"
                          >
                            <span>Enable Gmail API in Google Cloud Console</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {errorMsg.split(url)[1] && (
                          <p className="text-[11px] text-red-700 dark:text-red-400 pt-1">
                            {errorMsg.split(url)[1]}
                          </p>
                        )}
                      </>
                    );
                  }
                  return errorMsg;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-[#1e2230]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
