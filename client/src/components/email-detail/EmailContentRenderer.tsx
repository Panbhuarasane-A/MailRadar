import React, { useState, useMemo } from 'react';
import { ExternalLink, Copy, Check, ShieldCheck, Mail, Globe } from 'lucide-react';
import { isHtmlContent, decodeHtmlEntities } from '../../utils/cleanEmailContent';
import { HtmlEmailViewer } from './HtmlEmailViewer';

interface EmailContentRendererProps {
  rawContent: string;
  className?: string;
  forceViewMode?: 'rich' | 'reader';
}

export const EmailContentRenderer: React.FC<EmailContentRendererProps> = ({
  rawContent,
  className = '',
  forceViewMode,
}) => {
  const hasHtml = useMemo(() => isHtmlContent(rawContent), [rawContent]);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // If HTML is present, render authentic HTML email
  if (hasHtml && forceViewMode !== 'reader') {
    return <HtmlEmailViewer htmlContent={rawContent} className={className} />;
  }

  // Smart Plain Text Email Parser (Authentic Gmail Flow)
  const content = useMemo(() => {
    if (!rawContent) return { paragraphs: [], otpCode: null, footerLines: [] };

    let text = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    text = decodeHtmlEntities(text);

    // Detect OTP / 6-digit verification code if present
    const otpMatch =
      text.match(/(?:verification code|OTP|security code|one-time code)[:\s]*([0-9]{4,8})/i) ||
      text.match(/^[🔑\s]*([0-9]{6})[🔑\s]*$/m);
    const otpCode = otpMatch ? otpMatch[1] : null;

    // Split text into logical paragraph blocks
    const rawBlocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

    const paragraphs: { type: 'paragraph' | 'list' | 'divider'; text?: string; items?: string[] }[] = [];
    const footerLines: string[] = [];
    let isInsideFooter = false;

    for (const block of rawBlocks) {
      // Detect footer/disclaimer block
      if (
        /^(?:unsubscribe|email preferences|privacy policy|terms of service|this email was sent to|you are receiving this email|learn why we included this|if you want to stop using)/i.test(
          block
        ) ||
        isInsideFooter
      ) {
        isInsideFooter = true;
        footerLines.push(block);
        continue;
      }

      // Detect bulleted list
      if (/^(?:•|-|\*|✓|\d+[\.\)])\s+/m.test(block)) {
        const items = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        paragraphs.push({ type: 'list', items });
        continue;
      }

      // Detect separator line
      if (/^[-=_]{3,}$/.test(block)) {
        paragraphs.push({ type: 'divider' });
        continue;
      }

      // Standard clean paragraph
      // Clean up single newline breaks inside a sentence while preserving intentional spacing
      const cleanedPara = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s{2,}/g, ' ');

      if (cleanedPara) {
        paragraphs.push({ type: 'paragraph', text: cleanedPara });
      }
    }

    return { paragraphs, otpCode, footerLines };
  }, [rawContent]);

  if (!rawContent || (content.paragraphs.length === 0 && content.footerLines.length === 0)) {
    return (
      <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#121622] border border-slate-200/80 dark:border-slate-800 text-sm text-slate-500 italic text-center">
        No email body content.
      </div>
    );
  }

  const handleCopyOtp = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Converts URLs and Emails into clickable links (matching Gmail web behaviour)
  const renderTextWithLinks = (text: string) => {
    const urlOrEmailRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const parts = text.split(urlOrEmailRegex);

    return parts.map((part, index) => {
      if (part.match(/^https?:\/\//)) {
        let cleanUrl = part.replace(/[.,;:)]+$/, '');
        let displayLabel = cleanUrl;
        try {
          const u = new URL(cleanUrl);
          displayLabel = u.hostname.replace(/^www\./i, '') + (u.pathname.length > 1 ? u.pathname.slice(0, 24) + '…' : '');
        } catch {}

        return (
          <a
            key={index}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 mx-0.5 font-medium break-all"
          >
            <span>{displayLabel}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
          </a>
        );
      }

      if (part.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
        return (
          <a
            key={index}
            href={`mailto:${part}`}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {part}
          </a>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`space-y-4 text-slate-900 dark:text-slate-100 font-sans ${className}`}>
      {/* 1. OTP Verification Code Highlight Card (if present) */}
      {content.otpCode && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 dark:bg-[#18223d] border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                Verification / Security Code
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-300 tracking-widest select-all">
                {content.otpCode}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyOtp(content.otpCode!)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-center"
          >
            {copiedOtp ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 2. Main Email Body Flow (Gmail Authentic Typography) */}
      <div className="space-y-3.5 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200">
        {content.paragraphs.map((para, idx) => {
          if (para.type === 'divider') {
            return <hr key={idx} className="my-4 border-slate-200 dark:border-slate-800" />;
          }

          if (para.type === 'list' && para.items) {
            return (
              <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-slate-400 dark:marker:text-slate-600">
                {para.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderTextWithLinks(item.replace(/^(?:•|-|\*|✓|\d+[\.\)])\s+/, ''))}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p key={idx} className="leading-relaxed">
              {renderTextWithLinks(para.text || '')}
            </p>
          );
        })}
      </div>

      {/* 3. Subtle Footer / Disclaimer Section */}
      {content.footerLines.length > 0 && (
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          {content.footerLines.map((line, idx) => (
            <div key={idx} className="leading-relaxed">
              {renderTextWithLinks(line)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
