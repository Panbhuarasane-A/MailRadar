import React, { useState, useEffect } from 'react';
import { SystemSettings, SensitivityLevel, UserProfile, CustomCategory } from '../../types';
import {
  Sliders,
  Shield,
  Cpu,
  Check,
  Mail,
  Send,
  User,
  Sun,
  Moon,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  LogOut,
  RefreshCw,
  Layers,
  Tag,
  Settings2,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../../services/api';
import { getCategoryTheme, DEFAULT_CUSTOM_CATEGORIES } from '../../utils/categoryClassifier';
import { ToggleSwitch } from '../common/ToggleSwitch';

interface SettingsViewProps {
  settings: SystemSettings | null;
  onUpdateSensitivity: (level: SensitivityLevel) => void;
  currentUser?: UserProfile | null;
  categories?: CustomCategory[];
  onOpenManageCategories?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenConnectMailbox?: () => void;
  onOpenTelegramModal?: () => void;
  onOpenLoginModal?: () => void;
  onOpenTutorial?: () => void;
  onRefresh?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSensitivity,
  currentUser,
  categories = DEFAULT_CUSTOM_CATEGORIES,
  onOpenManageCategories,
  theme = 'dark',
  onToggleTheme,
  onOpenConnectMailbox,
  onOpenTelegramModal,
  onOpenLoginModal,
  onOpenTutorial,
  onRefresh,
}) => {
  const [selectedSensitivity, setSelectedSensitivity] = useState<SensitivityLevel>(
    (currentUser?.sensitivity as SensitivityLevel) || settings?.sensitivity || 'balanced'
  );
  const [isSaving, setIsSaving] = useState(false);

  // User Profile Form
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telegram channels state
  const [telegramChannels, setTelegramChannels] = useState<string[]>([]);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [isSyncingChannels, setIsSyncingChannels] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mailbox state
  const [mailboxStatus, setMailboxStatus] = useState<any>(null);
  const [isLoadingMailbox, setIsLoadingMailbox] = useState(false);
  const [isSyncingMailbox, setIsSyncingMailbox] = useState(false);
  const [mailboxMsg, setMailboxMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync All
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Preference Toggle States
  const [soundAlerts, setSoundAlerts] = useState(() => localStorage.getItem('mr_sound_alerts') !== 'false');
  const [dailyDigest, setDailyDigest] = useState(() => localStorage.getItem('mr_daily_digest') !== 'false');
  const [hotspotAlerts, setHotspotAlerts] = useState(() => localStorage.getItem('mr_hotspot_alerts') !== 'false');
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('mr_auto_sync') !== 'false');

  const handleToggleSound = (val: boolean) => {
    setSoundAlerts(val);
    localStorage.setItem('mr_sound_alerts', String(val));
  };

  const handleToggleDailyDigest = (val: boolean) => {
    setDailyDigest(val);
    localStorage.setItem('mr_daily_digest', String(val));
  };

  const handleToggleHotspots = (val: boolean) => {
    setHotspotAlerts(val);
    localStorage.setItem('mr_hotspot_alerts', String(val));
  };

  const handleToggleAutoSync = (val: boolean) => {
    setAutoSync(val);
    localStorage.setItem('mr_auto_sync', String(val));
  };

  // Load user's saved channels & mailbox status
  const loadUserSettings = async () => {
    try {
      const [channels, mbStatus] = await Promise.allSettled([
        api.getTelegramChannels(),
        api.getMailboxStatus(),
      ]);

      if (channels.status === 'fulfilled' && Array.isArray(channels.value)) {
        setTelegramChannels(channels.value);
      }
      if (mbStatus.status === 'fulfilled') {
        setMailboxStatus(mbStatus.value);
      }
    } catch (err) {
      console.error('[SettingsView] Error loading settings:', err);
    }
  };

  useEffect(() => {
    loadUserSettings();
    if (currentUser?.name) {
      setDisplayName(currentUser.name);
    }
  }, [currentUser]);

  const sensitivityProfiles: {
    id: SensitivityLevel;
    label: string;
    description: string;
    hotspotCutoff: number;
    importantCutoff: number;
  }[] = [
    {
      id: 'conservative',
      label: 'Conservative',
      description: 'Strict filtering. Only true emergencies and direct C-suite requests qualify as Urgent (85+ pts).',
      hotspotCutoff: 85,
      importantCutoff: 65,
    },
    {
      id: 'balanced',
      label: 'Balanced (Recommended)',
      description: 'Default executive calibration. Flags time-sensitive actions, VIP placement requests, and high stakes (80+ pts).',
      hotspotCutoff: 80,
      importantCutoff: 60,
    },
    {
      id: 'aggressive',
      label: 'Aggressive',
      description: 'High sensitivity. Escalates any deliverable due this week or email with action items to Urgent (72+ pts).',
      hotspotCutoff: 72,
      importantCutoff: 50,
    },
  ];

  const handleApplySensitivity = async (level: SensitivityLevel) => {
    setSelectedSensitivity(level);
    setIsSaving(true);
    try {
      await onUpdateSensitivity(level);
      await api.updateProfile({ sensitivity: level });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await api.updateProfile({
        name: displayName.trim() || undefined,
        password: newPassword.trim() || undefined,
      });
      setNewPassword('');
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    }
  };

  const handleAddTelegramChannel = async () => {
    if (!newChannelInput.trim()) return;
    setIsAddingChannel(true);
    setTelegramMsg(null);
    try {
      const res = await api.syncTelegramChannel(newChannelInput.trim(), 20);
      setNewChannelInput('');
      setTelegramMsg({
        type: 'success',
        text: `Added & scraped @${res.channelHandle} (${res.newIngested} new job alert(s) ingested)!`,
      });
      loadUserSettings();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setTelegramMsg({ type: 'error', text: err.message || 'Failed to add Telegram channel.' });
    } finally {
      setIsAddingChannel(false);
    }
  };

  const handleRemoveTelegramChannel = async (handle: string) => {
    try {
      const updated = await api.removeTelegramChannel(handle);
      setTelegramChannels(updated);
      setTelegramMsg({ type: 'success', text: `Removed @${handle} from your channels.` });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setTelegramMsg({ type: 'error', text: err.message || 'Failed to remove channel.' });
    }
  };

  const handleSyncAllChannels = async () => {
    setIsSyncingChannels(true);
    setTelegramMsg(null);
    try {
      await api.syncAllTelegramChannels();
      setTelegramMsg({ type: 'success', text: 'All your Telegram channels synchronized successfully!' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setTelegramMsg({ type: 'error', text: err.message || 'Failed to sync Telegram channels.' });
    } finally {
      setIsSyncingChannels(false);
    }
  };

  const handleSyncGmailOAuth = async () => {
    setIsSyncingMailbox(true);
    setMailboxMsg(null);
    try {
      const res = await api.syncGmailOAuth(25);
      setMailboxMsg({ type: 'success', text: res.message || `Successfully synced ${res.newCount} new emails via Google OAuth!` });
      loadUserSettings();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setMailboxMsg({ type: 'error', text: err.message || 'Failed to sync Gmail via OAuth.' });
    } finally {
      setIsSyncingMailbox(false);
    }
  };

  const handleDisconnectMailbox = async () => {
    try {
      await api.updatePreferences({ connectedMailbox: null });
      setMailboxMsg({ type: 'success', text: 'Disconnected personal mailbox.' });
      loadUserSettings();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setMailboxMsg({ type: 'error', text: err.message || 'Failed to disconnect mailbox.' });
    }
  };

  const handleSyncAllWorkspace = async () => {
    setIsSyncingAll(true);
    try {
      await api.syncAllForUser();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const userInitial = (currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-900 dark:text-slate-100 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 dark:bg-gradient-to-br dark:from-orange-500 dark:to-orange-600 text-white flex items-center justify-center font-extrabold text-lg shadow-xs">
            {userInitial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight dark:text-white">
                {currentUser?.name || 'Workspace Account'}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-orange-500/10 text-blue-700 dark:text-orange-400 border border-blue-200 dark:border-orange-500/30 font-mono">
                ACTIVE USER
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {currentUser?.email || 'user@mailradar.ai'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#151722] hover:bg-slate-200 dark:hover:bg-[#1e2230] text-slate-700 dark:text-slate-200 border border-transparent dark:border-[#1e2230] transition-colors flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Switch User</span>
            </button>
          )}

          <button
            onClick={handleSyncAllWorkspace}
            disabled={isSyncingAll}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Syncing...' : 'Sync Everything Now'}</span>
          </button>
        </div>
      </div>

      {/* 2. Grid: Customized Email Collection & Customized Telegram Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* A. Customized Email Collection Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2230]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 flex items-center justify-center text-blue-600 dark:text-orange-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold dark:text-white">Customized Email Collection</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Google OAuth 2.0 or IMAP Personal Mailbox
                </p>
              </div>
            </div>

            {mailboxStatus?.connected ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {mailboxStatus?.connectedMailbox?.provider === 'google_oauth' ? 'Google OAuth Active' : 'Connected'}
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#151722] text-slate-500 dark:text-slate-400 border border-transparent dark:border-[#1e2230]">
                Not Connected
              </span>
            )}
          </div>

          {mailboxMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                mailboxMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {mailboxMsg.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{mailboxMsg.text}</span>
            </div>
          )}

          {mailboxStatus?.connectedMailbox ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#151722]/50 border border-slate-200/60 dark:border-[#1e2230] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Connected Account:</span>
                <span className="font-mono font-bold dark:text-slate-200">{mailboxStatus.connectedMailbox.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Integration Method:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-orange-400">
                  {mailboxStatus.connectedMailbox.provider === 'google_oauth' ? 'Google OAuth 2.0 (REST API)' : 'IMAP / App Password'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Real Emails Ingested:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {mailboxStatus.totalRealEmails || 0} emails
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                {mailboxStatus.connectedMailbox.provider === 'google_oauth' ? (
                  <button
                    onClick={handleSyncGmailOAuth}
                    disabled={isSyncingMailbox}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isSyncingMailbox ? 'animate-spin' : ''}`} />
                    <span>{isSyncingMailbox ? 'Syncing...' : 'Sync Gmail via OAuth'}</span>
                  </button>
                ) : (
                  onOpenConnectMailbox && (
                    <button
                      onClick={onOpenConnectMailbox}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white transition-colors"
                    >
                      Sync / Reconfigure
                    </button>
                  )
                )}
                <button
                  onClick={handleDisconnectMailbox}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-[#1e2230] hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#151722]/30 border border-dashed border-slate-200 dark:border-[#1e2230] text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your real Gmail or Outlook inbox with Google OAuth 2.0 or an App Password to run live priority scoring on your actual emails.
              </p>
              {onOpenConnectMailbox && (
                <button
                  onClick={onOpenConnectMailbox}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Connect Real Mailbox</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* B. Customized Telegram Channels Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2230]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 flex items-center justify-center text-blue-600 dark:text-orange-400">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold dark:text-white">Customized Telegram Feeds</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Manage the job & hiring channels monitored for this account
                </p>
              </div>
            </div>

            <button
              onClick={handleSyncAllChannels}
              disabled={isSyncingChannels || telegramChannels.length === 0}
              className="text-xs font-bold text-blue-600 dark:text-orange-400 hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <RotateCcw className={`w-3 h-3 ${isSyncingChannels ? 'animate-spin' : ''}`} />
              <span>Sync Channels</span>
            </button>
          </div>

          {telegramMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                telegramMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {telegramMsg.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{telegramMsg.text}</span>
            </div>
          )}

          {/* Add Channel Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newChannelInput}
              onChange={(e) => setNewChannelInput(e.target.value)}
              placeholder="e.g. @techjobs or https://t.me/techjobs"
              className="flex-1 bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
            />
            <button
              onClick={handleAddTelegramChannel}
              disabled={isAddingChannel || !newChannelInput.trim()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingChannel ? 'Scraping...' : 'Add Channel'}</span>
            </button>
          </div>

          {/* Channels List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Monitored Channels ({telegramChannels.length})
            </div>

            {telegramChannels.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No channels added yet. Enter a channel handle above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {telegramChannels.map((handle) => (
                  <div
                    key={handle}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#151722] border border-slate-200 dark:border-[#1e2230] text-xs flex items-center gap-2 group"
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
                      onClick={() => handleRemoveTelegramChannel(handle)}
                      title="Remove channel"
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Custom Mail Categories & Automated Matching Rules */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2230]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-orange-500/10 border border-blue-200 dark:border-orange-500/30 flex items-center justify-center text-blue-600 dark:text-orange-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold dark:text-white">Custom Mail Categories & Keyword Rules</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Manage your personalized categories, custom color codes, icons, and automated keyword match triggers
              </p>
            </div>
          </div>

          {onOpenManageCategories && (
            <button
              onClick={onOpenManageCategories}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Customize Categories ({categories.length})</span>
            </button>
          )}
        </div>

        {/* Category overview badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const catTheme = getCategoryTheme(cat.color);
            return (
              <div
                key={cat.id}
                className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#151722]/60 border border-slate-200/60 dark:border-[#1e2230] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${catTheme.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${catTheme.dot}`} />
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {cat.keywords.length} rule(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={cat.description}>
                  {cat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Sensitivity Calibration */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#1e2230]">
          <Sliders className="w-5 h-5 text-blue-600 dark:text-orange-400" />
          <div>
            <h2 className="text-sm font-bold dark:text-white">AI Priority Intelligence & Sensitivity Tuning</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust how aggressively Mailo AI escalates emails & job opportunities into Urgent and Important tiers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sensitivityProfiles.map((p) => {
            const isSelected = selectedSensitivity === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleApplySensitivity(p.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/40 dark:bg-orange-500/10 border-blue-600 dark:border-orange-500 ring-2 ring-blue-100 dark:ring-orange-500/30 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-[#151722]/50 border-slate-200/80 dark:border-[#1e2230] hover:border-slate-300 dark:hover:border-[#2a3044]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold dark:text-white">{p.label}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-orange-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {p.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-[#1e2230] space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Urgent Cutoff:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{p.hotspotCutoff} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Important Cutoff:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{p.importantCutoff} pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. User Profile & Account Security */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#1e2230]">
          <User className="w-5 h-5 text-blue-600 dark:text-orange-400" />
          <div>
            <h2 className="text-sm font-bold dark:text-white">Profile & Workspace Security</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage display name, password credentials, and theme settings
            </p>
          </div>
        </div>

        {profileMsg && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
              profileMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {profileMsg.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Panbhuarasane"
              className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Change Account Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password..."
              className="w-full bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white dark:text-slate-950 shadow-xs transition-all btn-spring"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* 6. System Preferences & Micro-Interactions */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#1e2230]">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-orange-400" />
          <div>
            <h2 className="text-sm font-bold dark:text-white">System Preferences & Notification Toggles</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize UI theme, real-time alert sounds, morning briefs, and synchronization behaviors
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Toggle 1: Theme Switch */}
          {onToggleTheme && (
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#151722]/60 border border-slate-200/70 dark:border-[#1e2230] flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-[#2a2f40]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-indigo-950/50 border border-amber-200 dark:border-indigo-800 flex items-center justify-center text-amber-500 dark:text-indigo-400 flex-shrink-0">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {theme === 'dark' ? 'Dark Mode (Active)' : 'Light Mode (Active)'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Switch between dark and light workspace themes
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={theme === 'dark'}
                onChange={onToggleTheme}
                activeColor="orange"
                size="md"
                iconOn={<Moon className="w-3 h-3" />}
                iconOff={<Sun className="w-3 h-3 text-amber-500" />}
              />
            </div>
          )}

          {/* Toggle 2: Sound Alerts */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#151722]/60 border border-slate-200/70 dark:border-[#1e2230] flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-[#2a2f40]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                {soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Audio & Sound Alerts
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Play subtle chime for incoming hotspot priority emails
                </div>
              </div>
            </div>
            <ToggleSwitch
              checked={soundAlerts}
              onChange={handleToggleSound}
              activeColor="blue"
              size="md"
            />
          </div>

          {/* Toggle 3: Daily AI Executive Brief */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#151722]/60 border border-slate-200/70 dark:border-[#1e2230] flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-[#2a2f40]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Daily AI Executive Brief
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Generate morning executive digests of urgent topics
                </div>
              </div>
            </div>
            <ToggleSwitch
              checked={dailyDigest}
              onChange={handleToggleDailyDigest}
              activeColor="emerald"
              size="md"
            />
          </div>

          {/* Toggle 4: Hotspot Alerts */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#151722]/60 border border-slate-200/70 dark:border-[#1e2230] flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-[#2a2f40]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  High-Risk Emergency Banners
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Highlight immediate actionable threats & C-suite emails
                </div>
              </div>
            </div>
            <ToggleSwitch
              checked={hotspotAlerts}
              onChange={handleToggleHotspots}
              activeColor="orange"
              size="md"
            />
          </div>

          {/* Interactive Tutorial Tour Launcher Card */}
          {onOpenTutorial && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-cyan-500/10 border border-purple-500/30 flex items-center justify-between gap-4 transition-all hover:border-purple-400">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)] flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-cyan-300 animate-spin" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Interactive Tutorial & Feature Tour</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                      Guide
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Re-explore Mailo AI features, 0–100 scoring, Google OAuth & Telegram ingestion
                  </div>
                </div>
              </div>

              <button
                onClick={onOpenTutorial}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5 hover:scale-102 active:scale-95 border border-purple-400/40 flex-shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Tour</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

