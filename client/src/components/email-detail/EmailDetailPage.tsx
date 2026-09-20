import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Email, CustomCategory } from '../../types';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Archive,
  CheckCircle2,
  Undo2,
  Tag,
  ChevronDown,
  Check,
  Trash2,
  Mail,
  Calendar,
  Share2,
  Printer,
  Sparkles,
  Layers,
  FileText,
  Shield,
  Star,
  CornerUpLeft,
  CornerUpRight,
  Send,
  Lock,
} from 'lucide-react';
import {
  getCategoryTheme,
  classifyMailCategory,
  getPriorityTheme,
  getPriorityLabel,
  DEFAULT_CUSTOM_CATEGORIES,
} from '../../utils/categoryClassifier';
import { isHtmlContent } from '../../utils/cleanEmailContent';
import { EmailContentRenderer } from './EmailContentRenderer';

interface EmailDetailPageProps {
  email: Email;
  allEmails?: Email[];
  categories?: CustomCategory[];
  backLabel?: string;
  onBack: () => void;
  onSelectEmail?: (email: Email) => void;
  onStatusChange: (emailId: string, status: 'read' | 'unread' | 'archived') => void;
  onCategoryChange?: (emailId: string, category: string) => void;
  onSnooze: (email: Email) => void;
  onFeedback?: (emailId: string, action: 'thumbs_up' | 'thumbs_down') => void;
  onToggleTask?: (taskId: string, currentStatus: string) => void;
  onDelete?: (emailId: string) => void;
}

export const EmailDetailPage: React.FC<EmailDetailPageProps> = ({
  email,
  allEmails = [],
  categories = DEFAULT_CUSTOM_CATEGORIES,
  backLabel = 'Back',
  onBack,
  onSelectEmail,
  onStatusChange,
  onCategoryChange,
  onSnooze,
  onFeedback,
  onDelete,
}) => {
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isDetailsDropdownOpen, setIsDetailsDropdownOpen] = useState(false);
  const [isAiInsightsExpanded, setIsAiInsightsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'rich' | 'reader'>('rich');
  const [copiedLink, setCopiedLink] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<'thumbs_up' | 'thumbs_down' | null>(null);

  // Quick reply state
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const detailsDropdownRef = useRef<HTMLDivElement>(null);

  const hasHtml = isHtmlContent(email.bodyFull || '');

  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    setSubmittedFeedback(null);
    setIsReplyOpen(false);
    setIsAiInsightsExpanded(false);
    setReplyText('');
    setReplySent(false);
    setViewMode(hasHtml ? 'rich' : 'reader');
  }, [email?.id, hasHtml]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setIsCategoryPickerOpen(false);
      }
      if (detailsDropdownRef.current && !detailsDropdownRef.current.contains(e.target as Node)) {
        setIsDetailsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Index in list of all emails for Previous/Next navigation
  const currentIndex = useMemo(() => {
    return allEmails.findIndex((e) => e.id === email.id);
  }, [allEmails, email.id]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allEmails.length - 1;
  const prevEmail = hasPrev ? allEmails[currentIndex - 1] : null;
  const nextEmail = hasNext ? allEmails[currentIndex + 1] : null;

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape' || e.key === 'u') {
        onBack();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        if (hasPrev && prevEmail && onSelectEmail) {
          onSelectEmail(prevEmail);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        if (hasNext && nextEmail && onSelectEmail) {
          onSelectEmail(nextEmail);
        }
      } else if (e.key === 'e') {
        onStatusChange(email.id, email.status === 'archived' ? 'read' : 'archived');
      } else if (e.key === 's') {
        onSnooze(email);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [email, allEmails, onBack, onSelectEmail, hasPrev, hasNext, prevEmail, nextEmail, onStatusChange, onSnooze]);

  const isCompleted = email.status === 'archived';
  const priorityTheme = getPriorityTheme(email.priorityTier);
  const priorityLabel = getPriorityLabel(email.priorityTier);

  // Compute active category
  const activeCatId = classifyMailCategory(email, categories);
  const activeCatObj = categories.find((c) => c.id === activeCatId) || {
    id: activeCatId,
    name:
      activeCatId === 'inbox' || activeCatId === 'other' || activeCatId === 'others'
        ? 'Inbox'
        : activeCatId.charAt(0).toUpperCase() + activeCatId.slice(1),
    color: 'slate',
  };
  const categoryTheme = getCategoryTheme(activeCatObj.color || 'slate');

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySent(true);
    setTimeout(() => {
      setIsReplyOpen(false);
      setReplyText('');
      setReplySent(false);
    }, 1500);
  };

  const formattedDate = new Date(email.receivedAt).toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="w-full pb-6 animate-in fade-in duration-200">
      {/* 1. Gmail-Style Top Action Bar */}
      <div className="sticky top-0 z-30 py-2.5 px-4 mb-4 bg-white/95 dark:bg-[#0e121e]/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Toolbar Icons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161d30] dark:hover:bg-[#1e2740] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Back to Inbox (u or Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-orange-400" />
            <span className="hidden md:inline">{backLabel}</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Archive / Mark Done */}
          <button
            type="button"
            onClick={() => onStatusChange(email.id, isCompleted ? 'read' : 'archived')}
            className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isCompleted
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-[#161d30] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e2740] text-slate-700 dark:text-slate-200'
            }`}
            title={isCompleted ? 'Move back to Active' : 'Archive / Done (e)'}
          >
            {isCompleted ? <Undo2 className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            <span className="hidden lg:inline">{isCompleted ? 'Active' : 'Archive'}</span>
          </button>

          {/* Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(email.id);
                onBack();
              }}
              className="p-2 rounded-xl bg-white dark:bg-[#161d30] border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Delete email"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Mark Unread / Read */}
          <button
            type="button"
            onClick={() => onStatusChange(email.id, email.status === 'read' ? 'unread' : 'read')}
            className="p-2 rounded-xl bg-white dark:bg-[#161d30] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e2740] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title={email.status === 'read' ? 'Mark as Unread' : 'Mark as Read'}
          >
            <Mail className="w-4 h-4" />
          </button>

          {/* Snooze */}
          <button
            type="button"
            onClick={() => onSnooze(email)}
            className="p-2 rounded-xl bg-white dark:bg-[#161d30] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e2740] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Snooze (s)"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden lg:inline">Snooze</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-xl bg-white dark:bg-[#161d30] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e2740] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Print email"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* View Mode Toggle Button */}
          {hasHtml && (
            <div className="flex items-center ml-1 pl-1 border-l border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'rich' ? 'reader' : 'rich')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'rich'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-[#161d30] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
                title="Toggle HTML vs Reader View"
              >
                {viewMode === 'rich' ? <Layers className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{viewMode === 'rich' ? 'Gmail HTML' : 'Reader View'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Toolbar: Pagination Counter & Navigation */}
        <div className="flex items-center gap-2">
          {allEmails.length > 0 && currentIndex >= 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                {currentIndex + 1} of {allEmails.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => prevEmail && onSelectEmail && onSelectEmail(prevEmail)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    hasPrev
                      ? 'bg-white dark:bg-[#161d30] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e263d] text-slate-700 dark:text-slate-200 cursor-pointer'
                      : 'bg-slate-100/50 dark:bg-[#161d30]/40 border-slate-200/50 dark:border-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  }`}
                  title="Previous email (Left arrow or 'k')"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => nextEmail && onSelectEmail && onSelectEmail(nextEmail)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    hasNext
                      ? 'bg-white dark:bg-[#161d30] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e263d] text-slate-700 dark:text-slate-200 cursor-pointer'
                      : 'bg-slate-100/50 dark:bg-[#161d30]/40 border-slate-200/50 dark:border-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  }`}
                  title="Next email (Right arrow or 'j')"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Centered Email Card (Gmail Canvas Inspired) */}
      <div className="max-w-[860px] mx-auto bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-[#1e253c] rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-[#1e253c]">
        {/* Email Header Area */}
        <div className="p-6 sm:p-8 space-y-4 bg-gradient-to-b from-slate-50/50 to-white dark:from-[#131929] dark:to-[#0f1422]">
          {/* Subject Line & Badges */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Category & Tier Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Selector */}
                <div ref={categoryPickerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all hover:scale-105 shadow-2xs cursor-pointer ${categoryTheme.badgeClass}`}
                    title="Change Category"
                  >
                    <Tag className="w-3.5 h-3.5 opacity-80" />
                    <span>{activeCatObj.name}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {isCategoryPickerOpen && (
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#161d30] border border-slate-200 dark:border-[#232d4b] rounded-2xl shadow-2xl z-40 p-2 animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Assign Category
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
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
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                                isCurrent
                                  ? `${cTheme.bg} ${cTheme.text} font-bold`
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c253d]'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`w-2 h-2 rounded-full ${cTheme.dot}`} />
                                <span className="truncate">{c.name}</span>
                              </div>
                              {isCurrent && <Check className="w-4 h-4 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority Tier Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${priorityTheme.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityTheme.dot}`} />
                  {priorityLabel} Priority
                </span>

                {/* Completed Badge */}
                {isCompleted && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </span>
                )}

                {/* Deadline Badge */}
                {email.deadline && (
                  <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {new Date(email.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Subject Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug tracking-tight">
                {email.subject || '(No Subject)'}
              </h1>
            </div>

            {/* Quick Share Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#161d30] border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-[#1e263d] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex-shrink-0"
              title={copiedLink ? 'Link copied!' : 'Share email link'}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Sender & Metadata Bar (Exact Gmail Layout) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar circle */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-orange-500 dark:to-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                {(email.senderName || email.sender || 'U').charAt(0).toUpperCase()}
              </div>

              {/* Sender Name & "to me" with detailed popover */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {email.senderName || email.sender.split('@')[0]}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                    &lt;{email.sender}&gt;
                  </span>
                </div>

                <div ref={detailsDropdownRef} className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setIsDetailsDropdownOpen(!isDetailsDropdownOpen)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
                  >
                    <span>to me</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Gmail Security & Routing Details Popover */}
                  {isDetailsDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#161d30] border border-slate-200 dark:border-[#232d4b] rounded-2xl shadow-2xl z-40 p-4 space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>Message Details</span>
                        <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-slate-500">From:</span>
                        <span className="col-span-2 text-slate-800 dark:text-slate-200 font-mono break-all">
                          {email.senderName ? `${email.senderName} <${email.sender}>` : email.sender}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-slate-500">To:</span>
                        <span className="col-span-2 text-slate-800 dark:text-slate-200 font-mono break-all">
                          {email.recipient}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-slate-500">Date:</span>
                        <span className="col-span-2 text-slate-800 dark:text-slate-200">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-slate-500">Subject:</span>
                        <span className="col-span-2 text-slate-800 dark:text-slate-200 font-medium">
                          {email.subject}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-slate-500">Security:</span>
                        <span className="col-span-2 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Standard encryption (TLS)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-500">MailHinge Tier:</span>
                        <span className="col-span-2 font-bold text-slate-800 dark:text-slate-200">
                          {priorityLabel} Priority
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date and Quick Action Buttons on right */}
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono self-start sm:self-center">
              <span>{formattedDate}</span>
              <button
                type="button"
                onClick={() => setIsReplyOpen(true)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1e2740] text-slate-600 dark:text-slate-300 transition-colors"
                title="Quick Reply"
              >
                <CornerUpLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Collapsible AI Radar Insights Banner */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-[#121727] border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsAiInsightsExpanded(!isAiInsightsExpanded)}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-orange-400 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-orange-400" />
              <span>AI Priority Reasoning & Suggested Action</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isAiInsightsExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Feedback Thumb controls */}
            <div className="flex items-center gap-2">
              {submittedFeedback ? (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Feedback saved</span>
                </span>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="hidden sm:inline">Helpful score?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedFeedback('thumbs_up');
                      if (onFeedback) onFeedback(email.id, 'thumbs_up');
                    }}
                    className="p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                    title="Accurate score"
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedFeedback('thumbs_down');
                      if (onFeedback) onFeedback(email.id, 'thumbs_down');
                    }}
                    className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Inaccurate score"
                  >
                    👎
                  </button>
                </div>
              )}
            </div>
          </div>

          {isAiInsightsExpanded && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#161d30] border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Why this priority
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {email.reasoning}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#161d30] border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Suggested Next Action
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <span>{email.actionSummary || 'Review details and take action accordingly.'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Email Body Section */}
        <div className="p-6 sm:p-8 space-y-6">
          <EmailContentRenderer
            rawContent={email.bodyFull || email.bodySnippet || ''}
            forceViewMode={viewMode}
          />
        </div>

        {/* 5. Gmail-Style Bottom Reply & Action Footer */}
        <div className="p-6 bg-slate-50/60 dark:bg-[#101524] space-y-4">
          {!isReplyOpen ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsReplyOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#161d30] border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e2740] text-slate-800 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                <CornerUpLeft className="w-4 h-4 text-blue-600 dark:text-orange-400" />
                <span>Reply</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReplyOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#161d30] border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1e2740] text-slate-800 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                <CornerUpRight className="w-4 h-4 text-slate-500" />
                <span>Forward</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="space-y-3 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161d30] border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-medium">
                    <CornerUpLeft className="w-3.5 h-3.5 text-blue-600" />
                    <span>Replying to {email.senderName || email.sender}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReplyOpen(false)}
                    className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your response here..."
                  className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-hidden text-slate-900 dark:text-slate-100 resize-none font-sans"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {replySent && <span className="text-emerald-500 font-bold">✓ Reply sent successfully!</span>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReplyOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
