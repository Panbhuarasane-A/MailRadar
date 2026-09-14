import React, { useState, useEffect } from 'react';
import { Send, Sparkles, X, CheckCircle2, AlertCircle, Trash2, RotateCcw, Link2, ExternalLink, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';

interface TelegramIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostIngested: () => void;
}

export const TelegramIngestModal: React.FC<TelegramIngestModalProps> = ({
  isOpen,
  onClose,
  onPostIngested,
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'paste'>('channels');
  
  // Channel Links Tab
  const [channelLinks, setChannelLinks] = useState('');
  const [savedChannels, setSavedChannels] = useState<string[]>([]);
  const [syncLimit, setSyncLimit] = useState('20');
  const [isScraping, setIsScraping] = useState(false);

  // Quick Paste Tab
  const [channelName, setChannelName] = useState('@CampusPlacementAlerts');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSavedChannels = async () => {
    try {
      const channels = await api.getTelegramChannels();
      if (Array.isArray(channels)) {
        setSavedChannels(channels);
      }
    } catch (err) {
      console.error('Failed to load telegram channels:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedChannels();
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncChannels = async (specificChannel?: string) => {
    const targetInput = specificChannel || channelLinks.trim();
    if (!targetInput) {
      setErrorMsg('Please enter one or more Telegram channel links or handles.');
      return;
    }

    setIsScraping(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const links = targetInput.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
      let totalNew = 0;
      const summaries: string[] = [];

      for (const link of links) {
        const res = await api.syncTelegramChannel(link, parseInt(syncLimit, 10));
        totalNew += res.newIngested || 0;
        summaries.push(`@${res.channelHandle}: ${res.newIngested} new job(s)`);
      }

      setSuccessMsg(`Synced! ${totalNew} new job post(s) added to Radar (${summaries.join(', ')})`);
      setChannelLinks('');
      loadSavedChannels();
      onPostIngested();
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scrape channel.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSyncAllSaved = async () => {
    if (savedChannels.length === 0) return;
    setIsScraping(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.syncAllTelegramChannels();
      setSuccessMsg(`Successfully synced all ${savedChannels.length} saved Telegram channels!`);
      onPostIngested();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync channels');
    } finally {
      setIsScraping(false);
    }
  };

  const handleRemoveChannel = async (handle: string) => {
    try {
      const updated = await api.removeTelegramChannel(handle);
      setSavedChannels(updated || []);
      onPostIngested();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove channel');
    }
  };

  const handleQuickPasteSubmit = async () => {
    if (!messageText.trim()) {
      setErrorMsg('Please paste the job post text.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.ingestTelegramJob(
        channelName.trim() || '@PlacementAlerts',
        messageText.trim()
      );

      setSuccessMsg('Job posting ingested! Priority analysis and action task created.');
      onPostIngested();
      setTimeout(() => {
        setMessageText('');
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to ingest job post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 modal-backdrop">
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] rounded-3xl max-w-xl w-full p-6 shadow-2xl z-10 space-y-4 text-slate-900 dark:text-slate-100 transition-colors animate-scale-in-spring">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2230]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-100 dark:border-orange-500/20 flex items-center justify-center text-blue-600 dark:text-orange-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Telegram Job Channels Live Feed
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-orange-500/15 text-blue-700 dark:text-orange-300 border border-blue-200 dark:border-orange-500/30 font-semibold">
                  AUTO-PARSE
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Provide public Telegram channel links to auto-ingest hiring alerts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#0c0d12] border border-transparent dark:border-[#1e2230] rounded-xl">
          <button
            onClick={() => {
              setActiveTab('channels');
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'channels'
                ? 'bg-white dark:bg-[#151722] text-blue-600 dark:text-orange-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Provide Channel Links (Auto-Scrape)
          </button>

          <button
            onClick={() => {
              setActiveTab('paste');
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'paste'
                ? 'bg-white dark:bg-[#151722] text-blue-600 dark:text-orange-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Quick Paste Message
          </button>
        </div>

        {/* Tab 1: Channel Links */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Telegram Channel Link(s) or Handle(s)
              </label>
              <textarea
                value={channelLinks}
                onChange={(e) => setChannelLinks(e.target.value)}
                placeholder="Paste links (one per line or comma-separated):&#10;https://t.me/placementdriveofficial&#10;https://t.me/techjobsindia&#10;@StJosephPlacementChannel"
                rows={3}
                className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 font-mono focus:bg-white dark:focus:bg-[#0c0d12] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Works with any public Telegram channel link (e.g. <code className="text-slate-700 dark:text-orange-300 font-semibold font-mono">t.me/channel_name</code> or <code className="text-slate-700 dark:text-orange-300 font-semibold font-mono">@handle</code>).
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Fetch Limit:</span>
                <select
                  value={syncLimit}
                  onChange={(e) => setSyncLimit(e.target.value)}
                  className="bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] rounded-lg p-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="10" className="dark:bg-[#151722]">Last 10 posts</option>
                  <option value="20" className="dark:bg-[#151722]">Last 20 posts</option>
                  <option value="40" className="dark:bg-[#151722]">Last 40 posts</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSyncChannels()}
                disabled={isScraping || !channelLinks.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isScraping ? 'Scraping Posts...' : 'Scrape & Ingest Links'}
              </button>
            </div>

            {/* Saved Channels List */}
            {savedChannels.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-[#1e2230] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Saved Active Channels ({savedChannels.length})
                  </span>
                  <button
                    onClick={handleSyncAllSaved}
                    disabled={isScraping}
                    className="text-xs text-blue-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className={`w-3 h-3 ${isScraping ? 'animate-spin' : ''}`} />
                    Sync All Channels
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {savedChannels.map((handle) => (
                    <div
                      key={handle}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 group"
                    >
                      <a
                        href={`https://t.me/${handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-blue-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                      >
                        @{handle}
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                      <button
                        onClick={() => handleSyncChannels(handle)}
                        title="Sync this channel"
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveChannel(handle)}
                        title="Remove channel"
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Quick Paste */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Channel Handle / Source
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="@PlacementAlerts"
                className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#0c0d12] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Message Content
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Paste the job posting message here..."
                rows={5}
                className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#0c0d12] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500 leading-relaxed font-sans"
              />
            </div>

            <button
              type="button"
              onClick={handleQuickPasteSubmit}
              disabled={isSubmitting || !messageText.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSubmitting ? 'Ingesting...' : 'Ingest Job Post'}
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>{successMsg}</div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-[#1e2230]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
