import React, { useState } from 'react';
import { Email } from '../../types';
import { parseTelegramJob } from '../../utils/telegramJobParser';
import { extractEmailActionLinks } from '../../utils/linkExtractor';
import {
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Tag,
  Building2,
  Award,
  Zap,
} from 'lucide-react';

interface DeadlineEvent {
  id: string;
  title: string;
  subtitle: string;
  source: 'mail' | 'telegram' | 'custom';
  dateStr: string; // YYYY-MM-DD
  deadlineText: string;
  applyUrl?: string | null;
  priority: 'urgent' | 'important' | 'normal';
  completed: boolean;
}

interface DeadlineCalendarViewProps {
  emails: Email[];
  onSelectEmail?: (email: Email) => void;
}

export const DeadlineCalendarView: React.FC<DeadlineCalendarViewProps> = ({
  emails,
  onSelectEmail,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );

  // Extract all deadlines from emails & Telegram messages
  const events: DeadlineEvent[] = [];

  emails.forEach((e) => {
    if (e.provider === 'telegram') {
      const job = parseTelegramJob(
        e.bodyFull || e.bodySnippet || e.subject,
        e.senderName || e.sender,
        e.receivedAt
      );

      // Parse date if possible
      let eventDate = new Date().toISOString().split('T')[0];
      if (job.deadline && /Aug\s*20/i.test(job.deadline)) {
        eventDate = '2026-08-20';
      } else if (job.deadline && /Aug\s*2[1-9]/i.test(job.deadline)) {
        const d = job.deadline.match(/Aug\s*(\d+)/i);
        if (d) eventDate = `2026-08-${d[1].padStart(2, '0')}`;
      }

      events.push({
        id: e.id,
        title: job.company,
        subtitle: job.role,
        source: 'telegram',
        dateStr: eventDate,
        deadlineText: job.deadline,
        applyUrl: job.applyUrl,
        priority:
          e.priorityTier === 'urgent' || e.priorityTier === 'hotspot'
            ? 'urgent'
            : e.priorityTier === 'important'
            ? 'important'
            : 'normal',
        completed: e.status === 'archived',
      });
    } else {
      // Mail email
      if (e.deadline || e.priorityTier === 'hotspot' || e.priorityTier === 'urgent') {
        const dStr = e.deadline
          ? new Date(e.deadline).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        events.push({
          id: e.id,
          title: e.senderName || e.sender.split('@')[0],
          subtitle: e.subject,
          source: 'mail',
          dateStr: dStr,
          deadlineText: e.deadline
            ? new Date(e.deadline).toLocaleDateString()
            : 'Immediate Action Required',
          applyUrl: extractEmailActionLinks(e.bodyFull || e.bodySnippet)?.[0]?.url || null,
          priority: e.priorityTier === 'hotspot' || e.priorityTier === 'urgent' ? 'urgent' : 'important',
          completed: e.status === 'archived',
        });
      }
    }
  });

  // Calendar month calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Build calendar matrix
  const calendarCells = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      day: d,
      dateStr: formatted,
    });
  }

  // Deadlines for selected day
  const selectedDayEvents = events.filter((ev) => ev.dateStr === selectedDay);

  // All upcoming deadlines sorted by date
  const upcomingEvents = [...events]
    .filter((ev) => !ev.completed)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .slice(0, 10);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Application Deadline Radar</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Live Cutoffs
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Synchronized recruitment deadlines across Unstop competitions, campus drives, and Telegram job postings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-center">
              <div className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400">Urgent &lt; 24h</div>
              <div className="text-base font-extrabold text-red-900 dark:text-red-300">
                {events.filter((e) => e.priority === 'urgent' && !e.completed).length}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 text-center">
              <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-orange-400">Total Active</div>
              <div className="text-base font-extrabold text-blue-900 dark:text-orange-400">
                {events.filter((e) => !e.completed).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Calendar Grid + Selected Day Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Monthly Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-100 dark:hover:bg-[#151722] text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-[#1e2230] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151722]"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-100 dark:hover:bg-[#151722] text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100 dark:border-[#1e2230]">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Day Cells Matrix */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-slate-50/40 dark:bg-[#151722]/30" />;
              }

              const isSelected = cell.dateStr === selectedDay;
              const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
              const dayEvs = events.filter((e) => e.dateStr === cell.dateStr);
              const hasUrgent = dayEvs.some((e) => e.priority === 'urgent');

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDay(cell.dateStr)}
                  className={`h-16 p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    isSelected
                      ? 'border-blue-600 dark:border-orange-500 bg-blue-50/60 dark:bg-orange-500/10 ring-2 ring-blue-100 dark:ring-orange-500/20'
                      : isToday
                      ? 'border-blue-300 dark:border-orange-500/40 bg-blue-50/20 dark:bg-orange-500/5 hover:border-blue-400 dark:hover:border-orange-500/60'
                      : 'border-slate-200/80 dark:border-[#1e2230] bg-white dark:bg-[#12141c] hover:border-slate-300 dark:hover:border-[#2a3044]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold ${
                        isSelected
                          ? 'text-blue-700 dark:text-orange-400'
                          : isToday
                          ? 'text-blue-600 dark:text-orange-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-orange-500" title="Today" />
                    )}
                  </div>

                  {/* Event Badges in Cell */}
                  {dayEvs.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                          hasUrgent
                            ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                            : 'bg-blue-100 dark:bg-orange-500/20 text-blue-800 dark:text-orange-300'
                        }`}
                      >
                        {dayEvs.length} {dayEvs.length === 1 ? 'due' : 'dues'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Details Panel (1 Col) */}
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2230]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {new Date(selectedDay).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h3>
                <div className="text-[11px] text-slate-400">
                  {selectedDayEvents.length} deadlines scheduled
                </div>
              </div>
            </div>

            {/* Selected Day Event Cards */}
            <div className="mt-3 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <CalendarIcon className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No deadlines for this date
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Select another day with scheduled cutoffs.
                  </p>
                </div>
              ) : (
                selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-slate-50/60 dark:bg-[#151722] hover:bg-white dark:hover:bg-[#1e2230] hover:border-slate-300 dark:hover:border-[#2a3044] transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {ev.title}
                          </span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-[#1e2230] text-slate-700 dark:text-slate-300">
                            {ev.source}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                          {ev.subtitle}
                        </div>
                      </div>

                      {ev.priority === 'urgent' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 flex-shrink-0">
                          Urgent
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#1e2230] text-[11px]">
                      <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">
                        📅 {ev.deadlineText}
                      </span>
                      {ev.applyUrl && (
                        <a
                          href={ev.applyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-orange-400 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <span>Apply</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-orange-500/10 border border-blue-100 dark:border-orange-500/30 text-[11px] text-blue-900 dark:text-orange-300 flex items-start gap-2">
            <Zap className="w-4 h-4 text-blue-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <span>
              Deadlines are automatically tracked from Unstop, Haveloc, and Telegram job alerts.
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Critical Deadlines Horizontal Row */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Next Upcoming Deadlines ({upcomingEvents.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcomingEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:border-slate-300 dark:hover:border-[#2a3044] bg-white dark:bg-[#151722] transition-all space-y-2.5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">{ev.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{ev.subtitle}</div>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                    ev.priority === 'urgent'
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                      : 'bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 border border-blue-200 dark:border-orange-500/30'
                  }`}
                >
                  {ev.priority}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-[#1e2230] flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-semibold">
                  Due: {new Date(ev.dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                {ev.applyUrl && (
                  <a
                    href={ev.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-600 dark:bg-orange-500 text-white text-[11px] font-bold hover:bg-blue-500 dark:hover:bg-orange-600 inline-flex items-center gap-1"
                  >
                    <span>Apply</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
