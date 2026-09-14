import React, { useState, useEffect } from 'react';
import { Email } from '../../types';
import { parseTelegramJob } from '../../utils/telegramJobParser';
import { getPriorityTheme, getPriorityLabel } from '../../utils/categoryClassifier';
import {
  DollarSign,
  GraduationCap,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  Globe,
  Check,
  Undo2,
  Zap,
} from 'lucide-react';

interface TelegramJobCardProps {
  message: Email;
  onSelect: (message: Email) => void;
  onStatusChange?: (emailId: string, status: 'read' | 'unread' | 'archived') => void;
}

export const TelegramJobCard: React.FC<TelegramJobCardProps> = ({
  message,
  onSelect,
  onStatusChange,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [crawledDeadline, setCrawledDeadline] = useState<string | null>(() => {
    if (message.snoozeReason && message.snoozeReason.startsWith('Crawled deadline:')) {
      return message.snoozeReason.replace('Crawled deadline:', '').trim();
    }
    return null;
  });
  const [isCrawling, setIsCrawling] = useState(false);

  // Direct Apply Link Bypass State
  const [directApplyUrl, setDirectApplyUrl] = useState<string | null>(() => {
    // Check if direct apply link already saved in bodyFull
    const directMatch = (message.bodyFull || '').match(/Direct Apply Link:\s*(https?:\/\/[^\s]+)/i);
    return directMatch ? directMatch[1] : null;
  });
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [isBypassed, setIsBypassed] = useState(Boolean(directApplyUrl));

  const job = parseTelegramJob(
    message.bodyFull || message.bodySnippet || message.subject,
    message.senderName || message.sender,
    message.receivedAt
  );

  const priorityTheme = getPriorityTheme(message.priorityTier);
  const priorityLabel = getPriorityLabel(message.priorityTier);
  const isCompleted = message.status === 'archived';

  const companyInitial = job.company.charAt(0).toUpperCase();

  // Function to crawl the official site application link for exact deadline
  const handleCrawlDeadline = async () => {
    if (!job.applyUrl || isCrawling) return;
    setIsCrawling(true);
    try {
      const res = await fetch('/api/telegram/crawl-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: directApplyUrl || job.applyUrl,
          emailId: message.id,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.deadline) {
        setCrawledDeadline(json.data.deadline);
        // If the portal confirms closed or expired, auto-complete & remove from active suggestions
        if (json.data.isClosed || json.data.isExpired) {
          if (onStatusChange && !isCompleted) {
            onStatusChange(message.id, 'archived');
          }
        }
      }
    } catch (err) {
      console.error('Failed to crawl deadline from site:', err);
    } finally {
      setIsCrawling(false);
    }
  };

  // Function to resolve and bypass intermediate 3rd party links directly to ATS
  const handleDirectApplyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If already resolved to a direct portal, open immediately
    if (directApplyUrl) {
      window.open(directApplyUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!job.applyUrl) return;

    // Resolve in background and open
    setIsResolvingLink(true);
    try {
      const res = await fetch('/api/telegram/resolve-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: job.applyUrl,
          emailId: message.id,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.directApplyUrl) {
        const resolvedUrl = json.data.directApplyUrl;
        setDirectApplyUrl(resolvedUrl);
        setIsBypassed(true);
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Failed to bypass intermediate link:', err);
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsResolvingLink(false);
    }
  };

  const handleToggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(message.id, isCompleted ? 'read' : 'archived');
    }
  };

  const displayDeadline = crawledDeadline || job.deadline;
  const isVerifiedFromSite = Boolean(crawledDeadline);
  const isClosedOrExpired =
    (crawledDeadline && (crawledDeadline.includes('Closed') || crawledDeadline.includes('Expired') || crawledDeadline.includes('Deadline Passed'))) ||
    (job.deadline && (job.deadline.includes('Closed') || job.deadline.includes('Expired') || job.deadline.includes('Deadline Passed')));

  return (
    <div
      className={`bg-white dark:bg-[#12141c] border rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-4 ${
        isCompleted
          ? 'border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-500/30 dark:bg-emerald-950/10'
          : 'border-slate-200/90 hover:border-slate-300 dark:border-[#1e2230] dark:hover:border-orange-500/40'
      }`}
    >
      {/* 1. Header: Company, Role, Channel & Priority */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
            }`}
          >
            {isCompleted ? <Check className="w-5 h-5" /> : companyInitial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {job.company}
              </span>
              {isCompleted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Applied / Done
                </span>
              )}
              {isClosedOrExpired && !isCompleted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
                  Applications Closed
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-blue-900 dark:text-orange-300/90 mt-0.5 truncate">
              {job.role}
            </h3>
          </div>
        </div>

        {/* Posted Time */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>{job.postedDate}</span>
          </div>
        </div>
      </div>

      {/* 2. Structured Job Details Grid (Salary, Qualification, Location, Deadline) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {/* Salary Package */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200/80 dark:border-[#1e2230] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Salary Package</div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{job.salary}</div>
          </div>
        </div>

        {/* Qualification / Batch */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200/80 dark:border-[#1e2230] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Qualification</div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{job.qualification}</div>
          </div>
        </div>

        {/* Job Location */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200/80 dark:border-[#1e2230] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Location</div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{job.location}</div>
          </div>
        </div>

        {/* Last Date to Apply (With Crawl & Verification Status) */}
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
            isClosedOrExpired
              ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-500/30 dark:text-red-300'
              : isVerifiedFromSite
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-500/30 dark:text-emerald-300'
              : 'bg-amber-50/70 border-amber-200/80 text-amber-900 dark:bg-amber-950/30 dark:border-amber-500/30 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                isClosedOrExpired
                  ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
                  : isVerifiedFromSite
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${
                  isClosedOrExpired
                    ? 'text-red-700 dark:text-red-400 font-extrabold'
                    : isVerifiedFromSite
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                <span>{isClosedOrExpired ? 'Application Status' : 'Last Date to Apply'}</span>
                {isVerifiedFromSite && !isClosedOrExpired && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />}
                {isClosedOrExpired && <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />}
              </div>
              <div className={`text-xs font-bold truncate ${isClosedOrExpired ? 'text-red-700 dark:text-red-400' : 'dark:text-slate-100'}`}>
                {displayDeadline}
              </div>
            </div>
          </div>

          {job.applyUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCrawlDeadline();
              }}
              disabled={isCrawling}
              title="Verify application portal status & live deadline"
              className="p-1 rounded-lg hover:bg-white/80 dark:hover:bg-[#151722] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex-shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCrawling ? 'animate-spin text-blue-600 dark:text-orange-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Action Footer: Mark Done, Direct Apply Link (Bypassed), View Raw */}
      <div className="pt-2 border-t border-slate-100 dark:border-[#1e2230] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOriginal(!showOriginal)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
          >
            <span>{showOriginal ? 'Hide original message' : 'View original message'}</span>
            {showOriginal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mark as Done / Applied button */}
          <button
            type="button"
            onClick={handleToggleCompleted}
            className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              isCompleted
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#151722] dark:hover:bg-[#1a1e2e] dark:text-slate-300 dark:border dark:border-[#1e2230]'
                : isClosedOrExpired
                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            }`}
          >
            {isCompleted ? (
              <>
                <Undo2 className="w-3.5 h-3.5" />
                <span>Move to Active</span>
              </>
            ) : isClosedOrExpired ? (
              <>
                <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>Mark Completed / Closed</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mark Applied</span>
              </>
            )}
          </button>

          {job.applyUrl && (
            <button
              type="button"
              onClick={handleDirectApplyClick}
              disabled={isResolvingLink}
              title={isBypassed ? 'Opens direct employer application portal' : 'Bypasses 3rd party blog & opens direct portal'}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 ${
                isClosedOrExpired
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 dark:bg-[#1c2030] dark:text-slate-400'
                  : 'bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 dark:font-bold'
              }`}
            >
              {isResolvingLink ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Opening Link...</span>
                </>
              ) : isClosedOrExpired ? (
                <>
                  <span>Portal Closed</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Apply</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Original Raw Message */}
      {showOriginal && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
          {job.rawText}
        </div>
      )}
    </div>
  );
};
