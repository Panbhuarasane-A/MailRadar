import React, { useState } from 'react';
import { Email, PriorityTier } from '../../types';
import { PriorityBadge } from './PriorityBadge';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  Archive,
  ThumbsUp,
  ThumbsDown,
  Star,
  Calendar,
  Zap,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface EmailCardProps {
  email: Email;
  onSelect: (email: Email) => void;
  onStatusChange: (id: string, status: 'unread' | 'read' | 'archived') => void;
  onSnooze: (email: Email) => void;
  onFeedback: (emailId: string, action: 'thumbs_up' | 'thumbs_down') => void;
  onToggleVip?: (senderEmail: string, isVip: boolean) => void;
}

export const EmailCard: React.FC<EmailCardProps> = ({
  email,
  onSelect,
  onStatusChange,
  onSnooze,
  onFeedback,
}) => {
  const [feedbackSent, setFeedbackSent] = useState<'thumbs_up' | 'thumbs_down' | null>(null);

  const getTierCardClasses = (tier: PriorityTier) => {
    switch (tier) {
      case 'hotspot':
        return 'border-rose-500/50 bg-gradient-to-r from-rose-950/20 via-[#121829] to-[#121829] shadow-[0_0_18px_rgba(244,63,94,0.15)] hover:border-rose-400 hover:shadow-[0_0_22px_rgba(244,63,94,0.25)]';
      case 'important':
        return 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-[#121829] to-[#121829] shadow-[0_0_14px_rgba(245,158,11,0.12)] hover:border-amber-400 hover:shadow-[0_0_18px_rgba(245,158,11,0.2)]';
      case 'normal':
        return 'border-slate-800 bg-[#111726] hover:border-sky-500/40 hover:shadow-[0_0_12px_rgba(56,189,248,0.1)]';
      case 'low':
      default:
        return 'border-slate-800/80 bg-[#0d121f]/90 opacity-80 hover:opacity-100 hover:border-slate-700';
    }
  };

  const getCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      work: 'bg-indigo-950 text-indigo-300 border-indigo-800/50',
      finance: 'bg-emerald-950 text-emerald-300 border-emerald-800/50',
      academic: 'bg-purple-950 text-purple-300 border-purple-800/50',
      personal: 'bg-blue-950 text-blue-300 border-blue-800/50',
      promotional: 'bg-slate-900 text-slate-400 border-slate-700',
      other: 'bg-slate-900 text-slate-400 border-slate-700',
    };
    return colors[cat] || colors.other;
  };

  const handleThumb = (e: React.MouseEvent, action: 'thumbs_up' | 'thumbs_down') => {
    e.stopPropagation();
    setFeedbackSent(action);
    onFeedback(email.id, action);
  };

  return (
    <div
      onClick={() => onSelect(email)}
      className={`group relative rounded-xl border p-5 transition-all duration-200 cursor-pointer ${getTierCardClasses(
        email.priorityTier
      )}`}
    >
      {/* Top Bar: Tier Badge, Sender, Date, Status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <PriorityBadge tier={email.priorityTier} score={email.priorityScore} />

          {/* Category Tag */}
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider border ${getCategoryBadge(
              email.category
            )}`}
          >
            {email.category}
          </span>

          {/* Action Required Tag */}
          {email.requiresAction && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Zap className="w-3 h-3 fill-rose-400 text-rose-400" />
              Action Required
            </span>
          )}

          {/* Deadline Tag */}
          {email.deadline && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Calendar className="w-3 h-3 text-amber-400" />
              Due {format(new Date(email.deadline), 'MMM d, h:mm a')}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Sender & Subject */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-slate-200">
            {email.senderName || email.sender}
          </span>
          {email.senderName && (
            <span className="text-xs text-slate-500 font-mono">
              &lt;{email.sender}&gt;
            </span>
          )}
          {email.senderProfile?.isVip && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> VIP
            </span>
          )}
        </div>

        <h3 className="text-base font-semibold text-slate-100 group-hover:text-rose-400 transition-colors flex items-center gap-2">
          {email.status === 'unread' && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
          )}
          {email.subject}
        </h3>
      </div>

      {/* Explainable AI Reasoning Banner (Non-negotiable) */}
      <div className="mt-3 p-2.5 rounded-lg bg-[#0b0f19]/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-slate-200">AI Priority Reasoning: </span>
          <span className="text-slate-300">{email.reasoning}</span>
        </div>
      </div>

      {/* Snippet */}
      <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
        {email.bodySnippet}
      </p>

      {/* Bottom Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        {/* Feedback Thumbs */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-500 mr-1">Score accurate?</span>
          <button
            onClick={(e) => handleThumb(e, 'thumbs_up')}
            title="Accurate score (helps AI learn)"
            className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${
              feedbackSent === 'thumbs_up' ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-500 hover:text-emerald-400'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleThumb(e, 'thumbs_down')}
            title="Inaccurate score (tunes sensitivity)"
            className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${
              feedbackSent === 'thumbs_down' ? 'text-rose-400 bg-rose-950/40' : 'text-slate-500 hover:text-rose-400'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Email Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSnooze(email);
            }}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            <Clock className="w-3 h-3 text-slate-400" />
            Snooze
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(email.id, email.status === 'read' ? 'unread' : 'read');
            }}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title={email.status === 'read' ? 'Mark unread' : 'Mark read'}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                email.status === 'read' ? 'text-emerald-400' : 'text-slate-400'
              }`}
            />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(email.id, 'archived');
            }}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Archive email"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>

          <div className="pl-1 text-slate-500 group-hover:text-slate-300 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
