import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Tag,
  AlertCircle,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface DayTask {
  id: string;
  dateStr: string; // YYYY-MM-DD
  title: string;
  category: 'job-app' | 'email-followup' | 'interview-prep' | 'assessment' | 'general';
  priority: 'urgent' | 'important' | 'normal';
  estimatedMinutes?: number;
  completed: boolean;
}

const DEFAULT_TASKS: DayTask[] = [
  {
    id: '1',
    dateStr: new Date().toISOString().split('T')[0],
    title: 'Apply to Xpentra Backend Developer Intern (AccioJob Portal)',
    category: 'job-app',
    priority: 'urgent',
    estimatedMinutes: 15,
    completed: false,
  },
  {
    id: '2',
    dateStr: new Date().toISOString().split('T')[0],
    title: 'Submit Unstop / St. Joseph Contest Registration',
    category: 'assessment',
    priority: 'urgent',
    estimatedMinutes: 20,
    completed: false,
  },
  {
    id: '3',
    dateStr: new Date().toISOString().split('T')[0],
    title: 'Review MongoDB Fundamentals Session 1 Overview',
    category: 'general',
    priority: 'important',
    estimatedMinutes: 30,
    completed: true,
  },
  {
    id: '4',
    dateStr: new Date().toISOString().split('T')[0],
    title: 'Apply to Teradata Associate DevOps Engineer',
    category: 'job-app',
    priority: 'important',
    estimatedMinutes: 15,
    completed: false,
  },
  {
    id: '5',
    dateStr: new Date().toISOString().split('T')[0],
    title: 'Update Resume with Next.js & Full Stack Projects',
    category: 'interview-prep',
    priority: 'normal',
    estimatedMinutes: 45,
    completed: false,
  },
];

export const DayWiseTodoView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [tasks, setTasks] = useState<DayTask[]>(() => {
    const saved = localStorage.getItem('mailradar_day_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_TASKS;
  });

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DayTask['category']>('job-app');
  const [newPriority, setNewPriority] = useState<DayTask['priority']>('important');
  const [newMinutes, setNewMinutes] = useState<number>(20);
  const [isAdding, setIsAdding] = useState(false);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('mailradar_day_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Generate 7-day quick switcher dates
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + (i - 2)); // 2 days before to 4 days ahead
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: d.toISOString().split('T')[0] === today.toISOString().split('T')[0],
    };
  });

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: DayTask = {
      id: Date.now().toString(),
      dateStr: selectedDate,
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      estimatedMinutes: Number(newMinutes) || 15,
      completed: false,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTitle('');
    setIsAdding(false);
  };

  // Filter tasks for the selected date
  const dayTasks = tasks.filter((t) => t.dateStr === selectedDate);
  const completedTasks = dayTasks.filter((t) => t.completed);
  const pendingTasks = dayTasks.filter((t) => !t.completed);
  const completionPercentage =
    dayTasks.length === 0 ? 0 : Math.round((completedTasks.length / dayTasks.length) * 100);

  const getCategoryLabel = (cat: DayTask['category']) => {
    switch (cat) {
      case 'job-app':
        return { label: 'Job Application', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'email-followup':
        return { label: 'Email Followup', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'interview-prep':
        return { label: 'Interview Prep', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'assessment':
        return { label: 'Assessment / Test', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'General', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Date Switcher */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Day-Wise Task Manager</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 border border-blue-200 dark:border-orange-500/30">
                Daily Focus
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Structure your daily recruitment action plan, email responses, and test milestones.
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Tasks</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">{dayTasks.length}</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Done</div>
              <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                {completedTasks.length}/{dayTasks.length} ({completionPercentage}%)
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Interactive Ribbon */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-[#1e2230]">
          <div className="flex items-center gap-2">
            {weekDays.map((item) => {
              const isSelected = item.dateStr === selectedDate;
              return (
                <button
                  key={item.dateStr}
                  onClick={() => setSelectedDate(item.dateStr)}
                  className={`flex flex-col items-center justify-center min-w-[72px] py-2.5 px-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-orange-500 text-white border-blue-600 dark:border-orange-500 shadow-xs'
                      : item.isToday
                      ? 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 border-blue-200 dark:border-orange-500/30 hover:bg-blue-100/60 dark:hover:bg-orange-500/20'
                      : 'bg-slate-50 dark:bg-[#151722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e2230] hover:bg-slate-100 dark:hover:bg-[#1e2230]'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {item.dayName}
                  </span>
                  <span className="text-base font-extrabold mt-0.5 leading-none">
                    {item.dayNumber}
                  </span>
                  {item.isToday && (
                    <span
                      className={`text-[8px] font-bold uppercase mt-1 px-1 rounded-full ${
                        isSelected ? 'bg-white text-blue-700 dark:text-orange-600' : 'bg-blue-200 dark:bg-orange-500/30 text-blue-900 dark:text-orange-300'
                      }`}
                    >
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Date Input */}
          <div className="flex items-center gap-2 pl-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#1e2230] text-xs font-semibold text-slate-700 dark:text-white bg-white dark:bg-[#0c0d12] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Add Bar / Form */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-[#1e2230] hover:border-blue-500 dark:hover:border-orange-500/60 hover:bg-blue-50/40 dark:hover:bg-orange-500/5 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-orange-400 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Task for {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </button>
        ) : (
          <form onSubmit={handleAddTask} className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Task Description
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Apply to Cisco Graduate Software Engineer 2026..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-xs text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="job-app">Job Application</option>
                  <option value="assessment">Assessment / Contest</option>
                  <option value="interview-prep">Interview Prep</option>
                  <option value="email-followup">Email Followup</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="important">Important</option>
                  <option value="normal">Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Est. Minutes
                </label>
                <input
                  type="number"
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(Number(e.target.value))}
                  min={5}
                  step={5}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1e2230]">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#151722]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xs font-bold shadow-xs"
              >
                Save Task
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Tasks for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>

        {dayTasks.length === 0 ? (
          <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">No tasks scheduled for this day</div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Click the button above to add your first daily goal!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Pending Tasks */}
            {pendingTasks.map((t) => {
              const catInfo = getCategoryLabel(t.category);
              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-[#2a3044] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleTask(t.id)}
                      className="text-slate-400 hover:text-blue-600 dark:hover:text-orange-400 transition-colors flex-shrink-0"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${catInfo.bg}`}>
                          {catInfo.label}
                        </span>
                        {t.priority === 'urgent' && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                            Urgent
                          </span>
                        )}
                        {t.priority === 'important' && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                            Important
                          </span>
                        )}
                        {t.estimatedMinutes && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {t.estimatedMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex-shrink-0"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="pt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
                  Completed ({completedTasks.length})
                </div>
                <div className="space-y-2">
                  {completedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-slate-50/60 dark:bg-[#151722]/50 border border-slate-200/60 dark:border-[#1e2230] rounded-2xl p-3.5 flex items-center justify-between gap-3 opacity-75"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTask(t.id)}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-slate-400 transition-colors flex-shrink-0"
                        >
                          <CheckCircle2 className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950" />
                        </button>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-through truncate">
                          {t.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
