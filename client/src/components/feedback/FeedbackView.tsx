import React, { useState, useEffect, useMemo } from 'react';
import { UserFeedback, UserProfile } from '../../types';
import { api } from '../../services/api';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Trash2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Send,
  Star,
  X,
  AlertCircle,
  Lightbulb,
  Bug,
  HelpCircle,
  Mail,
  Plus,
} from 'lucide-react';
import { getPriorityTheme, getPriorityLabel } from '../../utils/categoryClassifier';

interface FeedbackViewProps {
  onSelectEmailById: (id: string) => void;
  currentUser?: UserProfile | null;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ onSelectEmailById, currentUser }) => {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<'all' | 'admin' | 'thumbs_up' | 'thumbs_down'>('all');

  // Modal State for Sending Feedback to Admin
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'general' | 'feature_request' | 'bug_report' | 'accuracy_issue'>('feature_request');
  const [subject, setSubject] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const data = await api.getUserFeedbacks();
      setFeedbacks(Array.isArray(data) ? data : (data as any).data || []);
    } catch (err) {
      console.error('Failed to load user feedbacks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleDeleteFeedback = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI removal (0ms)
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    try {
      await api.deleteFeedback(id);
    } catch (err) {
      console.error('Failed to delete feedback:', err);
      loadFeedbacks();
    }
  };

  const handleSendFeedbackToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setSubmitError('Please enter a feedback message.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.sendFeedbackToAdmin({
        category: feedbackCategory,
        subject: subject.trim() || `${feedbackCategory.replace('_', ' ').toUpperCase()} Feedback`,
        message: message.trim(),
        rating,
      });

      setSubmitSuccess('Your feedback has been sent directly to the Admin Dashboard! 🚀');
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess('');
        setSubject('');
        setMessage('');
        setRating(5);
        setFeedbackCategory('feature_request');
        loadFeedbacks();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to submit feedback to admin:', err);
      setSubmitError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics computation
  const totalCount = feedbacks.length;
  const adminFeedbacks = feedbacks.filter((f) => !f.emailId || f.action === 'direct_feedback' || f.action === 'bug_report' || f.action === 'feature_request');
  const thumbsUpCount = feedbacks.filter((f) => f.action === 'thumbs_up').length;
  const thumbsDownCount = feedbacks.filter((f) => f.action === 'thumbs_down').length;
  const accuracyRate = (thumbsUpCount + thumbsDownCount) > 0 
    ? Math.round((thumbsUpCount / (thumbsUpCount + thumbsDownCount)) * 100) 
    : 100;

  const filteredFeedbacks = useMemo(() => {
    if (filterAction === 'all') return feedbacks;
    if (filterAction === 'admin') {
      return feedbacks.filter((f) => !f.emailId || f.action === 'direct_feedback' || f.action === 'bug_report' || f.action === 'feature_request');
    }
    return feedbacks.filter((f) => f.action === filterAction);
  }, [feedbacks, filterAction]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-3xl p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 text-blue-700 dark:text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400" />
            <span>AI REINFORCEMENT & ACCURACY TUNING</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
            User Feedback & Accuracy Tuning
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Review your ratings, thumbs up/down AI priority corrections, and historical model tuning adjustments.
          </p>
        </div>
      </div>

      {/* 2. KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Submissions</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</div>
        </div>

        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Direct Admin Messages</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-orange-400 mt-1">{adminFeedbacks.length}</div>
        </div>

        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Accurate AI Ratings (👍)</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{thumbsUpCount}</div>
        </div>

        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Accuracy Agreement</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{accuracyRate}%</div>
        </div>
      </div>

      {/* 3. Main Feedback List Panel */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2230] flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#151722]/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Feedback & Message History</h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#1e2230] text-slate-700 dark:text-slate-300">
              {filteredFeedbacks.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterAction('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterAction === 'all'
                  ? 'bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#181a26]'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterAction('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterAction === 'admin'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#181a26]'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>Sent to Admin ({adminFeedbacks.length})</span>
            </button>
            <button
              onClick={() => setFilterAction('thumbs_up')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterAction === 'thumbs_up'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#181a26]'
              }`}
            >
              <span>👍 Accurate</span>
              <span>({thumbsUpCount})</span>
            </button>
            <button
              onClick={() => setFilterAction('thumbs_down')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterAction === 'thumbs_down'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#181a26]'
              }`}
            >
              <span>👎 Inaccurate</span>
              <span>({thumbsDownCount})</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-orange-400" />
            <div className="text-xs font-medium">Loading feedback records...</div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-[#151722] border border-blue-200 dark:border-[#1e2230] flex items-center justify-center mx-auto text-blue-600 dark:text-orange-400">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {filterAction === 'all' ? 'No feedback recorded yet' : `No ${filterAction.replace('_', ' ')} records`}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Rate emails with thumbs up or down in your inbox to train and personalize your AI priority classifier.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1e2230]">
            {filteredFeedbacks.map((fb) => {
              const isDirectAdmin = !fb.emailId || fb.action === 'direct_feedback' || fb.action === 'bug_report' || fb.action === 'feature_request';
              const isThumbsUp = fb.action === 'thumbs_up';
              const email = fb.email;
              const theme = email ? getPriorityTheme(email.priorityTier) : getPriorityTheme('normal');
              const priorityLabel = email ? getPriorityLabel(email.priorityTier) : 'Normal';

              return (
                <div
                  key={fb.id}
                  onClick={() => {
                    if (fb.emailId) onSelectEmailById(fb.emailId);
                  }}
                  className={`p-4 hover:bg-slate-50/80 dark:hover:bg-[#151722]/80 transition-colors select-none space-y-2 group ${
                    fb.emailId ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                      {isDirectAdmin ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                            <Send className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>Direct to Admin</span>
                          </span>

                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 bg-slate-100 dark:bg-[#1e2230] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2a2f44] capitalize">
                            {fb.action === 'bug_report' ? '🐞 Bug Report' : fb.action === 'feature_request' ? '💡 Feature Request' : '💬 Support'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${
                              isThumbsUp
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {isThumbsUp ? '👍 Accurate AI' : '👎 Inaccurate AI'}
                          </span>

                          {email && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${theme.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                              {priorityLabel} Priority
                            </span>
                          )}
                        </>
                      )}

                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {email?.subject || fb.comments?.slice(0, 60) || `Feedback #${fb.id.slice(0, 8)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {new Date(fb.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteFeedback(fb.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete feedback record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Feedback Details / Commentary */}
                  {fb.comments && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151722] border border-slate-200/60 dark:border-[#1e2230] text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      {fb.comments}
                    </div>
                  )}

                  {email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-1">
                      <span>Sender: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{email.senderName || email.sender}</strong></span>
                      <span>•</span>
                      <span>Category: <strong className="text-slate-700 dark:text-slate-300 font-semibold capitalize">{email.category || 'Inbox'}</strong></span>
                    </div>
                  )}

                  {isDirectAdmin && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pl-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Delivered to Admin Review Hub (admin@mailhinge.ai)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. MODAL: SEND FEEDBACK DIRECTLY TO ADMIN                 */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 modal-backdrop animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] animate-scale-in-spring"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1e2230] flex items-center justify-between bg-slate-50/50 dark:bg-[#0c0d12]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-orange-400 flex items-center justify-center border border-purple-500/20">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Send Feedback to Admin</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-100 dark:bg-orange-500/20 text-blue-700 dark:text-orange-300 font-bold">
                      Direct Channel
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Transmitted immediately to the Executive Admin Dashboard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#151722] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSendFeedbackToAdmin} className="p-6 overflow-y-auto space-y-4">
              {/* Alert Feedback Messages */}
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* Sender & Admin Routing Indicator Card */}
              <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-[#151722] border border-blue-200/60 dark:border-[#1e2230] text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>From: <strong className="text-slate-900 dark:text-white">{currentUser?.name || 'Current User'}</strong> ({currentUser?.email || 'User Session'})</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span>To: <strong className="text-purple-700 dark:text-orange-400">System Admin</strong> (<span className="font-mono">admin@mailhinge.ai</span>)</span>
                </div>
              </div>

              {/* 1. Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Feedback Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackCategory('feature_request')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      feedbackCategory === 'feature_request'
                        ? 'bg-blue-50 dark:bg-orange-500/15 border-blue-300 dark:border-orange-500 text-blue-700 dark:text-orange-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0c0d12] border-slate-200 dark:border-[#1e2230] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Feature Request</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackCategory('bug_report')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      feedbackCategory === 'bug_report'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0c0d12] border-slate-200 dark:border-[#1e2230] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Bug className="w-4 h-4 text-rose-500" />
                    <span>Bug / Issue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackCategory('accuracy_issue')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      feedbackCategory === 'accuracy_issue'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0c0d12] border-slate-200 dark:border-[#1e2230] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>AI Accuracy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackCategory('general')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      feedbackCategory === 'general'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0c0d12] border-slate-200 dark:border-[#1e2230] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 text-emerald-500" />
                    <span>General Feedback</span>
                  </button>
                </div>
              </div>

              {/* 2. Subject Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Topic / Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Priority score threshold needs tuning for job alerts..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* 3. Star Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Overall System Experience Rating
                </label>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] w-fit">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold font-mono ml-2 text-slate-700 dark:text-slate-300">
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* 4. Detailed Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Feedback / Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide clear details on your feedback, feature request, or what happened..."
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 text-slate-900 dark:text-slate-100 leading-relaxed resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e2230] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Sending to Admin...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit to Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
