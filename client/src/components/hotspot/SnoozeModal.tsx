import React, { useState } from 'react';
import { Email } from '../../types';
import { Clock, X, Calendar, Bell } from 'lucide-react';

interface SnoozeModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (emailId: string, snoozedUntil: string, reason: string) => void;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  email,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('tomorrow_9am');
  const [customDate, setCustomDate] = useState<string>('');
  const [reason, setReason] = useState<string>('Need time to review details');

  if (!isOpen || !email) return null;

  const getPresetDate = (preset: string): Date => {
    const now = new Date();
    switch (preset) {
      case 'later_today': {
        const d = new Date(now);
        d.setHours(18, 0, 0, 0);
        return d;
      }
      case 'tomorrow_9am': {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      }
      case 'friday_9am': {
        const d = new Date(now);
        const day = d.getDay();
        const diff = (5 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        d.setHours(9, 0, 0, 0);
        return d;
      }
      case 'next_week': {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        d.setHours(9, 0, 0, 0);
        return d;
      }
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  };

  const handleSnooze = () => {
    let targetDate: Date;
    if (selectedPreset === 'custom' && customDate) {
      targetDate = new Date(customDate);
    } else {
      targetDate = getPresetDate(selectedPreset);
    }

    onConfirm(email.id, targetDate.toISOString(), reason);
    onClose();
  };

  const presets = [
    { id: 'later_today', label: 'Later Today', time: '6:00 PM' },
    { id: 'tomorrow_9am', label: 'Tomorrow Morning', time: '9:00 AM' },
    { id: 'friday_9am', label: 'This Friday', time: '9:00 AM' },
    { id: 'next_week', label: 'Next Week', time: 'Monday 9:00 AM' },
    { id: 'custom', label: 'Custom Date/Time', time: 'Pick custom date' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 modal-backdrop">
      <div className="fixed inset-0 bg-slate-950/70" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] rounded-3xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 animate-scale-in-spring">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2230]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-100 dark:border-orange-500/20 flex items-center justify-center text-blue-600 dark:text-orange-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Snooze Message</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Temporarily hide from inbox until chosen time</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                selectedPreset === p.id
                  ? 'border-blue-600 bg-blue-50/60 text-blue-900 dark:border-orange-500/80 dark:bg-orange-500/15 dark:text-orange-300 font-bold shadow-2xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium dark:border-[#1e2230] dark:hover:bg-[#151722] dark:text-slate-300'
              }`}
            >
              <span>{p.label}</span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{p.time}</span>
            </button>
          ))}
        </div>

        {selectedPreset === 'custom' && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Pick Date & Time</label>
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#0c0d12] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1e2230]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSnooze}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 text-xs font-bold shadow-xs transition-colors"
          >
            Confirm Snooze
          </button>
        </div>
      </div>
    </div>
  );
};
