import React, { useState, useRef, useEffect } from 'react';
import { Email, CustomCategory } from '../../types';
import {
  X,
  Clock,
  Archive,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Undo2,
  Tag,
  ChevronDown,
  Check,
  Trash2,
} from 'lucide-react';
import {
  getPriorityTheme,
  getPriorityLabel,
  getCategoryTheme,
  classifyMailCategory,
  DEFAULT_CUSTOM_CATEGORIES,
} from '../../utils/categoryClassifier';
import { formatCleanEmailContent } from '../../utils/cleanEmailContent';
import { extractEmailActionLinks } from '../../utils/linkExtractor';
import { EmailContentRenderer } from './EmailContentRenderer';

interface EmailDetailDrawerProps {
  email: Email | null;
  isOpen: boolean;
  categories?: CustomCategory[];
  onClose: () => void;
  onStatusChange: (emailId: string, status: 'read' | 'unread' | 'archived') => void;
  onCategoryChange?: (emailId: string, category: string) => void;
  onSnooze: (email: Email) => void;
  onFeedback: (emailId: string, action: 'thumbs_up' | 'thumbs_down') => void;
  onToggleTask?: (taskId: string, currentStatus: string) => void;
  onDelete?: (emailId: string) => void;
}

export const EmailDetailDrawer: React.FC<EmailDetailDrawerProps> = ({
  email,
  isOpen,
  categories = DEFAULT_CUSTOM_CATEGORIES,
  onClose,
  onStatusChange,
  onCategoryChange,
  onSnooze,
  onFeedback,
  onToggleTask,
  onDelete,
}) => {
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const categoryPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSubmittedFeedback(null);
  }, [email?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setIsCategoryPickerOpen(false);
      }
    };
    if (isCategoryPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryPickerOpen]);

  if (!isOpen || !email) return null;

  const priorityTheme = getPriorityTheme(email.priorityTier);
  const priorityLabel = getPriorityLabel(email.priorityTier);
  const isCompleted = email.status === 'archived';

  // Compute active category
  const activeCatId = classifyMailCategory(email, categories);
  const activeCatObj = categories.find((c) => c.id === activeCatId) || {
    id: activeCatId,
    name: activeCatId === 'inbox' || activeCatId === 'other' || activeCatId === 'others' ? 'Inbox' : activeCatId.charAt(0).toUpperCase() + activeCatId.slice(1),
    color: 'slate',
  };
  const categoryTheme = getCategoryTheme(activeCatObj.color || 'slate');

  // Extract clean, actionable URLs from body
  const actionLinks = extractEmailActionLinks(email.bodyFull || email.bodySnippet || '');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end modal-backdrop">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c0d12] h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-[#1e2230] text-slate-900 dark:text-slate-100 animate-slide-in-right">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-[#1e2230] flex items-center justify-between bg-slate-50/60 dark:bg-[#12141c]">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${priorityTheme.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityTheme.dot}`} />
              {priorityLabel} Priority
            </span>

            {/* Interactive Category Selector */}
            <div ref={categoryPickerRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all hover:scale-105 ${categoryTheme.badgeClass}`}
                title="Change Category"
              >
                <Tag className="w-3 h-3 opacity-80" />
                <span>{activeCatObj.name}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {isCategoryPickerOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] rounded-2xl shadow-2xl z-30 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Assign Category
                  </div>
                  <div className="space-y-0.5 max-h-56 overflow-y-auto">
                    {categories.map((c) => {
                      const isCurrent = c.id === activeCatId;
                      const cTheme = getCategoryTheme(c.color);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (onCategoryChange) {
                              onCategoryChange(email.id, c.id);
                            }
                            setIsCategoryPickerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors ${
                            isCurrent
                              ? `${cTheme.bg} ${cTheme.text} font-bold`
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151722]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full ${cTheme.dot}`} />
                            <span className="truncate">{c.name}</span>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {isCompleted && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </span>
            )}

            {email.deadline && (
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                📅 Due: {new Date(email.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSnooze(email)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-100 dark:hover:bg-[#151722] text-slate-600 dark:text-slate-300 transition-colors"
              title="Snooze"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onStatusChange(email.id, isCompleted ? 'read' : 'archived');
                onClose();
              }}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-100 dark:hover:bg-[#151722] text-slate-600 dark:text-slate-300 transition-colors"
              title={isCompleted ? 'Move back to Active' : 'Mark as Done & Archive'}
            >
              {isCompleted ? <Undo2 className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-100 dark:hover:bg-[#151722] text-slate-600 dark:text-slate-300 transition-colors ml-2"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Header Details */}
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {email.subject}
            </h1>

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-[#1e2230]">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 flex items-center justify-center font-bold text-sm text-blue-700 dark:text-orange-400">
                {(email.senderName || email.sender || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {email.senderName || email.sender.split('@')[0]}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {email.sender}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {new Date(email.receivedAt).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>
          </div>

          {/* AI Intelligence Block: Summary & Suggested Action */}
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-[#12141c] border border-blue-100 dark:border-[#1e2230] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-orange-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-orange-400" />
              <span>AI Intelligence Summary</span>
            </div>

            {/* AI Summary */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Why this priority:</div>
              <p className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-sans bg-white dark:bg-[#151722] p-3 rounded-xl border border-blue-100/80 dark:border-[#1e2230]">
                {email.reasoning}
              </p>
            </div>

            {/* Suggested Action */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Suggested Action:</div>
              <div className="p-3 rounded-xl bg-white dark:bg-[#151722] border border-blue-100 dark:border-[#1e2230] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs font-medium text-slate-900 dark:text-white">
                  {email.actionSummary || 'Review details and complete action before deadline.'}
                </div>
              </div>
            </div>

            {/* Direct Action & Application Links */}
            {actionLinks.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center justify-between">
                  <span>Detected Action & Application Links:</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Verified Direct Links</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {actionLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs group ${
                        link.isPrimaryAction
                          ? 'bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white shadow-blue-500/20'
                          : 'bg-white dark:bg-[#151722] hover:bg-slate-100 dark:hover:bg-[#1e2230] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#1e2230]'
                      }`}
                    >
                      <span className="max-w-[260px] truncate">{link.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          link.isPrimaryAction
                            ? 'bg-blue-700/70 dark:bg-orange-600/70 text-blue-100 dark:text-orange-100'
                            : 'bg-slate-100 dark:bg-[#1e2230] text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {link.domain}
                      </span>
                      <ExternalLink
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                          link.isPrimaryAction ? 'text-blue-100 dark:text-orange-100' : 'text-slate-400'
                        }`}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Original Email Content */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Original Message Content
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230]">
              <EmailContentRenderer rawContent={email.bodyFull || email.bodySnippet || ''} />
            </div>
          </div>
        </div>

        {/* Footer Quick Action Bar */}
        <div className="p-4 border-t border-slate-200/80 dark:border-[#1e2230] bg-slate-50/60 dark:bg-[#12141c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {submittedFeedback ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Feedback recorded</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Score accurate?</span>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedFeedback('thumbs_up');
                    onFeedback(email.id, 'thumbs_up');
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Accurate"
                >
                  👍 Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedFeedback('thumbs_down');
                    onFeedback(email.id, 'thumbs_down');
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Inaccurate"
                >
                  👎 No
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(email.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete email permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={() => {
                onStatusChange(email.id, email.status === 'read' ? 'unread' : 'read');
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-100 dark:hover:bg-[#151722] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              {email.status === 'read' ? 'Mark as Unread' : 'Mark as Read'}
            </button>

            {/* Mark as Done / Move to Active */}
            <button
              onClick={() => {
                onStatusChange(email.id, isCompleted ? 'read' : 'archived');
                onClose();
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                isCompleted
                  ? 'bg-slate-200 hover:bg-slate-300 dark:bg-[#151722] dark:hover:bg-[#1e2230] text-slate-800 dark:text-slate-200'
                  : 'bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white'
              }`}
            >
              {isCompleted ? (
                <>
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Move to Active</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done (Move to Completed)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
