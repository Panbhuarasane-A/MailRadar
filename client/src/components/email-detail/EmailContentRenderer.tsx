import React from 'react';
import { ExternalLink, Briefcase, MapPin, Globe, Info } from 'lucide-react';
import { parseStructuredEmail, cleanTrackingFromUrl } from '../../utils/cleanEmailContent';

interface EmailContentRendererProps {
  rawContent: string;
}

export const EmailContentRenderer: React.FC<EmailContentRendererProps> = ({ rawContent }) => {
  const structured = parseStructuredEmail(rawContent);

  if (!rawContent || (!structured.introParagraphs.length && !structured.jobItems.length && !structured.bodyParagraphs.length)) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#12141c] border border-slate-200 dark:border-[#1e2230] text-xs text-slate-500 italic">
        No content available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Intro Context Paragraphs */}
      {structured.introParagraphs.length > 0 && (
        <div className="space-y-2">
          {structured.introParagraphs.map((para, idx) => (
            <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* 2. Structured Job / Opportunity Cards */}
      {structured.jobItems.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-orange-400" />
              <span>Matching Open Positions ({structured.jobItems.length})</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Direct Job Listings</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {structured.jobItems.map((job, idx) => {
              const cleanLink = cleanTrackingFromUrl(job.url);

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#151722] border border-slate-200/80 dark:border-[#1e2230] hover:border-blue-400 dark:hover:border-orange-500/50 p-3 rounded-xl shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {job.title}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      {job.location && (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                          <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                          <span>{job.location}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                        <Globe className="w-2.5 h-2.5" />
                        <span>{job.domain}</span>
                      </span>
                    </div>
                  </div>

                  <a
                    href={cleanLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-orange-500/10 hover:bg-blue-600 hover:text-white dark:hover:bg-orange-500 dark:hover:text-white text-blue-700 dark:text-orange-400 border border-blue-200 dark:border-orange-500/30 hover:border-blue-600 dark:hover:border-orange-500 text-xs font-bold inline-flex items-center justify-center gap-1.5 flex-shrink-0 transition-all shadow-xs self-start sm:self-center"
                  >
                    <span>Apply / View</span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. General Body Paragraphs */}
      {structured.bodyParagraphs.length > 0 && (
        <div className="space-y-2 pt-1">
          {structured.bodyParagraphs.map((para, idx) => (
            <p key={idx} className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-sans">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* 4. Footer Disclaimers & Notifications */}
      {structured.footerNotes.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-[#151722]/50 border border-slate-200/60 dark:border-[#1e2230] text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Email Preferences & Notice</span>
          </div>
          {structured.footerNotes.map((note, idx) => (
            <div key={idx} className="leading-normal">
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
