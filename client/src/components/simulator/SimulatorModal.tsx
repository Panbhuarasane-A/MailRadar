import React, { useState, useEffect } from 'react';
import { SimulationPreset } from '../../types';
import { api } from '../../services/api';
import { Sparkles, X, Send, Flame, AlertTriangle, Info, Clock, CheckCircle2 } from 'lucide-react';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailInjected: () => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onEmailInjected,
}) => {
  const [presets, setPresets] = useState<SimulationPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('prod_outage');
  const [isCustom, setIsCustom] = useState(false);
  const [customSender, setCustomSender] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getPresets().then(setPresets).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInject = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      if (isCustom) {
        await api.simulateEmail(undefined, {
          sender: customSender || 'colleague@company.io',
          senderName: 'Simulated Sender',
          subject: customSubject || 'Important update',
          bodySnippet: customBody || 'Please review this note.',
          bodyFull: customBody || 'Please review this note.',
        });
      } else {
        await api.simulateEmail(selectedPresetId);
      }

      setSuccessMessage('Email successfully injected into ingestion queue!');
      onEmailInjected();
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#111726] border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl z-10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Email Ingestion Simulator & Test Bench
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Simulate incoming webhooks from Gmail or Outlook to test asynchronous LLM scoring, priority tiering, and task extraction in real-time.
        </p>

        {/* Preset Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Choose Test Scenario Preset
            </label>
            <button
              onClick={() => setIsCustom(!isCustom)}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium"
            >
              {isCustom ? 'Use Presets' : '+ Custom Email'}
            </button>
          </div>

          {!isCustom ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-rose-500 bg-rose-950/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-slate-200">{preset.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[160px]">
                      {preset.sender}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium line-clamp-1">{preset.subject}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{preset.bodySnippet}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Sender Email</label>
                <input
                  type="email"
                  value={customSender}
                  onChange={(e) => setCustomSender(e.target.value)}
                  placeholder="director@partner.com"
                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. Critical budget approval required by 4 PM"
                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Email Body Content</label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Write message with instructions, deadline (e.g. 'by Friday'), or approval requests..."
                  rows={3}
                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {successMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleInject}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-slate-950 flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Ingesting & Analyzing...' : 'Inject & Process Email'}
          </button>
        </div>
      </div>
    </div>
  );
};
