import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, Lock, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PublicLegalPageProps {
  initialTab?: 'terms' | 'privacy' | 'google-limited-use';
  onBackToApp?: () => void;
}

export const PublicLegalPage: React.FC<PublicLegalPageProps> = ({
  initialTab = 'privacy',
  onBackToApp,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'google-limited-use'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('terms')) return 'terms';
      if (path.includes('privacy')) return 'privacy';
      if (path.includes('google')) return 'google-limited-use';
    }
    return initialTab;
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-black border border-amber-500/40 shadow-lg shadow-amber-500/20 flex-shrink-0">
              <img src="/mailhinge-logo.jpg" alt="Mail Hinge AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">Mail Hinge AI</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 ml-2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Official Compliance
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (onBackToApp) {
                onBackToApp();
              } else {
                window.location.href = '/';
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Mail Hinge AI</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/30 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Data Privacy & Google API Security</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Privacy Policy & Terms of Service
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Mail Hinge AI is committed to transparent, secure, and minimal data handling. Learn how your data is protected, how AI processing operates, and our strict Google Limited Use compliance.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-sm font-semibold">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('google-limited-use')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'google-limited-use'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Google Limited Use Disclosure</span>
          </button>
        </div>

        {/* Dynamic Tab Body */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800/90 shadow-xl space-y-6 text-sm text-slate-300 leading-relaxed">
          {activeTab === 'privacy' && (
            <article className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Privacy Policy</h2>
                <div className="text-xs text-slate-500 font-mono">Last Updated: September 2026</div>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">1. Information We Collect</h3>
                <p>
                  Mail Hinge AI collects information solely to provide email classification, priority scoring, and task management services:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                  <li><strong>Account Information:</strong> Your name, email address, and authentication credentials through Google OAuth.</li>
                  <li><strong>Email Data:</strong> Email headers, sender information, subject lines, body snippets, and message content retrieved via the official Google Gmail API (<code className="text-purple-300">gmail.readonly</code>).</li>
                  <li><strong>Telegram Channel Messages:</strong> Public job alerts ingested from selected Telegram placement channels.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">2. How We Use Your Information</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                  <li>To categorize incoming messages into actionable categories (Careers, Work, Finance, Academic, Security).</li>
                  <li>To extract deadlines, action items, and create interactive Kanban tasks in your Action Center.</li>
                  <li>To bypass intermediate aggregator shortlinks directly to official employer career portals (Workday, Greenhouse, Taleo).</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">3. Absolute Zero-Selling & Data Protection Guarantee</h3>
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-1">Strict Prohibition on Data Commercialization</strong>
                    We do <strong>NOT</strong> sell, rent, or monetize your email data. Your emails are never used to train generalized public AI models, nor are they used for advertising, surveillance, or cross-site tracking.
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">4. Data Retention & Account Deletion</h3>
                <p>
                  You retain complete control over your data. You may disconnect your email account or delete your Mail Hinge AI profile at any time in the Settings view. Upon deletion, your stored tokens, synced emails, and tasks are permanently purged.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">5. Contact Support</h3>
                <p>
                  If you have any questions regarding this Privacy Policy, contact our team at <a href="mailto:panbhuofficial@gmail.com" className="text-purple-400 underline font-mono">panbhuofficial@gmail.com</a>.
                </p>
              </section>
            </article>
          )}

          {activeTab === 'terms' && (
            <article className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Terms of Service</h2>
                <div className="text-xs text-slate-500 font-mono">Effective: September 2026</div>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">1. Acceptance of Terms</h3>
                <p>
                  By creating an account, connecting your Gmail inbox, or utilizing the Mail Hinge AI application, you agree to comply with and be legally bound by these Terms of Service.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">2. AI Summarization & Priority Scores</h3>
                <p>
                  Mail Hinge AI utilizes advanced machine learning algorithms to compute urgency scores, categorize messages, and summarize deadlines. While designed for high accuracy, AI outputs are provided on an &quot;as is&quot; advisory basis. Users are advised to verify critical deadlines directly with the primary email sender or employer portal.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">3. Third-Party Link Redirection</h3>
                <p>
                  When interacting with Telegram job alerts or email application links, Mail Hinge AI provides automated direct-path redirection to external Applicant Tracking Systems (ATS) and career portals. Mail Hinge AI is not responsible for the availability, content, or accuracy of third-party employer websites.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">4. User Account Security</h3>
                <p>
                  You are responsible for safeguarding your login credentials and maintaining control over the email accounts authorized within Mail Hinge AI.
                </p>
              </section>
            </article>
          )}

          {activeTab === 'google-limited-use' && (
            <article className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Google API Services User Data Policy Compliance</h2>
                <div className="text-xs text-slate-500 font-mono">Google Limited Use Disclosure</div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50 text-purple-200">
                Mail Hinge AI&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold text-purple-300 hover:text-white inline-flex items-center gap-1"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-purple-300">Specific Guarantees:</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-400">
                  <li><strong>Zero Advertising:</strong> Google user data obtained via the Gmail API is never used to serve personalized, retargeted, or interest-based advertisements.</li>
                  <li><strong>Human Readability Limits:</strong> No human will read your emails unless: (a) you have provided explicit permission for troubleshooting, (b) it is necessary for security investigations, or (c) required by applicable law.</li>
                  <li><strong>Restricted Scope Justification:</strong> The <code className="text-purple-300">gmail.readonly</code> scope is strictly used to fetch message text and headers for local priority scoring and deadline extraction.</li>
                </ul>
              </section>
            </article>
          )}
        </div>
      </main>
    </div>
  );
};
