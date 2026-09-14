import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  Plus,
  Trash2,
  Trophy,
  Sparkles,
  TrendingUp,
  Target,
  RotateCcw,
} from 'lucide-react';

export interface Habit {
  id: string;
  name: string;
  category: 'prep' | 'apps' | 'inbox' | 'learning' | 'fitness';
  targetDaysPerWeek: number;
  streak: number;
  history: Record<string, boolean>; // key is YYYY-MM-DD
}

const DEFAULT_HABITS: Habit[] = [
  {
    id: 'h1',
    name: '💻 Solve 2 LeetCode / DSA Problems',
    category: 'prep',
    targetDaysPerWeek: 6,
    streak: 5,
    history: {},
  },
  {
    id: 'h2',
    name: '📬 Apply to 5+ Curated Job Openings',
    category: 'apps',
    targetDaysPerWeek: 5,
    streak: 4,
    history: {},
  },
  {
    id: 'h3',
    name: '✉️ Clear Mailo AI Urgent & Important Inbox',
    category: 'inbox',
    targetDaysPerWeek: 7,
    streak: 7,
    history: {},
  },
  {
    id: 'h4',
    name: '📄 Refine Resume & Tailor for Roles',
    category: 'prep',
    targetDaysPerWeek: 4,
    streak: 2,
    history: {},
  },
  {
    id: 'h5',
    name: '☕ 30 Mins System Design / Core CS Reading',
    category: 'learning',
    targetDaysPerWeek: 5,
    streak: 3,
    history: {},
  },
];

export const HabitTrackerView: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('mailradar_habits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_HABITS;
  });

  const [newHabitName, setNewHabitName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    localStorage.setItem('mailradar_habits', JSON.stringify(habits));
  }, [habits]);

  // Generate current week days (Mon-Sun)
  const today = new Date();
  const currentDayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - currentDayOfWeek + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === today.toISOString().split('T')[0];
    return {
      dateStr,
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      dayNumber: d.getDate(),
      isToday,
    };
  });

  const handleToggleDay = (habitId: string, dateStr: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const currentVal = Boolean(h.history[dateStr]);
        const updatedHistory = { ...h.history, [dateStr]: !currentVal };
        const updatedStreak = !currentVal ? h.streak + 1 : Math.max(0, h.streak - 1);
        return {
          ...h,
          history: updatedHistory,
          streak: updatedStreak,
        };
      })
    );
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      category: 'prep',
      targetDaysPerWeek: 5,
      streak: 0,
      history: {},
    };

    setHabits((prev) => [...prev, newHabit]);
    setNewHabitName('');
    setIsAdding(false);
  };

  const handleDeleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  // Compute total weekly completions
  let totalPossible = habits.length * 7;
  let totalCompleted = 0;
  habits.forEach((h) => {
    weekDays.forEach((w) => {
      if (h.history[w.dateStr]) totalCompleted++;
    });
  });

  const overallRate = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Weekly Habit Tracker</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Consistency Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Build high-performance placement preparation and job search habits week by week.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 justify-center">
                <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Top Streak
              </div>
              <div className="text-base font-extrabold text-amber-900 dark:text-amber-300">
                {Math.max(...habits.map((h) => h.streak), 0)} Days
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 text-center">
              <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-orange-400">Weekly Score</div>
              <div className="text-base font-extrabold text-blue-900 dark:text-orange-400">{overallRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Habits Table / Grid Card */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2230] flex items-center justify-between bg-slate-50/50 dark:bg-[#151722]/50">
          <div className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">
            Daily Habits ({habits.length})
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Habit</span>
          </button>
        </div>

        {/* Add Habit Form Modal/Inline */}
        {isAdding && (
          <form onSubmit={handleAddHabit} className="p-4 bg-blue-50/40 dark:bg-[#151722] border-b border-blue-100 dark:border-[#1e2230] flex items-center gap-3">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="e.g. 🎯 Attend 1 Mock Interview / Peer Coding session"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#1e2230] text-xs bg-white dark:bg-[#0c0d12] dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#1e2230] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2230]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xs font-bold"
            >
              Save Habit
            </button>
          </form>
        )}

        {/* Habit Rows */}
        <div className="divide-y divide-slate-100 dark:divide-[#1e2230] overflow-x-auto">
          {habits.map((habit) => {
            const completedThisWeek = weekDays.filter((w) => habit.history[w.dateStr]).length;
            const habitPercentage = Math.round((completedThisWeek / 7) * 100);

            return (
              <div
                key={habit.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-[#151722]/60 transition-colors min-w-[650px]"
              >
                {/* Habit Info & Streak */}
                <div className="w-64 min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{habit.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 inline-flex items-center gap-0.5 font-mono">
                      <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      {habit.streak}d streak
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {completedThisWeek}/7 ({habitPercentage}%)
                    </span>
                  </div>
                </div>

                {/* 7-Day Clickable Checkboxes */}
                <div className="flex items-center gap-2.5">
                  {weekDays.map((w) => {
                    const isDone = Boolean(habit.history[w.dateStr]);
                    return (
                      <button
                        key={w.dateStr}
                        onClick={() => handleToggleDay(habit.id, w.dateStr)}
                        className={`w-9 h-10 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-2xs'
                            : w.isToday
                            ? 'bg-blue-50 dark:bg-orange-500/10 border-blue-300 dark:border-orange-500/30 text-blue-700 dark:text-orange-400 hover:bg-blue-100 dark:hover:bg-orange-500/20'
                            : 'bg-slate-50 dark:bg-[#151722] border-slate-200 dark:border-[#1e2230] text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1e2230]'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                          {w.dayName}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 fill-white text-emerald-500" />
                        ) : (
                          <span className="text-[11px] font-bold mt-0.5 leading-none">
                            {w.dayNumber}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-1.5 rounded-lg text-slate-300 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Delete habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
