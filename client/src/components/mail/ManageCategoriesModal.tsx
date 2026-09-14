import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CustomCategory, Email } from '../../types';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  Tag,
  Mail,
  Award,
  Briefcase,
  GraduationCap,
  Folder,
  Zap,
  DollarSign,
  Code,
  Star,
  Layers,
  Bell,
  Flame,
  Key,
  ShieldCheck,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Hash,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { getCategoryTheme, DEFAULT_CUSTOM_CATEGORIES } from '../../utils/categoryClassifier';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  emails?: Email[];
  onSaveCategories: (categories: CustomCategory[]) => Promise<void>;
}

// Icon dictionary for selection
const ICON_MAP: Record<string, React.ReactNode> = {
  Mail: <Mail className="w-4 h-4" />,
  Award: <Award className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  GraduationCap: <GraduationCap className="w-4 h-4" />,
  Folder: <Folder className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  Code: <Code className="w-4 h-4" />,
  Star: <Star className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Tag: <Tag className="w-4 h-4" />,
  Bell: <Bell className="w-4 h-4" />,
  Flame: <Flame className="w-4 h-4" />,
  Key: <Key className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
};

const COLOR_OPTIONS = [
  { id: 'blue', label: 'Blue', hex: '#2563EB' },
  { id: 'purple', label: 'Purple', hex: '#9333EA' },
  { id: 'indigo', label: 'Indigo', hex: '#4F46E5' },
  { id: 'emerald', label: 'Emerald', hex: '#10B981' },
  { id: 'amber', label: 'Amber', hex: '#F59E0B' },
  { id: 'rose', label: 'Rose', hex: '#F43F5E' },
  { id: 'cyan', label: 'Cyan', hex: '#06B6D4' },
  { id: 'fuchsia', label: 'Fuchsia', hex: '#D946EF' },
  { id: 'lime', label: 'Lime', hex: '#84CC16' },
  { id: 'orange', label: 'Orange', hex: '#EA580C' },
  { id: 'slate', label: 'Slate', hex: '#64748B' },
];

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  emails = [],
  onSaveCategories,
}) => {
  const [categoryList, setCategoryList] = useState<CustomCategory[]>(categories);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('blue');
  const [formIcon, setFormIcon] = useState('Tag');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [senderDomains, setSenderDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState('');

  // Domain Autocomplete Dropdown State
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const [highlightedDomainIndex, setHighlightedDomainIndex] = useState(0);
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract unique domains & stats from received emails
  const receivedDomainStats = useMemo(() => {
    if (!emails || emails.length === 0) return [];
    const map = new Map<string, { domain: string; senderName: string; sampleSender: string; count: number }>();

    for (const email of emails) {
      if (!email.sender) continue;
      // Extract clean email address
      const emailMatch =
        email.sender.match(/<([^>]+)>/) ||
        email.sender.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const rawEmail = emailMatch ? emailMatch[1] : email.sender;
      const atIdx = rawEmail.indexOf('@');
      if (atIdx === -1) continue;

      let domain = rawEmail.slice(atIdx + 1).toLowerCase().trim();
      domain = domain.replace(/[^a-z0-9.-]/gi, '');
      if (!domain || domain === 'unknown') continue;

      const rawSenderName = email.senderName || email.sender.split('<')[0].trim().replace(/^["']|["']$/g, '');
      const cleanSenderName = rawSenderName !== domain && rawSenderName !== rawEmail ? rawSenderName : '';

      const existing = map.get(domain);
      if (existing) {
        existing.count += 1;
        if (!existing.senderName && cleanSenderName) {
          existing.senderName = cleanSenderName;
        }
      } else {
        map.set(domain, {
          domain,
          senderName: cleanSenderName,
          sampleSender: email.sender,
          count: 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [emails]);

  // Extract frequent meaningful keywords from subjects
  const receivedKeywordSuggestions = useMemo(() => {
    if (!emails || emails.length === 0) return [];
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'your', 'from', 'this', 'that', 'have', 'from',
      'will', 'been', 'were', 'what', 'when', 'where', 'which', 'about', 'into',
      'over', 'after', 'mail', 'email', 'update', 'radar', 'test', 'demo', 'user'
    ]);

    const freqMap = new Map<string, number>();
    for (const email of emails) {
      if (!email.subject) continue;
      const tokens = email.subject
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 4 && !stopWords.has(t));

      for (const token of tokens) {
        freqMap.set(token, (freqMap.get(token) || 0) + 1);
      }
    }

    return Array.from(freqMap.entries())
      .filter(([_, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }, [emails]);

  // Filter domain suggestions for dropdown
  const filteredDomainSuggestions = useMemo(() => {
    const query = domainInput.trim().toLowerCase().replace(/^@/, '');
    const available = receivedDomainStats.filter((item) => !senderDomains.includes(item.domain));
    if (!query) {
      return available.slice(0, 8);
    }
    return available
      .filter(
        (item) =>
          item.domain.toLowerCase().includes(query) ||
          item.senderName.toLowerCase().includes(query) ||
          item.sampleSender.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [receivedDomainStats, domainInput, senderDomains]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target as Node)) {
        setIsDomainDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state when opened or categories prop updates
  useEffect(() => {
    if (isOpen) {
      setCategoryList(categories);
      setEditingId(null);
      setIsFormOpen(false);
      setStatusMsg(null);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormId('');
    setFormDescription('');
    setFormColor('blue');
    setFormIcon('Tag');
    setKeywords([]);
    setKeywordInput('');
    setSenderDomains([]);
    setDomainInput('');
    setIsDomainDropdownOpen(false);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (cat: CustomCategory) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormId(cat.id);
    setFormDescription(cat.description || '');
    setFormColor(cat.color || 'blue');
    setFormIcon(cat.icon || 'Tag');
    setKeywords([...(cat.keywords || [])]);
    setKeywordInput('');
    setSenderDomains([...(cat.senderDomains || [])]);
    setDomainInput('');
    setIsDomainDropdownOpen(false);
    setIsFormOpen(true);
  };

  const handleAddKeyword = (kwToAdd?: string) => {
    const raw = kwToAdd || keywordInput;
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;
    if (!keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    if (!kwToAdd) {
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleAddDomain = (domainToAdd?: string) => {
    const raw = domainToAdd || domainInput;
    let trimmed = raw.trim().toLowerCase().replace(/^@/, '');
    
    // Extract domain from full email address if entered
    if (trimmed.includes('@')) {
      trimmed = trimmed.split('@')[1];
    }
    // Remove protocol and path if entered as URL
    trimmed = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

    if (!trimmed) return;
    if (!senderDomains.includes(trimmed)) {
      setSenderDomains([...senderDomains, trimmed]);
    }
    setDomainInput('');
    setIsDomainDropdownOpen(false);
  };

  const handleRemoveDomain = (dom: string) => {
    setSenderDomains(senderDomains.filter((d) => d !== dom));
  };

  const handleSaveFormCategory = () => {
    if (!formName.trim()) {
      setStatusMsg({ type: 'error', text: 'Category name is required.' });
      return;
    }

    const generatedId = formId.trim()
      ? formId.trim().toLowerCase().replace(/\s+/g, '-')
      : formName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (!generatedId) {
      setStatusMsg({ type: 'error', text: 'Valid category identifier is required.' });
      return;
    }

    const newCategory: CustomCategory = {
      id: generatedId,
      name: formName.trim(),
      description: formDescription.trim() || `Custom category for ${formName.trim()}`,
      color: formColor,
      icon: formIcon,
      keywords: keywords.length > 0 ? keywords : [formName.trim().toLowerCase()],
      senderDomains: senderDomains,
      isDefault: false,
    };

    let updated: CustomCategory[];
    if (editingId) {
      updated = categoryList.map((c) => (c.id === editingId ? newCategory : c));
    } else {
      // Check duplicate ID
      if (categoryList.some((c) => c.id === generatedId)) {
        setStatusMsg({ type: 'error', text: `A category with identifier "${generatedId}" already exists.` });
        return;
      }
      updated = [...categoryList, newCategory];
    }

    setCategoryList(updated);
    resetForm();
    setStatusMsg({ type: 'success', text: `Category "${newCategory.name}" saved! Click "Save Changes" to apply.` });
  };

  const handleDeleteCategory = (catId: string) => {
    if (categoryList.length <= 1) {
      setStatusMsg({ type: 'error', text: 'You must have at least one category.' });
      return;
    }
    const updated = categoryList.filter((c) => c.id !== catId);
    setCategoryList(updated);
    if (editingId === catId) {
      resetForm();
    }
    setStatusMsg({ type: 'success', text: 'Category removed. Click "Save Changes" to apply.' });
  };

  const handleResetToDefaults = () => {
    setCategoryList(DEFAULT_CUSTOM_CATEGORIES);
    resetForm();
    setStatusMsg({ type: 'success', text: 'Reset to standard 5 categories. Click "Save Changes" to apply.' });
  };

  const handleSaveAllAndClose = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await onSaveCategories(categoryList);
      onClose();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save categories.' });
    } finally {
      setIsSaving(false);
    }
  };

  const previewTheme = getCategoryTheme(formColor);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 modal-backdrop">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#12141c] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#1e2230] flex flex-col max-h-[90vh] overflow-hidden animate-scale-in-spring">
        {/* 1. Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-[#1e2230] flex items-center justify-between bg-slate-50/70 dark:bg-[#0c0d12]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-orange-500 text-white dark:text-slate-950 font-bold flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Custom Mail Categories & Keyword Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Define your personalized categories, color tags, icons, and automated keyword triggers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#151722] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* 2. Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* A. Create / Edit Category Form */}
          {isFormOpen ? (
            <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-[#0c0d12] border border-blue-200 dark:border-[#1e2230] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-[#1e2230]">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-950 dark:text-orange-300">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-orange-400" />
                  <span>{editingId ? `Edit Category: ${formName || editingId}` : 'Create New Category'}</span>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingId) {
                        setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    placeholder="e.g. Hackathons & Bounties"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Slug Identifier */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unique Identifier (Slug)
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      disabled={!!editingId}
                      placeholder="e.g. hackathons"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-mono disabled:opacity-60 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Short Description / Subtitle
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Coding challenges, dev sprints, hackathons and bounty programs"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Theme Color
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormColor(c.id)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                          formColor === c.id ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {formColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Category Icon
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(ICON_MAP).map((iconKey) => {
                      const isSelected = formIcon === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setFormIcon(iconKey)}
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                          }`}
                          title={iconKey}
                        >
                          {ICON_MAP[iconKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Keywords & Phrases input */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Automated Match Keywords & Phrases
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Emails containing these words or phrases in the subject, body, or sender will match this category.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      placeholder="Type a keyword and press Enter (e.g. devpost, hackathon, prize pool)"
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddKeyword()}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Smart Subject Keyword Suggestions */}
                  {receivedKeywordSuggestions.filter((kw) => !keywords.includes(kw)).length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Suggested from your email subjects (click to add):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {receivedKeywordSuggestions
                          .filter((kw) => !keywords.includes(kw))
                          .slice(0, 6)
                          .map((kw) => (
                            <button
                              key={kw}
                              type="button"
                              onClick={() => handleAddKeyword(kw)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-all cursor-pointer"
                            >
                              <span>+ {kw}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {keywords.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No keywords added yet.</span>
                    ) : (
                      keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium shadow-2xs"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Sender Domains input with Auto-Suggest Dropdown */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Sender Domains (Optional)
                    </label>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      Auto-suggestions active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Emails from specific domains will match automatically. Type or choose from your received email senders below.
                  </p>

                  <div className="relative" ref={domainDropdownRef}>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={domainInput}
                          onFocus={() => setIsDomainDropdownOpen(true)}
                          onChange={(e) => {
                            setDomainInput(e.target.value);
                            setIsDomainDropdownOpen(true);
                            setHighlightedDomainIndex(0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setIsDomainDropdownOpen(true);
                              setHighlightedDomainIndex((prev) =>
                                Math.min(prev + 1, Math.max(0, filteredDomainSuggestions.length - 1))
                              );
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedDomainIndex((prev) => Math.max(prev - 1, 0));
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (isDomainDropdownOpen && filteredDomainSuggestions[highlightedDomainIndex]) {
                                handleAddDomain(filteredDomainSuggestions[highlightedDomainIndex].domain);
                              } else {
                                handleAddDomain();
                              }
                            } else if (e.key === 'Escape') {
                              setIsDomainDropdownOpen(false);
                            }
                          }}
                          placeholder="e.g. devpost.com, haveloc.com, unstop.com"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-8 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddDomain()}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Domain</span>
                      </button>
                    </div>

                    {/* Auto-suggest Dropdown Menu */}
                    {isDomainDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
                          <span>
                            {domainInput
                              ? `Matching Domains (${filteredDomainSuggestions.length})`
                              : `Top Domains in Your Mailbox (${filteredDomainSuggestions.length})`}
                          </span>
                          <span className="text-[9px] font-normal lowercase">click to add</span>
                        </div>

                        {filteredDomainSuggestions.length > 0 ? (
                          filteredDomainSuggestions.map((item, index) => (
                            <button
                              key={item.domain}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddDomain(item.domain);
                              }}
                              className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer group ${
                                highlightedDomainIndex === index
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-blue-100/70 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs">
                                  🌐
                                </div>
                                <div className="min-w-0">
                                  <div className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 truncate">
                                    @{item.domain}
                                  </div>
                                  {item.senderName && (
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      {item.senderName}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700">
                                  {item.count} {item.count === 1 ? 'mail' : 'mails'}
                                </span>
                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  + Add
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3.5 py-3 text-center text-xs text-slate-400">
                            {domainInput ? (
                              <div>
                                No exact matching domain found in received emails.
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleAddDomain();
                                  }}
                                  className="text-blue-600 dark:text-blue-400 font-semibold underline ml-1 cursor-pointer"
                                >
                                  Add "{domainInput.replace(/^@/, '')}"
                                </button>
                              </div>
                            ) : (
                              'No received sender domains available.'
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Domain Suggestion Pills from Received Mail */}
                  {receivedDomainStats.filter((s) => !senderDomains.includes(s.domain)).length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>Detected sender domains from your received emails:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {receivedDomainStats
                          .filter((s) => !senderDomains.includes(s.domain))
                          .slice(0, 6)
                          .map((s) => (
                            <button
                              key={s.domain}
                              type="button"
                              onClick={() => handleAddDomain(s.domain)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:border-blue-400 transition-all cursor-pointer shadow-2xs"
                              title={`Found ${s.count} email(s) from @${s.domain}${s.senderName ? ` (${s.senderName})` : ''}`}
                            >
                              <span>+ @{s.domain}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded-full bg-blue-200/60 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 font-sans font-bold">
                                {s.count}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Domain Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {senderDomains.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No domain rules configured yet.</span>
                    ) : (
                      senderDomains.map((dom) => (
                        <span
                          key={dom}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 text-xs font-mono shadow-2xs"
                        >
                          <span>@{dom}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(dom)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="sm:col-span-2 pt-2 border-t border-blue-100 dark:border-blue-900/60">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Live UI Preview
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs max-w-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center ${previewTheme.bg} ${previewTheme.text} ${previewTheme.border}`}
                      >
                        {ICON_MAP[formIcon] || <Tag className="w-4 h-4" />}
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                        12 <span className="text-[10px] font-normal text-slate-400">Emails</span>
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formName || 'Category Name'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={formDescription}>
                      {formDescription || 'Short description of this category.'}
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${previewTheme.badgeClass}`}
                      >
                        {formName || 'Badge'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {keywords.length} keyword(s)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Save Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-100 dark:border-[#1e2230]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#151722] hover:bg-slate-200 dark:hover:bg-[#1c2030] text-slate-700 dark:text-slate-200 border border-transparent dark:border-[#1e2230] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFormCategory}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 shadow-xs transition-colors"
                >
                  {editingId ? 'Update Category' : 'Add to Category List'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Active Custom Categories ({categoryList.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#151722] border border-slate-200 dark:border-[#1e2230] transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Reset to Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Category</span>
                </button>
              </div>
            </div>
          )}

          {/* B. List of Current Active Categories */}
          <div className="space-y-3">
            {categoryList.map((cat) => {
              const themeTokens = getCategoryTheme(cat.color);
              const iconNode = ICON_MAP[cat.icon || ''] || <Tag className="w-4 h-4" />;

              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#151722] border border-slate-200/80 dark:border-[#1e2230] hover:border-slate-300 dark:hover:border-orange-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${themeTokens.bg} ${themeTokens.text} ${themeTokens.border}`}
                    >
                      {iconNode}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-200/80 dark:bg-[#0c0d12] text-slate-600 dark:text-slate-400 border dark:border-[#1e2230]">
                          #{cat.id}
                        </span>
                        {cat.isDefault && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-orange-500/15 text-blue-600 dark:text-orange-300 border border-blue-200 dark:border-orange-500/30">
                            Preset
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={cat.description}>
                        {cat.description}
                      </p>

                      {/* Keywords summary chips */}
                      <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                        <span className="font-semibold text-slate-400 mr-1">Triggers:</span>
                        {cat.keywords.slice(0, 5).map((kw) => (
                          <span
                            key={kw}
                            className="px-1.5 py-0.2 rounded bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-[#1e2230] text-slate-600 dark:text-slate-300 font-mono"
                          >
                            {kw}
                          </span>
                        ))}
                        {cat.keywords.length > 5 && (
                          <span className="text-slate-400 font-mono font-medium">
                            +{cat.keywords.length - 5} more
                          </span>
                        )}
                        {cat.senderDomains && cat.senderDomains.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-orange-500/10 text-blue-600 dark:text-orange-300 border border-blue-200 dark:border-orange-500/20 font-mono">
                            @{cat.senderDomains.join(', @')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-white dark:hover:bg-[#1c2030] text-slate-600 dark:text-slate-300 transition-colors"
                      title="Edit category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-[#1e2230] bg-slate-50/70 dark:bg-[#0c0d12] flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Changes will automatically recalculate unread counts & mailbox filters.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#151722] hover:bg-slate-200 dark:hover:bg-[#1c2030] text-slate-700 dark:text-slate-200 border border-transparent dark:border-[#1e2230] transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveAllAndClose}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-slate-950 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save & Apply Categories'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
