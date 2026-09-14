import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Radio,
  Calendar,
  Key,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { api, authStorage } from '../../services/api';
import { MailBot3D } from '../common/MailBot3D';

interface AuthPageProps {
  currentUser: UserProfile | null;
  availableUsers: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
  onSkipToApp?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  currentUser,
  availableUsers,
  onLoginSuccess,
  onSkipToApp,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Google OAuth Config Helper
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleRedirectUri, setGoogleRedirectUri] = useState('http://localhost:4000/api/auth/google/callback');
  const [isCopiedRedirect, setIsCopiedRedirect] = useState(false);

  // Benefits Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  const benefitsSlides = [
    {
      id: 0,
      icon: Zap,
      badge: 'ACTION-CENTRIC AI RADAR',
      badgeColor: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
      title: 'Action-Centric AI Prioritization',
      headline: 'Capturing What Matters, Filtering the Noise.',
      description:
        'Instant 0–100 priority scoring flags urgent job offers, VIP placement alerts, and critical deadlines before you open your inbox.',
      floatingWidget: {
        title: 'TechCorp Senior Engineer Offer',
        category: 'Hotspot • Urgent',
        score: '98 pts',
        badge: 'ACTION REQUIRED',
        time: 'Due Today at 5:00 PM',
      },
    },
    {
      id: 1,
      icon: Radio,
      badge: 'TELEGRAM HIRING SCRAPER',
      badgeColor: 'text-blue-300 bg-blue-400/10 border-blue-400/30',
      title: 'Telegram Live Channel Ingestion',
      headline: 'Automated Campus & Job Alerts.',
      description:
        'Directly scrapes public Telegram channels, auto-extracting role criteria, eligibility, application portals, and last dates.',
      floatingWidget: {
        title: '@placementdriveofficial',
        category: 'Live Channel Scraping',
        score: '+14 Jobs',
        badge: 'AUTO-PARSED',
        time: 'Synced 2 mins ago',
      },
    },
    {
      id: 2,
      icon: Calendar,
      badge: 'DEADLINE INTELLIGENCE',
      badgeColor: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
      title: 'Automated Tasks & Call Sheets',
      headline: 'Turn Inbox Chaos into Completed Deliverables.',
      description:
        'Auto-extracts actionable tasks, day-wise checklists, and live portal deadlines so you never miss an opportunity again.',
      floatingWidget: {
        title: 'Submit Final Technical Resume',
        category: 'Action Task Extracted',
        score: 'High Priority',
        badge: 'CALENDAR SYNC',
        time: 'Due in 4 hours',
      },
    },
    {
      id: 3,
      icon: Key,
      badge: 'GOOGLE OAUTH 2.0',
      badgeColor: 'text-purple-300 bg-purple-400/10 border-purple-400/30',
      title: 'Seamless Google OAuth & Multi-User',
      headline: 'Your Personal Workspace, Truly Isolated.',
      description:
        '1-click Google Sign-In, encrypted personal mailbox syncing, and dedicated feeds completely isolated for each user account.',
      floatingWidget: {
        title: 'panbhuofficial@gmail.com',
        category: 'Google OAuth Active',
        score: '100% Isolated',
        badge: 'REST API SYNC',
        time: 'Live Inbox Connected',
      },
    },
  ];

  // Automatically slide words every 3.8 seconds continuously
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % benefitsSlides.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [benefitsSlides.length]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const status = await api.getGoogleAuthStatus();
      if (status.redirectUri) setGoogleRedirectUri(status.redirectUri);
      if (status.clientId) setGoogleClientId(status.clientId);

      if (status.isConfigured && status.authUrl) {
        window.location.href = status.authUrl;
      } else {
        setShowGoogleModal(true);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (authMode === 'signup') {
        const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || undefined;

        const res = await api.register({
          email: email.trim(),
          name: fullName,
          password: password.trim() || undefined,
        });

        if (res.user) {
          authStorage.setActiveUserEmail(res.user.email);
          setSuccessMsg(`Welcome, ${res.user.name || res.user.email}!`);
          setTimeout(() => onLoginSuccess(res.user), 600);
        }
      } else {
        // Sign in
        const res = await api.login(email.trim(), password.trim() || undefined);
        if (res.user) {
          authStorage.setActiveUserEmail(res.user.email);
          setSuccessMsg(`Welcome back, ${res.user.name || res.user.email}!`);
          setTimeout(() => onLoginSuccess(res.user), 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#110E1B] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      {/* Main Split-Screen Container */}
      <div className="relative z-10 w-full max-w-6xl bg-[#181528]/95 border border-[#2D2644] rounded-[32px] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] backdrop-blur-xl">
        {/* ========================================================= */}
        {/* LEFT SIDE: ELEGANT ANIMATED BENEFITS HERO CARD (Cols 1-6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 relative p-8 sm:p-10 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#231B3D] via-[#1A1430] to-[#120E22] border-b lg:border-b-0 lg:border-r border-[#2E2749]">
          {/* Subtle animated background mesh pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#7C65C1_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Top Brand & Skip Navigation */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-black border border-orange-500/40 shadow-[0_0_16px_rgba(249,115,22,0.4)] flex-shrink-0 transition-transform duration-300 hover:scale-105">
                <img
                  src="/mailo-logo.jpg"
                  alt="Mailo AI Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  <span>Mailo</span>
                  <span className="text-orange-400 font-black">AI</span>
                  <span className="text-amber-400 text-xs">✦</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                    v2.0
                  </span>
                </div>
                <div className="text-[11px] text-purple-300/70 font-medium">
                  Action-Centric Email Intelligence
                </div>
              </div>
            </div>

            {onSkipToApp && (
              <button
                onClick={onSkipToApp}
                className="group px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <span>Go to dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {/* Middle: 3D Animated & Interactive Mail Sorting Robot */}
          <div className="relative z-10 my-4 py-2">
            <MailBot3D onExplore={onSkipToApp} />
          </div>

          {/* Bottom: Smooth Automatic Sliding Words Carousel */}
          <div className="relative z-10 space-y-4 pt-1">
            {/* Sliding Track Container */}
            <div className="relative overflow-hidden w-full min-h-[96px] sm:min-h-[86px]">
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,0.9,0.3,1)]"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {benefitsSlides.map((slide, idx) => {
                  const isActive = idx === currentSlide;
                  return (
                    <div
                      key={slide.id}
                      className={`w-full shrink-0 transition-all duration-700 ease-out pr-2 ${
                        isActive
                          ? 'opacity-100 scale-100 filter-none'
                          : 'opacity-10 blur-[1px] scale-[0.98]'
                      }`}
                    >
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
                        {slide.headline}
                      </h2>
                      <p className="text-xs text-purple-200/75 mt-1.5 leading-relaxed max-w-lg">
                        {slide.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carousel Navigation Indicators & Arrow Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {benefitsSlides.map((slide, idx) => {
                  const isActive = idx === currentSlide;
                  return (
                    <button
                      key={slide.id}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                        isActive
                          ? 'w-9 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 shadow-[0_0_12px_rgba(192,132,252,0.8)]'
                          : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                      title={slide.title}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + benefitsSlides.length) % benefitsSlides.length)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all border border-white/5 hover:border-white/20 active:scale-90"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % benefitsSlides.length)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all border border-white/5 hover:border-white/20 active:scale-90"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT SIDE: CLEAN MODERN AUTHENTICATION FORM (Cols 7-12) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-[#181528]">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Header: Title & Switch Link */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {authMode === 'signup' ? 'Create an account' : 'Welcome back'}
              </h1>

              <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                {authMode === 'signup' ? (
                  <>
                    <span>Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setErrorMsg('');
                      }}
                      className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors"
                    >
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    <span>Don't have an account?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setErrorMsg('');
                      }}
                      className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Error / Success Notifications */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-950/50 border border-red-800/80 text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* SIGN UP OR SIGN IN FORM */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* 2-Column Name fields for Sign Up */}
              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full bg-[#231F38] border border-[#3A3356] rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full bg-[#231F38] border border-[#3A3356] rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-[#231F38] border border-[#3A3356] rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Password with Eye Visibility Icon */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={authMode === 'signup'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'signup' ? 'Create your password' : 'Enter your password'}
                  className="w-full bg-[#231F38] border border-[#3A3356] rounded-2xl px-4 py-3 pr-11 text-xs text-white placeholder-slate-400 font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Terms Agreement checkbox */}
              {authMode === 'signup' && (
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-[#231F38]"
                  />
                  <span>
                    I agree to the{' '}
                    <span className="text-purple-400 underline hover:text-purple-300">
                      Terms & Conditions
                    </span>
                  </span>
                </label>
              )}

              {/* Main Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : authMode === 'signup' ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create account</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign in to Workspace</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider: Or continue with */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#342D4E] w-full" />
              <span className="bg-[#181528] px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider absolute">
                {authMode === 'signup' ? 'Or register with' : 'Or sign in with'}
              </span>
            </div>

            {/* Google OAuth 2.0 Sign In Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-3 px-4 rounded-2xl bg-[#231F38] border border-[#3A3356] hover:bg-[#2A2544] hover:border-purple-500/60 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google (OAuth 2.0)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google OAuth Setup Modal if credentials need entering */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#1C182E] border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <span>Configure Google OAuth 2.0</span>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed">
              <p>Add this Authorized Redirect URI in Google Cloud Console:</p>
              <div className="flex items-center gap-1.5 bg-[#120E22] border border-purple-500/30 rounded-xl p-2 font-mono text-[10px] text-purple-300">
                <span className="truncate flex-1">{googleRedirectUri}</span>
                <button
                  type="button"
                  onClick={handleCopyRedirect}
                  className="px-2 py-0.5 rounded bg-purple-600/40 hover:bg-purple-600 text-white font-sans text-[10px] font-semibold flex items-center gap-1"
                >
                  {isCopiedRedirect ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{isCopiedRedirect ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveGoogleCredentials} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                  Google Client ID
                </label>
                <input
                  type="text"
                  required
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full bg-[#120E22] border border-[#3A3356] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                  Google Client Secret
                </label>
                <input
                  type="password"
                  required
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder="GOCSPX-xxxx"
                  className="w-full bg-[#120E22] border border-[#3A3356] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="submit"
                disabled={isGoogleLoading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save & Authorize with Google</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
