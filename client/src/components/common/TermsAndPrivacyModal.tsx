import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'google-limited-use'>('terms');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-white dark:bg-[#151324] border border-slate-200 dark:border-[#2f2747] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#28213f] flex items-center justify-between bg-slate-50/70 dark:bg-[#1c1830] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Legal & Privacy Center</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please review our terms of service, privacy protections, and AI data handling practices.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#251f3d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-[#28213f] bg-slate-50/40 dark:bg-[#171329] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-2.5 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'terms'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-2.5 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('google-limited-use')}
            className={`pb-2.5 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'google-limited-use'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Limited Use Disclosure</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200">
                <p className="font-semibold">
                  By creating an account, connecting your email, or using Mail Hinge AI, you agree to be bound by these Terms & Conditions.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">1. Service Description</h3>
                <p>
                  Mail Hinge AI is an intelligent personal email and career intelligence assistant. It provides automated inbox categorization, action item and deadline extraction, Telegram campus hiring alerts, and daily morning intelligence digests.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">2. User Account & Data Isolation</h3>
                <p>
                  Each registered user maintains a strictly isolated workspace. Mail Hinge AI does not share email records, messages, or OAuth credentials across accounts. You are responsible for maintaining the confidentiality of your account credentials.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">3. Automated Processing & AI Disclaimers</h3>
                <p>
                  Mail Hinge AI utilizes advanced machine learning algorithms and language model APIs to summarize and organize emails. While we strive for high precision, Mail Hinge AI is an assistive tool provided on an "as-is" basis. You remain solely responsible for reviewing critical communications, verifying application deadlines, and taking necessary actions.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">4. Third-Party Job Listings & Links</h3>
                <p>
                  Job postings, recruitment drives, and external application links aggregated through Telegram channels or websites are for informational purposes only. Mail Hinge AI does not guarantee job availability, hiring outcomes, or the continued validity of third-party portals.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">5. Limitation of Liability</h3>
                <p>
                  In no event shall Mail Hinge AI, its developers, or affiliates be liable for indirect, incidental, special, or consequential damages resulting from missed deadlines, service interruptions, or third-party email provider outages.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                <p className="font-semibold">
                  We believe your email is personal and private. We adhere to zero-data-monetization principles.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">1. Information We Collect</h3>
                <p>
                  When you connect your email or sign up, we collect your email address, profile name, and relevant message headers/bodies necessary to generate priority rankings, deadline call-sheets, and action task lists.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">2. How Your Data Is Protected</h3>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>Zero Public Model Training:</strong> Your private email contents are NEVER used to train public foundation AI models.</li>
                  <li><strong>No Data Brokering:</strong> We do not sell, rent, or monetize your personal communications with advertisers or third parties.</li>
                  <li><strong>Encryption in Transit & at Rest:</strong> OAuth tokens and sensitive data are encrypted using industry-standard cryptography.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">3. Right to Erasure & Data Portability</h3>
                <p>
                  You retain full ownership of your data. You may disconnect your mailbox or request permanent deletion of your account and all associated records at any time through the Settings panel.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'google-limited-use' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200">
                <p className="font-semibold">
                  Google API Services User Data Policy Compliance (Limited Use Requirement)
                </p>
              </div>

              <div>
                <p className="mb-2">
                  Mail Hinge AI's use and transfer to any other app of information received from Google APIs adheres to the{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 dark:text-purple-400 font-bold underline inline-flex items-center gap-0.5"
                  >
                    Google API Services User Data Policy <ExternalLink className="w-3 h-3" />
                  </a>
                  , including the Limited Use requirements:
                </p>

                <div className="space-y-2.5 pl-2 border-l-2 border-purple-500/40 mt-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">1. Limited to Providing & Improving User-Facing Features</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      We only use inbox read access to calculate email priority scores, extract tasks, categorize newsletters, and generate your morning brief.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">2. No Advertising or Data Broker Transfers</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Google user data is never transferred to external parties for serving personalized or retargeted advertisements.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">3. Prohibition on Human Reading of Email Data</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Human employees or contractors are strictly forbidden from reading user email content unless you provide explicit consent for resolving a technical support request or for legal compliance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#28213f] bg-slate-50/70 dark:bg-[#171329] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>GDPR, CCPA & Google Limited Use Compliant</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#231e38] border border-slate-200 dark:border-[#382f54] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2d2747] transition-colors"
            >
              Close
            </button>
            {onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition-all"
              >
                I Agree & Accept
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
