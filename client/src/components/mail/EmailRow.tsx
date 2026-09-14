import React, { useState, useRef, useEffect } from 'react';
import { Email, CustomCategory } from '../../types';
import {
  Star,
  Clock,
  Archive,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Tag,
  Check,
} from 'lucide-react';
import {
  getPriorityTheme,
  getPriorityLabel,
  getCategoryTheme,
  classifyMailCategory,
  DEFAULT_CUSTOM_CATEGORIES,
} from '../../utils/categoryClassifier';

interface EmailRowProps {
  email: Email;
  categories?: CustomCategory[];
  onSelect: (email: Email) => void;
  onStatusChange: (emailId: string, status: 'read' | 'unread' | 'archived') => void;
  onCategoryChange?: (emailId: string, category: string) => void;
  onSnooze: (email: Email) => void;
}

export const EmailRow: React.FC<EmailRowProps> = ({
  email,
  categories = DEFAULT_CUSTOM_CATEGORIES,
  onSelect,
  onStatusChange,
  onCategoryChange,
  onSnooze,
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  const priorityTheme = getPriorityTheme(email.priorityTier);
  const priorityLabel = getPriorityLabel(email.priorityTier);

  // Compute active category
  const activeCatId = classifyMailCategory(email, categories);
  const activeCatObj = categories.find((c) => c.id === activeCatId) || {
    id: activeCatId,
    name: activeCatId === 'inbox' || activeCatId === 'other' || activeCatId === 'others' ? 'Inbox' : activeCatId.charAt(0).toUpperCase() + activeCatId.slice(1),
    color: 'slate',
  };
  const categoryTheme = getCategoryTheme(activeCatObj.color || 'slate');

  // Close category menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    if (isCategoryMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryMenuOpen]);

  // Format date cleanly like Gmail (Exact time for today, 'MMM d' for past dates)
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';

      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }

      const isCurrentYear = d.getFullYear() === now.getFullYear();
      if (isCurrentYear) {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }

      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const senderInitial = (email.senderName || email.sender || 'U').charAt(0).toUpperCase();

  return (
    <div className="bg-white dark:bg-[#12141c] border-b border-slate-100 dark:border-[#1e2230]/70 hover:bg-slate-50/90 dark:hover:bg-[#181b28] transition-all duration-150 group relative border-l-2 border-l-transparent hover:border-l-blue-500 dark:hover:border-l-orange-500">
      {/* Main Row */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
        onClick={() => onSelect(email)}
      >
        {/* Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsStarred(!isStarred);
          }}
          className="text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400 transition-transform duration-150 active:scale-125"
        >
          <Star className={`w-4 h-4 transition-colors ${isStarred ? 'fill-amber-400 text-amber-400 scale-110' : ''}`} />
        </button>

        {/* Sender Name */}
        <div className="w-36 lg:w-44 flex-shrink-0 truncate font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-orange-400 transition-colors">
          {email.senderName || email.sender.split('@')[0]}
        </div>

        {/* Subject */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {email.subject}
            </span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0 w-20 text-right whitespace-nowrap">
          {formatTime(email.receivedAt)}
        </div>

        {/* Quick Action Hover Menu with smooth slide-in */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 pl-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onSnooze(email)}
            title="Snooze email"
            className="p-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-[#222636] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onStatusChange(email.id, 'archived')}
            title="Archive email"
            className="p-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-[#222636] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            title="Toggle AI reasoning"
            className="p-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-[#222636] text-blue-600 dark:text-orange-400 hover:text-blue-700 transition-colors"
          >
            {isReasoningOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable AI Reasoning Section with smooth fade-in */}
      {isReasoningOpen && (
        <div className="px-14 pb-3 pt-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-[#0c0d12]/50 border-t border-slate-100/80 dark:border-[#1e2230] animate-fade-in">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/60 dark:bg-[#161824] border border-blue-100 dark:border-[#262a3a] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400 flex-shrink-0 mt-0.5 animate-pulse-slow" />
            <div className="space-y-1">
              <div className="font-semibold text-blue-900 dark:text-orange-300">AI Priority Reasoning:</div>
              <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">{email.reasoning}</p>
              {email.deadline && (
                <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 pt-0.5">
                  📅 Detected Deadline: {new Date(email.deadline).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

