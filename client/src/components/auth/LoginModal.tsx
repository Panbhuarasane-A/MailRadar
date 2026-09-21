import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import {
  X,
  User,
  Mail,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Plus,
  Send,
  ShieldCheck,
  Key,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { TermsAndPrivacyModal } from '../common/TermsAndPrivacyModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  availableUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onLoginCustom: (email: string, password?: string, name?: string) => Promise<void>;
  onRegisterCustom?: (data: {
    email: string;
    name?: string;
    password?: string;
    initialChannels?: string[];
  }) => Promise<void>;
  onOpenFullAuthPage?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableUsers,
  onSelectUser,
  onLoginCustom,
  onRegisterCustom,
  onOpenFullAuthPage,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'switch'>('signin');

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Google OAuth Config State
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleRedirectUri, setGoogleRedirectUri] = useState('http://localhost:4000/api/auth/google/callback');
  const [isCopiedRedirect, setIsCopiedRedirect] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter real accounts
  const dummyFilter = ['alex.chen@mailhinge.ai', 'elena.rostova@finance-exec.com', 'testuser@example.com'];
  const realAvailableUsers = availableUsers.filter((u) => !dummyFilter.includes(u.email.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setShowGoogleConfig(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const status = await api.getGoogleAuthStatus();
      if (status.redirectUri) {
        setGoogleRedirectUri(status.redirectUri);
      }
      if (status.clientId) {
        setGoogleClientId(status.clientId);
      }

      if (status.isConfigured && status.authUrl) {
        window.location.href = status.authUrl;
      } else {
        // Open Google OAuth setup dialog
        setShowGoogleConfig(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Google OAuth');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSaveGoogleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleClientId.trim() || !googleClientSecret.trim()) {
      setErrorMsg('Please enter both Client ID and Client Secret.');
      return;
    }

    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const res = await api.configureGoogleOAuth(googleClientId.trim(), googleClientSecret.trim());
      if (res.isConfigured && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setSuccessMsg('Google OAuth configured successfully! Redirecting...');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to configure Google credentials.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(googleRedirectUri);
    setIsCopiedRedirect(true);
    setTimeout(() => setIsCopiedRedirect(false), 2000);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onLoginCustom(signInEmail.trim(), signInPassword.trim() || undefined);
      setSignInEmail('');
      setSignInPassword('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!agreedTerms) {
      setErrorMsg('Please review and agree to the Terms & Conditions to create an account.');
      setShowTermsModal(true);
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (onRegisterCustom) {
        await onRegisterCustom({
          email: regEmail.trim(),
          name: regName.trim() || undefined,
          password: regPassword.trim() || undefined,
        });
      } else {
        await api.register({
          email: regEmail.trim(),
          name: regName.trim() || undefined,
          password: regPassword.trim() || undefined,
        });
        await onLoginCustom(regEmail.trim(), regPassword.trim() || undefined, regName.trim() || undefined);
      }

      setSuccessMsg('Account created successfully!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 modal-backdrop">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200 max-h-[90vh] flex flex-col animate-scale-in-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1e2230] flex items-center justify-between bg-slate-50/50 dark:bg-[#0c0d12] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img
                src="/mailhinge-logo.png"
                alt="Mail Hinge AI Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]"
              />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Mailo AI</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold">
                  Accounts
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log in with Google OAuth 2.0 or switch between isolated workspaces
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenFullAuthPage && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullAuthPage();
                }}
                className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-orange-500/15 text-purple-700 dark:text-orange-300 hover:bg-purple-100 dark:hover:bg-orange-500/25 text-[11px] font-semibold flex items-center gap-1 border border-purple-200 dark:border-orange-500/30 transition-colors"
                title="Open full split-screen login page"
              >
                <Sparkles className="w-3 h-3" />
                <span>Full Page View</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#151722] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Active User Banner */}
          {currentUser && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-orange-500/10 border border-blue-200/80 dark:border-orange-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                  {(currentUser.name || currentUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {currentUser.name || 'User'}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active Session
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🌟 1. REAL GOOGLE OAUTH 2.0 SIGN IN BUTTON */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-[#151722] border border-slate-300 dark:border-[#1e2230] hover:bg-slate-50 dark:hover:bg-[#1c2030] dark:hover:border-orange-500/40 text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google (OAuth 2.0)'}</span>
            </button>
          </div>

          {/* GOOGLE OAUTH CONFIGURATION POPUP (if credentials need to be set) */}
          {showGoogleConfig && (
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-[#0c0d12] border border-blue-200 dark:border-[#1e2230] space-y-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="font-bold text-blue-900 dark:text-orange-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-600 dark:text-orange-400" />
                  <span>Configure Google OAuth 2.0 Credentials</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleConfig(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                <p>To enable real Google Sign-In & Gmail sync:</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>
                    Go to{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-orange-400 underline font-medium inline-flex items-center gap-0.5"
                    >
                      Google Cloud Console Credentials <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
                  <li>
                    Add this <strong>Authorized Redirect URI</strong>:
                  </li>
                </ol>
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#151722] border border-blue-200 dark:border-[#1e2230] rounded-lg p-1.5 font-mono text-[10px] text-blue-800 dark:text-orange-300">
                  <span className="truncate flex-1">{googleRedirectUri}</span>
                  <button
                    type="button"
                    onClick={handleCopyRedirect}
                    className="px-2 py-0.5 rounded bg-blue-100 dark:bg-orange-500/20 text-blue-700 dark:text-orange-300 font-sans text-[10px] font-semibold flex items-center gap-1 hover:bg-blue-200"
                  >
                    {isCopiedRedirect ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{isCopiedRedirect ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveGoogleCredentials} className="space-y-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Google Client ID
                  </label>
                  <input
                    type="text"
                    required
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                    className="w-full bg-white dark:bg-[#151722] border border-slate-300 dark:border-[#1e2230] rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Google Client Secret
                  </label>
                  <input
                    type="password"
                    required
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                    className="w-full bg-white dark:bg-[#151722] border border-slate-300 dark:border-[#1e2230] rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isGoogleLoading}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save & Authorize with Google</span>
                </button>
              </form>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 dark:border-[#1e2230] w-full" />
            <span className="bg-white dark:bg-[#12141c] px-3 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider absolute">
              OR CONTINUE WITH WORKSPACE
            </span>
          </div>

          {/* Tab Selection */}
          <div className={`grid ${realAvailableUsers.length > 1 ? 'grid-cols-3' : 'grid-cols-2'} p-1 rounded-xl bg-slate-100 dark:bg-[#0c0d12] border border-slate-200/60 dark:border-[#1e2230] text-xs`}>
            {realAvailableUsers.length > 1 && (
              <button
                onClick={() => {
                  setActiveTab('switch');
                  setErrorMsg('');
                }}
                className={`py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'switch'
                    ? 'bg-white dark:bg-[#151722] text-blue-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Switch Account</span>
              </button>
            )}
            <button
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg('');
              }}
              className={`py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'bg-white dark:bg-[#151722] text-blue-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
              }}
              className={`py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-[#151722] text-blue-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Account</span>
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: REAL REGISTERED ACCOUNTS */}
          {activeTab === 'switch' && realAvailableUsers.length > 1 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Registered Workspace Accounts
              </div>

              {realAvailableUsers.map((account) => {
                const isCurrent = currentUser?.email.toLowerCase() === account.email.toLowerCase();
                return (
                  <div
                    key={account.id || account.email}
                    onClick={() => {
                      if (!isCurrent) {
                        onLoginCustom(account.email, undefined, account.name || undefined).then(onClose);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-blue-50/50 dark:bg-[#151722] border-blue-300 dark:border-orange-500/60 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0c0d12] border-slate-200 dark:border-[#1e2230] hover:border-blue-400 dark:hover:border-orange-500/30 hover:bg-white dark:hover:bg-[#151722]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs flex-shrink-0 ${
                          isCurrent
                            ? 'bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 shadow-xs'
                            : 'bg-slate-200 dark:bg-[#151722] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {(account.name || account.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {account.name || account.email}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {account.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <span className="text-xs font-bold text-blue-600 dark:text-orange-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>Switch</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: SIGN IN FORM */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-orange-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-orange-500 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 mt-3"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Log In to Workspace</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: REGISTER NEW USER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. john.doe@domain.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Terms Agreement checkbox & Policy Review CTA */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-orange-500 focus:ring-blue-500 bg-slate-50 dark:bg-[#0c0d12] cursor-pointer"
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-blue-600 dark:text-orange-400 font-bold underline hover:text-blue-700 dark:hover:text-orange-300 transition-colors"
                      >
                        Terms & Conditions
                      </button>
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-[11px] text-blue-600 dark:text-orange-400 underline font-medium hover:text-blue-800 dark:hover:text-orange-300"
                  >
                    Review Policy
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5.5 leading-tight">
                  We suggest reviewing our terms & privacy policy before creating your workspace.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 mt-3"
              >
                {isSubmitting ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Account & Start Workspace</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Terms & Privacy Policy Modal */}
      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAgreedTerms(true);
          setShowTermsModal(false);
        }}
      />
    </div>
  );
};
