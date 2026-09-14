import React, { useState, useEffect, useMemo } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Flame,
  Sparkles,
  Coffee,
  Brain,
  CheckCircle2,
  ListTodo,
  Settings2,
  Bell,
  Clock,
  Zap,
  TrendingUp,
  Plus,
  Trash2,
  Check,
  Edit2,
  Sliders,
  X,
  Minus,
  CheckSquare,
} from 'lucide-react';

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

export interface FocusTask {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  isCompleted: boolean;
  tag?: string;
}

interface PomodoroSettings {
  focusDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number; // e.g. every 4 sessions
  soundEnabled: boolean;
  tickSoundEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

interface CompletedSession {
  id: string;
  taskTitle: string;
  durationMinutes: number;
  mode: PomodoroMode;
  completedAt: string;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  soundEnabled: true,
  tickSoundEnabled: false,
  autoStartBreaks: false,
  autoStartFocus: false,
};

const DEFAULT_FOCUS_TASKS: FocusTask[] = [
  {
    id: 'ft_1',
    title: '💻 Solve 2 LeetCode / DSA Problems',
    estimatedPomodoros: 2,
    completedPomodoros: 0,
    isCompleted: false,
    tag: 'Coding',
  },
  {
    id: 'ft_2',
    title: '📄 Refine Resume & Tailor for Roles',
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    isCompleted: false,
    tag: 'Career',
  },
  {
    id: 'ft_3',
    title: '✉️ Clear High Priority Urgent & Important Emails',
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    isCompleted: false,
    tag: 'Inbox',
  },
];

// Web Audio API Harmonic Synthesizers
function playHarmonicChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.85);
    });
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

function playSoftTick() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  } catch {}
}

export const PomodoroTimerView: React.FC = () => {
  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('mailradar_pomodoro_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Active Mode & Timer State
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedRounds, setCompletedRounds] = useState<number>(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem(`mailradar_pomodoro_rounds_${today}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Dedicated custom minutes input state for active mode
  const [customInputMins, setCustomInputMins] = useState<string>(settings.focusDuration.toString());

  // Custom Editable Focus Tasks
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>(() => {
    try {
      const saved = localStorage.getItem('mailradar_pomodoro_custom_tasks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FOCUS_TASKS;
  });

  // Selected Active Task ID
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    return focusTasks.length > 0 ? focusTasks[0].id : null;
  });

  // New task input state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskEst, setNewTaskEst] = useState(1);

  // Editing task inline state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Sessions History
  const [sessions, setSessions] = useState<CompletedSession[]>(() => {
    try {
      const saved = localStorage.getItem('mailradar_pomodoro_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Current active task computed object
  const activeTask = useMemo(() => {
    return focusTasks.find((t) => t.id === activeTaskId) || null;
  }, [focusTasks, activeTaskId]);

  const currentGoalTitle = activeTask ? activeTask.title : 'Deep Focus Session';

  // Persistence
  useEffect(() => {
    localStorage.setItem('mailradar_pomodoro_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('mailradar_pomodoro_custom_tasks', JSON.stringify(focusTasks));
  }, [focusTasks]);

  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem(`mailradar_pomodoro_rounds_${today}`, completedRounds.toString());
  }, [completedRounds]);

  useEffect(() => {
    localStorage.setItem('mailradar_pomodoro_sessions', JSON.stringify(sessions.slice(-30)));
  }, [sessions]);

  // Mode total duration helper
  const getTotalTimeForMode = (m: PomodoroMode): number => {
    switch (m) {
      case 'focus':
        return settings.focusDuration * 60;
      case 'short_break':
        return settings.shortBreakDuration * 60;
      case 'long_break':
        return settings.longBreakDuration * 60;
    }
  };

  const totalTime = getTotalTimeForMode(mode);

  // Sync custom input field when mode or duration changes
  useEffect(() => {
    const currentMins =
      mode === 'focus'
        ? settings.focusDuration
        : mode === 'short_break'
        ? settings.shortBreakDuration
        : settings.longBreakDuration;
    setCustomInputMins(currentMins.toString());
  }, [mode, settings.focusDuration, settings.shortBreakDuration, settings.longBreakDuration]);

  // Timer Tick Engine
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          if (settings.tickSoundEnabled && prev % 2 === 0) {
            playSoftTick();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, settings.tickSoundEnabled]);

  // Switch Mode
  const switchMode = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getTotalTimeForMode(newMode));
  };

  // Timer Finished
  const handleTimerComplete = () => {
    setIsRunning(false);
    if (settings.soundEnabled) {
      playHarmonicChime();
    }

    if (mode === 'focus') {
      const nextRounds = completedRounds + 1;
      setCompletedRounds(nextRounds);

      if (activeTaskId) {
        setFocusTasks((prev) =>
          prev.map((t) =>
            t.id === activeTaskId
              ? { ...t, completedPomodoros: t.completedPomodoros + 1 }
              : t
          )
        );
      }

      const newSession: CompletedSession = {
        id: 'sess_' + Date.now(),
        taskTitle: currentGoalTitle,
        durationMinutes: settings.focusDuration,
        mode: 'focus',
        completedAt: new Date().toISOString(),
      };
      setSessions((prev) => [newSession, ...prev]);

      if (nextRounds % settings.longBreakInterval === 0) {
        setMode('long_break');
        setTimeLeft(settings.longBreakDuration * 60);
        if (settings.autoStartBreaks) setIsRunning(true);
      } else {
        setMode('short_break');
        setTimeLeft(settings.shortBreakDuration * 60);
        if (settings.autoStartBreaks) setIsRunning(true);
      }
    } else {
      setMode('focus');
      setTimeLeft(settings.focusDuration * 60);
      if (settings.autoStartFocus) setIsRunning(true);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getTotalTimeForMode(mode));
  };

  const skipTimer = () => {
    if (window.confirm('Skip this session and move to the next mode?')) {
      handleTimerComplete();
    }
  };

  // Dedicated Duration Adjustment Handlers
  const handleSetDurationForCurrentMode = (newMinutes: number) => {
    const mins = Math.max(1, Math.min(300, newMinutes));
    if (mode === 'focus') {
      setSettings((s) => ({ ...s, focusDuration: mins }));
    } else if (mode === 'short_break') {
      setSettings((s) => ({ ...s, shortBreakDuration: mins }));
    } else if (mode === 'long_break') {
      setSettings((s) => ({ ...s, longBreakDuration: mins }));
    }

    if (!isRunning) {
      setTimeLeft(mins * 60);
    }
  };

  const handleStepDuration = (deltaMins: number) => {
    const currentMins =
      mode === 'focus'
        ? settings.focusDuration
        : mode === 'short_break'
        ? settings.shortBreakDuration
        : settings.longBreakDuration;
    handleSetDurationForCurrentMode(currentMins + deltaMins);
  };

  const handleApplyCustomMinutesInput = () => {
    const parsed = parseInt(customInputMins, 10);
    if (!isNaN(parsed) && parsed > 0) {
      handleSetDurationForCurrentMode(parsed);
    }
  };

  // Task Actions
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: FocusTask = {
      id: 'ft_' + Date.now(),
      title: newTaskTitle.trim(),
      estimatedPomodoros: Math.max(1, newTaskEst),
      completedPomodoros: 0,
      isCompleted: false,
      tag: 'Task',
    };
    setFocusTasks((prev) => [...prev, newTask]);
    if (!activeTaskId) setActiveTaskId(newTask.id);
    setNewTaskTitle('');
    setNewTaskEst(1);
    setIsAddingTask(false);
  };

  const handleToggleTaskComplete = (taskId: string) => {
    setFocusTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setFocusTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeTaskId === taskId) {
      const remaining = focusTasks.filter((t) => t.id !== taskId);
      setActiveTaskId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleStartEditing = (task: FocusTask) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEditing = (taskId: string) => {
    if (editingTitle.trim()) {
      setFocusTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, title: editingTitle.trim() } : t))
      );
    }
    setEditingTaskId(null);
  };

  const handleAdjustEst = (taskId: string, delta: number) => {
    setFocusTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, estimatedPomodoros: Math.max(1, t.estimatedPomodoros + delta) }
          : t
      )
    );
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress calculations
  const progress = Math.max(0, Math.min(1, 1 - timeLeft / (totalTime || 1)));

  // SVG Geometry constants for clock
  const size = 320;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth - 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  // Analog hand angle calculations
  const totalSeconds = totalTime - timeLeft;
  const secondHandRotation = (totalSeconds % 60) * 6; // 360 deg in 60s

  // Theme styling per mode
  const modeConfig = {
    focus: {
      label: 'Deep Focus',
      icon: <Brain className="w-5 h-5 text-indigo-500 animate-pulse" />,
      color: 'indigo',
      accentColor: '#6366F1',
      glowColor: 'rgba(99, 102, 241, 0.45)',
      gradientStart: '#818CF8',
      gradientEnd: '#4F46E5',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
      activeTab: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
      bgGlow: 'from-indigo-500/10 via-purple-500/5 to-transparent',
      currentDuration: settings.focusDuration,
      presets: [15, 20, 25, 30, 45, 50, 60],
    },
    short_break: {
      label: 'Short Break',
      icon: <Coffee className="w-5 h-5 text-emerald-500 animate-bounce" />,
      color: 'emerald',
      accentColor: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.45)',
      gradientStart: '#34D399',
      gradientEnd: '#059669',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
      activeTab: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      bgGlow: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      currentDuration: settings.shortBreakDuration,
      presets: [3, 5, 8, 10, 15],
    },
    long_break: {
      label: 'Long Rest',
      icon: <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />,
      color: 'amber',
      accentColor: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.45)',
      gradientStart: '#FBBF24',
      gradientEnd: '#D97706',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      activeTab: 'bg-amber-600 text-white shadow-lg shadow-amber-500/20',
      bgGlow: 'from-amber-500/10 via-orange-500/5 to-transparent',
      currentDuration: settings.longBreakDuration,
      presets: [15, 20, 25, 30, 45],
    },
  }[mode];

  // Daily statistics
  const totalFocusMinutesToday = useMemo(() => {
    const today = new Date().toDateString();
    return sessions
      .filter((s) => new Date(s.completedAt).toDateString() === today && s.mode === 'focus')
      .reduce((acc, curr) => acc + curr.durationMinutes, 0);
  }, [sessions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#12141c] p-6 rounded-3xl border border-slate-200/80 dark:border-[#1e2230] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 dark:from-orange-500 dark:to-orange-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 dark:shadow-orange-500/20">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pomodoro Focus Engine</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-orange-500/10 text-indigo-700 dark:text-orange-400 border border-transparent dark:border-orange-500/30">
                Focus Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dedicated time settings, clean analog clock face, and custom task manager
            </p>
          </div>
        </div>

        {/* Quick Top Stats & Sound Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] text-xs">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Today:</span>
            <span className="font-bold text-slate-900 dark:text-white">{completedRounds} 🍅</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="font-bold text-indigo-600 dark:text-orange-400">
              {Math.floor(totalFocusMinutesToday / 60)}h {totalFocusMinutesToday % 60}m
            </span>
          </div>

          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className={`p-2.5 rounded-xl border transition-colors ${
              settings.soundEnabled
                ? 'bg-slate-50 dark:bg-[#151722] text-indigo-600 dark:text-orange-400 border-slate-200 dark:border-[#1e2230]'
                : 'bg-slate-50 dark:bg-[#151722] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#1e2230]'
            }`}
            title={settings.soundEnabled ? 'Harmonic Chime Active' : 'Sound Alerts Muted'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column / Multi-Space Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (6 cols): Pure, Clean Animated Clock Face & Action Controls */}
        <div className="lg:col-span-6 bg-white dark:bg-[#12141c] p-8 rounded-3xl border border-slate-200/80 dark:border-[#1e2230] shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          {/* Ambient Radial Glow */}
          <div
            className={`absolute inset-0 bg-gradient-to-b ${modeConfig.bgGlow} pointer-events-none transition-all duration-700`}
          />

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] z-10 mb-4">
            <button
              onClick={() => switchMode('focus')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'focus'
                  ? modeConfig.activeTab
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Focus ({settings.focusDuration}m)
            </button>
            <button
              onClick={() => switchMode('short_break')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'short_break'
                  ? modeConfig.activeTab
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              Break ({settings.shortBreakDuration}m)
            </button>
            <button
              onClick={() => switchMode('long_break')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'long_break'
                  ? modeConfig.activeTab
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Rest ({settings.longBreakDuration}m)
            </button>
          </div>

          {/* Current Target Focus Task */}
          <div className="z-10 mb-3 text-center max-w-sm w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-50 dark:bg-[#151722] border border-slate-200/80 dark:border-[#1e2230] shadow-sm max-w-full">
              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 animate-bounce" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {currentGoalTitle}
              </span>
              {activeTask && (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-orange-400 bg-indigo-50 dark:bg-orange-500/10 border border-transparent dark:border-orange-500/30 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {activeTask.completedPomodoros}/{activeTask.estimatedPomodoros} 🍅
                </span>
              )}
            </div>
          </div>

          {/* CLEAN, UNCLUTTERED ANIMATED CLOCK FACE */}
          <div className="relative z-10 flex items-center justify-center my-2">
            {/* Ambient Breathing Backlight */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                isRunning ? 'scale-105 opacity-100 animate-pulse' : 'scale-95 opacity-0'
              }`}
              style={{
                boxShadow: `0 0 50px 8px ${modeConfig.glowColor}`,
              }}
            />

            {/* Clock SVG Dial */}
            <svg width={size} height={size} className="transform -rotate-90">
              <defs>
                <linearGradient id="pomodoroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={modeConfig.gradientStart} />
                  <stop offset="100%" stopColor={modeConfig.gradientEnd} />
                </linearGradient>

                <filter id="clockGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Outer Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-100 dark:text-slate-800/80"
              />

              {/* 60 Minute/Second Clock Dial Ticks */}
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i * 6 * Math.PI) / 180;
                const isHour = i % 5 === 0;
                const tickLen = isHour ? 10 : 4;
                const r1 = radius - 14;
                const r2 = r1 - tickLen;
                const x1 = center + r1 * Math.cos(angle);
                const y1 = center + r1 * Math.sin(angle);
                const x2 = center + r2 * Math.cos(angle);
                const y2 = center + r2 * Math.sin(angle);

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth={isHour ? 2 : 1}
                    className={
                      isHour
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-slate-200 dark:text-slate-800'
                    }
                  />
                );
              })}

              {/* Animated Glowing Progress Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="url(#pomodoroGradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-out"
                filter="url(#clockGlow)"
              />

              {/* Animated Rotating Sweep Hand */}
              {isRunning && (
                <g transform={`rotate(${secondHandRotation} ${center} ${center})`}>
                  <line
                    x1={center}
                    y1={center}
                    x2={center + radius - 24}
                    y2={center}
                    stroke={modeConfig.accentColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <circle
                    cx={center + radius - 24}
                    cy={center}
                    r="3.5"
                    fill={modeConfig.accentColor}
                    filter="url(#clockGlow)"
                  />
                </g>
              )}

              {/* Center Hub Marker */}
              <circle
                cx={center}
                cy={center}
                r="5"
                fill="currentColor"
                className="text-slate-400 dark:text-slate-500"
              />
            </svg>

            {/* PURE DIGITAL COUNTDOWN DISPLAY IN CENTER */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none z-10">
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 border ${modeConfig.badgeBg}`}>
                {modeConfig.icon}
                {modeConfig.label}
              </span>

              {/* Big Bold Clean Digital Time */}
              <div className="text-6xl sm:text-7xl font-black tracking-tight text-slate-900 dark:text-white font-mono flex items-center">
                <span>{formatTime(timeLeft).split(':')[0]}</span>
                <span className={`transition-opacity duration-300 ${isRunning ? 'animate-pulse text-indigo-500' : ''}`}>
                  :
                </span>
                <span>{formatTime(timeLeft).split(':')[1]}</span>
              </div>

              {/* Progress Percentage */}
              <div className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.round(progress * 100)}% Elapsed</span>
              </div>
            </div>
          </div>

          {/* Cycle Round Indicator Dots */}
          <div className="flex items-center gap-2 z-10 my-3">
            <span className="text-xs font-bold text-slate-400 mr-1">Rounds:</span>
            {Array.from({ length: settings.longBreakInterval }).map((_, idx) => {
              const roundNum = idx + 1;
              const isFilled = completedRounds % settings.longBreakInterval >= roundNum || (completedRounds > 0 && completedRounds % settings.longBreakInterval === 0);

              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                    isFilled
                      ? 'bg-indigo-600 text-white shadow-sm scale-110'
                      : 'bg-slate-200 dark:bg-slate-800 text-transparent'
                  }`}
                  title={`Round ${roundNum} of ${settings.longBreakInterval}`}
                >
                  {isFilled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              );
            })}
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-4 z-10 mt-1">
            <button
              onClick={resetTimer}
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              title="Reset Timer to Full Duration"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTimer}
              className={`px-8 py-3.5 rounded-2xl font-bold text-base text-white shadow-xl flex items-center gap-3 transition-all transform active:scale-95 ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 hover:scale-105'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-6 h-6 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            <button
              onClick={skipTimer}
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              title="Skip to Next Mode"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (6 cols): Dedicated Time Setting Space & Notion Tasks */}
        <div className="lg:col-span-6 space-y-6 flex flex-col">
          {/* SEPARATE DEDICATED SPACE: Time & Duration Configuration Card */}
          <div className="bg-white dark:bg-[#12141c] p-6 rounded-3xl border border-slate-200/80 dark:border-[#1e2230] shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#1e2230]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-orange-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Time Settings & Duration
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-orange-500/10 text-indigo-600 dark:text-orange-400 border border-transparent dark:border-orange-500/30">
                Active Mode: {modeConfig.label}
              </span>
            </div>

            {/* Stepper & Duration Editor */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <span>Adjust {modeConfig.label} Duration</span>
                  <span className="font-bold text-indigo-600 dark:text-orange-400 font-mono text-sm">
                    {modeConfig.currentDuration} mins
                  </span>
                </div>

                {/* Stepper Buttons (-5m, -1m, Value, +1m, +5m) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStepDuration(-5)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-slate-50 dark:bg-[#151722] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2230] text-xs font-bold transition-all active:scale-95"
                    title="Decrease by 5 minutes"
                  >
                    -5m
                  </button>
                  <button
                    onClick={() => handleStepDuration(-1)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-slate-50 dark:bg-[#151722] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2230] text-xs font-bold transition-all active:scale-95"
                    title="Decrease by 1 minute"
                  >
                    -1m
                  </button>

                  {/* Direct Numeric Input with Apply */}
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={customInputMins}
                      onChange={(e) => setCustomInputMins(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomMinutesInput()}
                      className="w-full text-center py-2 px-3 rounded-xl border border-indigo-200 dark:border-[#1e2230] bg-indigo-50/50 dark:bg-[#0c0d12] text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-orange-500 font-mono"
                      placeholder="Mins"
                    />
                    <button
                      onClick={handleApplyCustomMinutesInput}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Set
                    </button>
                  </div>

                  <button
                    onClick={() => handleStepDuration(1)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-slate-50 dark:bg-[#151722] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2230] text-xs font-bold transition-all active:scale-95"
                    title="Increase by 1 minute"
                  >
                    +1m
                  </button>
                  <button
                    onClick={() => handleStepDuration(5)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-slate-50 dark:bg-[#151722] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2230] text-xs font-bold transition-all active:scale-95"
                    title="Increase by 5 minutes"
                  >
                    +5m
                  </button>
                </div>
              </div>

              {/* Quick Presets Chips */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Quick Presets
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {modeConfig.presets.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleSetDurationForCurrentMode(mins)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        modeConfig.currentDuration === mins
                          ? 'bg-indigo-600 dark:bg-orange-500 text-white border-indigo-600 dark:border-orange-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#151722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e2230] hover:border-indigo-300 dark:hover:border-orange-500/50'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Automation & Sound Toggles */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#1e2230] grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.tickSoundEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, tickSoundEnabled: e.target.checked }))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Clock Ticking</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoStartBreaks}
                    onChange={(e) => setSettings((s) => ({ ...s, autoStartBreaks: e.target.checked }))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Auto-start Breaks</span>
                </label>
              </div>
            </div>
          </div>

          {/* Notion-Style Editable Focus Tasks Manager */}
          <div className="bg-white dark:bg-[#12141c] p-6 rounded-3xl border border-slate-200/80 dark:border-[#1e2230] shadow-sm flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-[#1e2230]">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-indigo-600 dark:text-orange-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Focus Goals & Tasks
                </h3>
              </div>

              <button
                onClick={() => setIsAddingTask(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-orange-500/10 text-indigo-600 dark:text-orange-400 border border-transparent dark:border-orange-500/30 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-orange-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Goal
              </button>
            </div>

            {/* Inline Add Task Form */}
            {isAddingTask && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#151722] border border-indigo-200 dark:border-[#1e2230] mb-3 space-y-2.5 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="e.g. Master Binary Search Trees & DP"
                  autoFocus
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-orange-500"
                />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Est. 🍅:</span>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNewTaskEst(n)}
                        className={`w-6 h-6 rounded-lg text-xs font-bold border ${
                          newTaskEst === n
                            ? 'bg-indigo-600 dark:bg-orange-500 text-white border-indigo-600 dark:border-orange-500'
                            : 'bg-white dark:bg-[#0c0d12] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e2230]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsAddingTask(false)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1e2230]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTask}
                      className="px-3.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-2 overflow-y-auto max-h-56 pr-1 flex-1">
              {focusTasks.length > 0 ? (
                focusTasks.map((t) => {
                  const isActive = activeTaskId === t.id;
                  const isEditing = editingTaskId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 group ${
                        isActive
                          ? 'bg-indigo-50/90 dark:bg-orange-500/10 border-indigo-300 dark:border-orange-500/40 shadow-sm ring-1 ring-indigo-500/20 dark:ring-orange-500/20'
                          : 'bg-slate-50/70 dark:bg-[#151722]/70 border-slate-200/60 dark:border-[#1e2230] hover:border-slate-300 dark:hover:border-[#2a3044]'
                      } ${t.isCompleted ? 'opacity-60' : ''}`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleTaskComplete(t.id)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                          t.isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-[#1e2230] hover:border-indigo-400 dark:hover:border-orange-500 bg-white dark:bg-[#0c0d12]'
                        }`}
                      >
                        {t.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      {/* Title & Progress */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditing(t.id);
                                if (e.key === 'Escape') setEditingTaskId(null);
                              }}
                              autoFocus
                              className="w-full px-2 py-0.5 text-xs rounded-lg border border-indigo-400 dark:border-orange-500 bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white"
                            />
                            <button
                              onClick={() => handleSaveEditing(t.id)}
                              className="px-2 py-0.5 bg-indigo-600 dark:bg-orange-500 text-white rounded-lg text-xs font-bold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setActiveTaskId(t.id)}
                            onDoubleClick={() => handleStartEditing(t)}
                            className="cursor-pointer"
                          >
                            <p
                              className={`text-xs font-semibold truncate ${
                                t.isCompleted
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : isActive
                                  ? 'text-indigo-950 dark:text-orange-400 font-bold'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {t.title}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {t.completedPomodoros}/{t.estimatedPomodoros} 🍅 completed
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleStartEditing(t)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit Title"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                  No focus goals yet. Click "+ Add Goal"!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
