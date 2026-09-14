import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Zap,
  Mail,
  Send,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Flame,
  Briefcase,
  Key,
  CheckSquare,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { AppSection } from '../layout/TopNav';
import { MailView } from '../layout/MailSidebar';

interface TutorialTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  onNavigateSection?: (section: AppSection) => void;
  onNavigateMailView?: (view: MailView) => void;
  onOpenConnectMailbox?: () => void;
  onOpenTelegramModal?: () => void;
}

interface TourStep {
  id: number;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  robotSpeech: string;
  illustrationType: 'welcome' | 'radar_score' | 'oauth_sync' | 'telegram' | 'action_center' | 'ready';
  liveActionText?: string;
  onLiveAction?: () => void;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  symbol: string;
  size: number;
  driftX: number;
  driftY: number;
  duration: number;
}

export const TutorialTourModal: React.FC<TutorialTourModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userName,
  onNavigateSection,
  onNavigateMailView,
  onOpenConnectMailbox,
  onOpenTelegramModal,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [activeCategoryDemo, setActiveCategoryDemo] = useState<'urgent' | 'career' | 'security' | 'task'>('urgent');

  // Spawn stardust sparkle confetti on step change or celebration
  const triggerConfetti = useCallback((count = 20) => {
    const symbols = ['✦', '★', '✧', '✨', '✵', '•', '🎉'];
    const colors = ['#C084FC', '#38BDF8', '#FDE047', '#F472B6', '#34D399', '#FB923C', '#A78BFA'];
    const newItems: ConfettiParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      newItems.push({
        id: Date.now() + Math.random(),
        x: 50 + (Math.random() - 0.5) * 20,
        y: 40 + (Math.random() - 0.5) * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        size: Math.random() > 0.5 ? 14 : 9,
        driftX: Math.cos(angle) * dist,
        driftY: Math.sin(angle) * dist - 20,
        duration: 1.2 + Math.random() * 0.8,
      });
    }

    setConfetti((prev) => [...prev.slice(-25), ...newItems]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerConfetti(15);
    }
  }, [isOpen, triggerConfetti]);

  // Clean up confetti
  useEffect(() => {
    if (confetti.length === 0) return;
    const timer = setTimeout(() => {
      setConfetti((prev) => prev.slice(5));
    }, 1500);
    return () => clearTimeout(timer);
  }, [confetti]);

  // Handle Complete or Close
  const handleFinish = () => {
    if (dontShowAgain && userEmail) {
      localStorage.setItem(`mailo_tutorial_seen_${userEmail}`, 'true');
    }
    localStorage.setItem('mailo_tutorial_seen_global', 'true');
    onClose();
  };

  const steps: TourStep[] = [
    {
      id: 0,
      badge: 'WELCOME TO MAILO AI',
      badgeColor: 'text-purple-300 bg-purple-500/10 border-purple-400/30',
      title: 'Action-Centric Email & Job Radar',
      subtitle: `Welcome aboard${userName ? `, ${userName}` : ''}! Let's tour your AI assistant.`,
      description:
        'Standard inboxes bury critical emails under hundreds of newsletters. Mailo AI autonomously scans, scores (0–100), and routes your emails so you never miss an urgent interview, placement drive, or deadline.',
      robotSpeech: "Hi there! I'm Mailo AI, your autonomous flight copilot. I'll filter out the noise and surface what matters in seconds!",
      illustrationType: 'welcome',
    },
    {
      id: 1,
      badge: '0–100 AI RADAR SCORING',
      badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-400/30',
      title: 'Smart Prioritization & Hotspots',
      subtitle: 'Instant categorization into 4 critical pillars.',
      description:
        'Every incoming message is evaluated for urgency, opportunity, security, and actionable tasks. Click the categories below to see how Mailo AI isolates high-priority items.',
      robotSpeech: 'Click on each category badge below to see how I score and tag urgent messages in real-time!',
      illustrationType: 'radar_score',
    },
    {
      id: 2,
      badge: 'GOOGLE OAUTH & IMAP SYNC',
      badgeColor: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/30',
      title: 'Connect Real Mailboxes in 1 Click',
      subtitle: 'Seamless Google Sign-In with end-to-end user isolation.',
      description:
        'Link your Gmail via Google OAuth 2.0 or connect any custom IMAP provider. Your emails are parsed privately with zero data leakage between multi-user accounts.',
      robotSpeech: 'Your credentials and sync tokens are strictly isolated. Hit "Connect Email" in the top bar whenever you want to link a mailbox!',
      illustrationType: 'oauth_sync',
      liveActionText: 'Open Mailbox Connect Modal',
      onLiveAction: () => {
        if (onOpenConnectMailbox) onOpenConnectMailbox();
      },
    },
    {
      id: 3,
      badge: 'TELEGRAM HIRING SCRAPER',
      badgeColor: 'text-blue-300 bg-blue-500/10 border-blue-400/30',
      title: 'Live Campus & Job Channel Scraping',
      subtitle: 'Switch between Mail and Telegram workspaces seamlessly.',
      description:
        'Ingest public Telegram channels (e.g. @placementdriveofficial) to auto-extract company requirements, batch eligibility, stipends, and direct application links without opening Telegram.',
      robotSpeech: 'Use the top-left toggle to jump between Mail and Telegram channels anytime!',
      illustrationType: 'telegram',
      liveActionText: 'Switch to Telegram Workspace',
      onLiveAction: () => {
        if (onNavigateSection) onNavigateSection('telegram');
      },
    },
    {
      id: 4,
      badge: 'ACTION CENTER & PRODUCTIVITY',
      badgeColor: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
      title: 'Turn Chaos into Deliverables',
      subtitle: 'Built-in Todo, Call Sheets, Habit Tracker & Pomodoro.',
      description:
        'Mailo AI automatically converts action items inside emails into actionable tasks. Use the Daily Brief for morning summaries and Call Sheets for deadline timelines.',
      robotSpeech: 'Never miss a submission deadline! Tasks are automatically captured and scheduled in your Call Sheet.',
      illustrationType: 'action_center',
      liveActionText: 'View Action Center',
      onLiveAction: () => {
        if (onNavigateSection) onNavigateSection('mail');
        if (onNavigateMailView) onNavigateMailView('action-center');
      },
    },
    {
      id: 5,
      badge: 'FLIGHT READY 🚀',
      badgeColor: 'text-pink-300 bg-pink-500/10 border-pink-400/30',
      title: "You're All Set to Take Off!",
      subtitle: 'Explore your customized Mailo AI command center.',
      description:
        'Quick Tip: You can reopen this interactive tour at any time from your Profile menu in the top right. Hit the button below to launch your inbox!',
      robotSpeech: "All systems nominal! Let's conquer your inbox together. Ready when you are!",
      illustrationType: 'ready',
    },
  ];

  const current = steps[currentStep];

  // Keyboard Navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < steps.length - 1) {
          setCurrentStep((prev) => prev + 1);
          triggerConfetti(10);
        } else {
          handleFinish();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps.length, triggerConfetti]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Dynamic Stardust Sparkles */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="fixed pointer-events-none stardust-particle font-mono z-60"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            color: c.color,
            fontSize: `${c.size}px`,
            textShadow: `0 0 10px ${c.color}, 0 0 20px ${c.color}`,
            '--drift-x': `${c.driftX}px`,
            '--drift-y': `${c.driftY}px`,
            animationDuration: `${c.duration}s`,
          } as any}
        >
          {c.symbol}
        </div>
      ))}

      {/* Main Glassmorphic Modal Card */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1C1733] via-[#140F26] to-[#0D0A1A] border border-purple-500/30 rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_-15px_rgba(147,51,234,0.35)] overflow-hidden animate-scale-in-spring text-slate-100 flex flex-col max-h-[92vh]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-purple-500/20 via-cyan-500/10 to-transparent pointer-events-none" />

        {/* Modal Header: Step Progress & Close */}
        <div className="relative z-10 px-6 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-black border border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.4)] flex-shrink-0">
              <img
                src="/mailo-logo.jpg"
                alt="Mailo AI Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Mailo AI Quick Tour</span>
                <span className="text-slate-400">•</span>
                <span className="text-purple-300">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Interactive navigation guide</div>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors border border-white/5"
            title="Skip Tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-Segment Step Progress Bar */}
        <div className="px-6 pt-3">
          <div className="grid grid-cols-6 gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentStep(idx);
                  triggerConfetti(8);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                    : idx < currentStep
                    ? 'bg-purple-500/60'
                    : 'bg-white/10 hover:bg-white/25'
                }`}
                title={`Jump to step ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 relative z-10 flex-1">
          {/* Animated Mascot Speech Bubble */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 backdrop-blur-md shadow-inner">
            {/* Animated Mini 3D Mailo Robot Avatar */}
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-[#3B2D6B] to-[#1E1738] border border-purple-400/60 flex-shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-bounce-subtle">
              {/* Antenna Star */}
              <div className="absolute -top-2 w-2.5 h-2.5 rounded-full bg-cyan-300 border border-white shadow-[0_0_8px_#38BDF8] flex items-center justify-center">
                <span className="text-[6px] text-purple-950 font-black">✦</span>
              </div>
              {/* Visor Screen */}
              <div className="w-8 h-4 rounded-lg bg-[#080514] border border-cyan-400/40 flex items-center justify-around px-1 overflow-hidden relative">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#38BDF8] animate-pulse" />
                <div className="w-0.5 h-2 bg-purple-400 rounded-full" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#38BDF8] animate-pulse" />
              </div>
              {/* Thruster Flame */}
              <div className="absolute -bottom-1.5 w-3 h-2 bg-gradient-to-b from-cyan-400 to-transparent rounded-b-full animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                <span>Mailo Assistant Tip</span>
              </div>
              <p className="text-xs text-purple-100/90 mt-0.5 leading-relaxed font-sans">
                "{current.robotSpeech}"
              </p>
            </div>
          </div>

          {/* Step Main Title & Description */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border tracking-wide uppercase shadow-xs">
              <span className={current.badgeColor}>{current.badge}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed font-sans">
              {current.description}
            </p>
          </div>

          {/* Dynamic Interactive Illustration Card per Step */}
          <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4 relative overflow-hidden backdrop-blur-sm">
            {/* Step 0: Welcome Feature Grid */}
            {current.illustrationType === 'welcome' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Hotspot Detection</div>
                    <div className="text-[10px] text-purple-200/60">Flags 90+ urgent score emails</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Job & Placement Radar</div>
                    <div className="text-[10px] text-purple-200/60">Offers, interviews & alerts</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Security OTP Vault</div>
                    <div className="text-[10px] text-purple-200/60">Auto-extracted 1-click codes</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Action Center</div>
                    <div className="text-[10px] text-purple-200/60">Automated task deliverables</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Interactive Priority Score Radar Demo */}
            {current.illustrationType === 'radar_score' && (
              <div className="space-y-3">
                {/* Category Pill Switchers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setActiveCategoryDemo('urgent')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                      activeCategoryDemo === 'urgent'
                        ? 'bg-rose-500/30 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)] scale-102'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Urgent (99 pts)</span>
                  </button>

                  <button
                    onClick={() => setActiveCategoryDemo('career')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                      activeCategoryDemo === 'career'
                        ? 'bg-blue-500/30 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-102'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                    <span>Career (96 pts)</span>
                  </button>

                  <button
                    onClick={() => setActiveCategoryDemo('security')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                      activeCategoryDemo === 'security'
                        ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-102'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>OTP (91 pts)</span>
                  </button>

                  <button
                    onClick={() => setActiveCategoryDemo('task')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                      activeCategoryDemo === 'task'
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-102'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Task (88 pts)</span>
                  </button>
                </div>

                {/* Simulated Live Priority Card */}
                <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-400/30 transition-all duration-300 animate-fade-in flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 border border-white/10">
                        {activeCategoryDemo === 'urgent' && '🔴 HOTSPOT ALERT'}
                        {activeCategoryDemo === 'career' && '🔵 CAREER OFFER'}
                        {activeCategoryDemo === 'security' && '🟡 SECURITY PIN'}
                        {activeCategoryDemo === 'task' && '🟢 ACTION REQUIRED'}
                      </span>
                      <span className="text-[11px] text-purple-200/60">Received just now</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white">
                      {activeCategoryDemo === 'urgent' && 'Google: Final Round Interview Call Sheet'}
                      {activeCategoryDemo === 'career' && 'Microsoft: Offer Letter & Compensation Structure'}
                      {activeCategoryDemo === 'security' && 'GitHub: Verification Code 849-210'}
                      {activeCategoryDemo === 'task' && 'Action Task: Submit System Design RFC by 5 PM'}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-3">
                    <div className="text-base sm:text-lg font-mono font-black text-cyan-400">
                      {activeCategoryDemo === 'urgent' && '99 pts'}
                      {activeCategoryDemo === 'career' && '96 pts'}
                      {activeCategoryDemo === 'security' && '91 pts'}
                      {activeCategoryDemo === 'task' && '88 pts'}
                    </div>
                    <div className="text-[9px] font-mono text-purple-300/70 uppercase">Priority Rank</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Google OAuth Sync Demo */}
            {current.illustrationType === 'oauth_sync' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-purple-900/30 border border-cyan-400/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md">
                      <svg className="w-full h-full" viewBox="0 0 24 24">
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
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Google OAuth 2.0 Service</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Active
                        </span>
                      </div>
                      <div className="text-[11px] text-purple-200/70 font-mono">
                        {userEmail || 'panbhuofficial@gmail.com'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Multi-User Isolated</span>
                  </div>
                </div>

                {current.liveActionText && (
                  <button
                    onClick={current.onLiveAction}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-xs font-semibold text-purple-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98"
                  >
                    <span>{current.liveActionText}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Telegram Live Scraper Demo */}
            {current.illustrationType === 'telegram' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#0e1626] border border-blue-400/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9]">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">@placementdriveofficial</div>
                      <div className="text-[10px] text-blue-300/70 font-mono">
                        Campus Hiring Alerts • 14 Jobs Scraped
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-mono font-bold">
                    AUTO-PARSING
                  </span>
                </div>

                {current.liveActionText && (
                  <button
                    onClick={current.onLiveAction}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-xs font-semibold text-blue-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98"
                  >
                    <span>{current.liveActionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Step 4: Action Center & Tools Demo */}
            {current.illustrationType === 'action_center' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-purple-900/20 border border-purple-500/20">
                    <CheckSquare className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <div className="text-[11px] font-bold text-white">Action Center</div>
                    <div className="text-[9px] text-purple-200/60">Extracted Tasks</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-900/20 border border-purple-500/20">
                    <Calendar className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                    <div className="text-[11px] font-bold text-white">Call Sheet</div>
                    <div className="text-[9px] text-purple-200/60">Live Timelines</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-900/20 border border-purple-500/20">
                    <Layers className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-[11px] font-bold text-white">Daily AI Brief</div>
                    <div className="text-[9px] text-purple-200/60">Morning Audio Brief</div>
                  </div>
                </div>

                {current.liveActionText && (
                  <button
                    onClick={current.onLiveAction}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-xs font-semibold text-emerald-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98"
                  >
                    <span>{current.liveActionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Step 5: Ready to Fly */}
            {current.illustrationType === 'ready' && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-purple-900/40 border border-purple-400/40 text-center space-y-2">
                <div className="inline-flex p-2.5 rounded-full bg-purple-500/30 border border-purple-300 text-cyan-300 shadow-[0_0_15px_rgba(168,85,247,0.6)] animate-pulse">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white">Ready for Autonomous Inbox Prioritization!</div>
                <div className="text-xs text-purple-200/70 max-w-sm mx-auto">
                  Use the top menu at any time to re-trigger this tour, configure custom AI categories, or sync new accounts.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Navigation Buttons & Persistent Preference */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/30 flex items-center justify-between gap-3 relative z-10">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-purple-400/40 text-purple-600 focus:ring-purple-500 bg-transparent"
            />
            <span className="text-[11px]">Don't show on login</span>
          </label>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1 border border-white/10 active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => {
                  setCurrentStep((prev) => prev + 1);
                  triggerConfetti(10);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/40 transition-all flex items-center gap-1.5 hover:scale-102 active:scale-95 border border-purple-400/40 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  triggerConfetti(35);
                  setTimeout(handleFinish, 300);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-purple-600/50 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 border border-white/40 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Launch Mailo AI 🚀</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
