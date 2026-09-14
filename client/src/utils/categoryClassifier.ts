import { Email, CustomCategory } from '../types';

export type MailCategoryType = string;

/**
 * Standard default categories provided to every user out-of-the-box.
 * Users can customize, edit keywords, add new categories, or delete them.
 */
export const DEFAULT_CUSTOM_CATEGORIES: CustomCategory[] = [
  {
    id: 'careers',
    name: 'Carrier',
    description: 'Recruitment, job applications, employer replies, interviews, and assessments',
    color: 'indigo',
    icon: 'Briefcase',
    keywords: [
      'carrier',
      'careers',
      'career',
      'job',
      'internshala',
      'naukri',
      'unstop',
      'workday',
      'myworkday',
      'greenhouse',
      'lever',
      'smartrecruiters',
      'icims',
      'taleo',
      'successfactors',
      'sapsf',
      'ashby',
      'jobvite',
      'hirevue',
      'hackerrank',
      'codility',
      'mettl',
      'shl',
      'ripplehire',
      'superset',
      'darwinbox',
      'keka',
      'deloitte',
      'ey',
      'ernst & young',
      'pwc',
      'kpmg',
      'mckinsey',
      'bain',
      'bcg',
      'texas instruments',
      'ti',
      'amazon',
      'microsoft',
      'google',
      'accenture',
      'tcs',
      'infosys',
      'wipro',
      'cognizant',
      'capgemini',
      'hcltech',
      'cisco',
      'siemens',
      'honeywell',
      'teradata',
      "l'oréal",
      'loreal',
      'bnp paribas',
      'schneider electric',
      'talent acquisition',
      'campus recruitment',
      'university relations',
      'recruiting team',
      'hiring team',
      'hr team',
      'talent community',
      'job alert',
      'application received',
      'thank you for applying',
      'thank you for your application',
      'applied successfully',
      'application status',
      'shortlisted',
      'interview invitation',
      'interview with',
      'interview schedule',
      'technical interview',
      'hr interview',
      'managerial round',
      'online assessment',
      'coding assessment',
      'technical assessment',
      'hackerrank test',
      'candidate portal',
      'offer letter',
      'letter of intent',
      'pre-placement',
      'off-campus drive',
      'placement drive',
      'junior developer',
      'software engineer',
      'trainee engineer',
      'analyst',
      'hiring',
      'recruitment',
      'career opportunity',
      'job opening',
      'dare2compete',
      'haveloc',
    ],
    senderDomains: ['unstop.com', 'dare2compete.com', 'haveloc.com', 'stjoseph.edu'],
    isDefault: true,
  },
  {
    id: 'otp_security',
    name: 'Password Reset & OTP',
    description: 'One-time passwords, password resets, verification codes & security alerts',
    color: 'amber',
    icon: 'Key',
    keywords: [
      'verification code',
      'one-time password',
      'otp',
      'security code',
      'password reset',
      'reset your password',
      'reset password',
      'login code',
      'passcode',
      '2fa',
      'two-factor',
      'security alert',
      'sign-in attempt',
      'temporary security link',
      'confirm your email',
      'authentication code',
      'verify your account',
      'forgot password',
      'auth code',
      'security verification',
      'account recovery',
      'verify email',
    ],
    senderDomains: [],
    isDefault: true,
  },
];

/**
 * Helper to extract the normalized sender domain from an email sender string.
 * Handles forms like:
 * "noreply@emails.unstop.com" -> "emails.unstop.com"
 * "St Joseph <stjoseph@haveloc.com>" -> "haveloc.com"
 * "user@domain.co.in" -> "domain.co.in"
 */
export function extractSenderDomain(sender: string): string {
  if (!sender) return '';
  const emailMatch =
    sender.match(/<([^>]+)>/) ||
    sender.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const rawEmail = emailMatch ? emailMatch[1] : sender;
  const atIdx = rawEmail.indexOf('@');
  if (atIdx === -1) return '';
  return rawEmail.slice(atIdx + 1).toLowerCase().trim().replace(/[^a-z0-9.-]/gi, '');
}

/**
 * Checks if a sender domain matches a rule domain.
 * Supports exact domain matches and subdomains (e.g. "emails.unstop.com" matches rule "unstop.com").
 */
export function isDomainMatch(senderDomain: string, ruleDomain: string): boolean {
  if (!senderDomain || !ruleDomain) return false;
  const s = senderDomain.toLowerCase().replace(/^@/, '').trim();
  const r = ruleDomain.toLowerCase().replace(/^@/, '').trim();
  if (!s || !r) return false;
  return s === r || s.endsWith('.' + r) || r.endsWith('.' + s);
}

/**
 * Helper to escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Dynamic detector for all job application emails, applicant tracking system (ATS) notifications,
 * employer replies, interview invites, coding assessments, and career openings without requiring
 * manual company domain whitelisting.
 */
export function isJobOrCareerEmail(email: Email): boolean {
  const sender = (email.sender || '').toLowerCase();
  const senderName = (email.senderName || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const body = `${email.bodySnippet || ''} ${email.bodyFull || ''}`.toLowerCase();

  // 1. ATS / Hiring Platform / HR Sender Signatures
  const atsSenderRegex =
    /\b(workday|myworkday|greenhouse|lever\.co|smartrecruiters|icims|taleo|successfactors|sapsf|ashbyhq|jobvite|breezy\.hr|recruitee|hirevue|hackerrank|codility|mettl|shl\.com|ripplehire|superset|darwinbox|keka|naukri|internshala|foundit|unstop|placementdrive)\b/i;
  
  const hrSenderNameRegex =
    /\b(talent\s*acquisition|campus\s*(hiring|recruitment)|university\s*relations|recruiting\s*team|recruiter|hr\s*team|human\s*resources|careers\s*team|talent\s*community|job\s*alert|hiring\s*team|people\s*operations|global\s*talent)\b/i;

  if (atsSenderRegex.test(sender) || hrSenderNameRegex.test(senderName) || hrSenderNameRegex.test(sender)) {
    return true;
  }

  // 2. Application Submission, Confirmation & Receipt Patterns
  const applicationReceiptPatterns = [
    /thank\s*you\s*for\s*(your\s*)?(applying|application|interest)/i,
    /application\s*(received|submitted|confirmation|status|update)/i,
    /we\s*received\s*your\s*application/i,
    /your\s*application\s*for/i,
    /applied\s*successfully/i,
    /talent\s*community/i,
    /candidate\s*(portal|profile|id|reference)/i,
    /job\s*application/i,
    /job\s*alert\s*matched/i,
    /matching\s*open\s*positions/i,
    /career\s*opportunity/i,
    /opportunity\s*at/i,
  ];

  if (applicationReceiptPatterns.some((p) => p.test(subject) || p.test(body.slice(0, 500)))) {
    return true;
  }

  // 3. Interview Invitations, Discussions & Scheduling
  const interviewPatterns = [
    /interview\s*(invitation|scheduled|details|round|discussion|with|confirmation|link|slot)/i,
    /shortlisted\s*for/i,
    /technical\s*round/i,
    /managerial\s*round/i,
    /screening\s*call/i,
    /discussion\s*on\s*your\s*application/i,
    /invitation\s*to\s*interview/i,
  ];

  if (interviewPatterns.some((p) => p.test(subject) || p.test(body.slice(0, 500)))) {
    return true;
  }

  // 4. Online Assessments, Coding Tests & Challenges
  const assessmentPatterns = [
    /online\s*assessment/i,
    /coding\s*(assessment|test|challenge)/i,
    /technical\s*assessment/i,
    /hackerrank\s*(test|assessment)/i,
    /assessment\s*(link|invitation|credentials)/i,
    /take\s*assessment/i,
    /test\s*link\s*for/i,
    /aptitude\s*test/i,
    /cognitive\s*assessment/i,
  ];

  if (assessmentPatterns.some((p) => p.test(subject) || p.test(body.slice(0, 500)))) {
    return true;
  }

  // 5. Job Openings, Placement Drives & Offers
  const jobOpeningPatterns = [
    /\b(recruitment|hiring|internship|campus\s*drive|placement\s*drive|off-campus)\b/i,
    /\boffer\s*letter\b/i,
    /\bletter\s*of\s*intent\b/i,
    /\bpre-placement\b/i,
    /\bjob\s*opportunities\b/i,
    /\b(trainee\s*engineer|software\s*engineer|graduate\s*trainee|associate\s*consultant|analyst)\s*hiring\b/i,
  ];

  if (jobOpeningPatterns.some((p) => p.test(subject))) {
    return true;
  }

  return false;
}

/**
 * Classifies an email using the active user's custom category definitions and dynamic keyword/domain matching.
 * Priority order:
 * 1. Explicit email.category match (Manual override by user)
 * 2. Strict Sender Domain Match across all user categories (Highest Rule Priority)
 * 3. Security & OTP rule -> Maps to 'otp_security'
 * 4. Dynamic Job Application & Employer Reply Detection -> Maps to 'careers' / 'jobs'
 * 5. Custom Category Keyword Rules
 * 6. Promotional / Marketing fallback -> 'others'
 * 7. Safe Fallback
 */
export function classifyMailCategory(
  email: Email,
  customCategories?: CustomCategory[]
): string {
  const categories =
    customCategories && customCategories.length > 0
      ? customCategories
      : DEFAULT_CUSTOM_CATEGORIES;

  // 1. Direct match with email.category (Manual override by user)
  if (email.category) {
    const directMatch = categories.find(
      (c) =>
        c.id.toLowerCase() === email.category.toLowerCase() ||
        c.name.toLowerCase() === email.category.toLowerCase()
    );
    if (directMatch) {
      return directMatch.id;
    }
  }

  const sender = (email.sender || '').toLowerCase();
  const senderDomain = extractSenderDomain(sender);
  const senderName = (email.senderName || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const body = `${email.bodySnippet || ''} ${email.bodyFull || ''}`.toLowerCase();

  // 2. Strict Sender Domain Match across categories that have explicit senderDomains configured (e.g. unstop, haveloc)
  for (const cat of categories) {
    if (cat.senderDomains && cat.senderDomains.length > 0) {
      const hasDomainMatch = cat.senderDomains.some((d) => isDomainMatch(senderDomain, d));
      if (hasDomainMatch) {
        return cat.id;
      }
    }
  }

  // 3. High-priority OTP, 2FA, Password Reset & Security Authentication check
  const headerOtpRegex =
    /\b(otp|2fa|passcode)\b|verification\s*code|one-time\s*password|password\s*reset|reset\s*(your\s*)?password|security\s*alert|sign-in\s*attempt|security\s*code|temporary\s*security\s*link|confirm\s*(your\s*)?email|authentication\s*code|verify\s*your\s*account|forgot\s*password|account\s*recovery|login\s*code|auth\s*code/i;
  const bodyOtpRegex =
    /\b(your\s*one-time\s*password|your\s*verification\s*code|use\s*this\s*code\s*to\s*reset|reset\s*your\s*password\s*by\s*clicking|temporary\s*security\s*code|here\s*is\s*your\s*code|enter\s*the\s*following\s*code|to\s*authenticate,\s*please\s*enter|your\s*login\s*code\s*is|security\s*verification\s*code)\b/i;

  const isSecurityOrOtp =
    headerOtpRegex.test(`${sender} ${senderName} ${subject}`) || bodyOtpRegex.test(body);

  if (isSecurityOrOtp) {
    const otpCat = categories.find(
      (c) =>
        c.id === 'otp_security' ||
        c.id === 'security' ||
        c.id === 'otp' ||
        c.keywords?.some((k) => /^(otp|security|verification|password|reset password)$/i.test(k))
    );
    if (otpCat) return otpCat.id;
  }

  // 4. Dynamic Job Application & Employer Reply Match (Deloitte, EY, Texas Instruments, etc.)
  if (isJobOrCareerEmail(email)) {
    const careersCat = categories.find(
      (c) =>
        c.id === 'careers' ||
        c.id === 'jobs' ||
        c.id === 'work' ||
        c.name.toLowerCase().includes('career') ||
        c.name.toLowerCase().includes('job') ||
        c.name.toLowerCase().includes('placement')
    );
    if (careersCat) {
      return careersCat.id;
    }
  }

  // 5. Evaluate keyword rules for user custom categories
  const openKeywordCategories = categories.filter(
    (c) => c.id !== 'others' && c.id !== 'other' && c.id !== 'otp_security'
  );

  for (const cat of openKeywordCategories) {
    if (!cat.keywords || cat.keywords.length === 0) continue;

    // Match keywords using whole-word boundary regex against subject, senderName, and sender
    const matchSubjectOrSender = cat.keywords.some((kw) => {
      const cleanKw = kw.toLowerCase().trim();
      if (!cleanKw) return false;
      const pattern = new RegExp(`\\b${escapeRegex(cleanKw)}\\b`, 'i');
      return pattern.test(subject) || pattern.test(senderName) || pattern.test(sender);
    });

    if (matchSubjectOrSender) {
      return cat.id;
    }
  }

  // 6. Default Fallback -> General Inbox
  return 'inbox';
}

/**
 * Returns clean styling tokens for any color theme
 */
export function getCategoryTheme(color: string = 'blue') {
  const c = (color || 'blue').toLowerCase().trim();

  switch (c) {
    case 'purple':
    case 'violet':
      return {
        name: 'purple',
        bg: 'bg-purple-50 dark:bg-[#181a26]',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-200 dark:border-[#222636]',
        solidBg: 'bg-purple-600',
        dot: 'bg-purple-500',
        badgeClass: 'bg-purple-50 dark:bg-[#181a26] text-purple-700 dark:text-purple-300 border-purple-200 dark:border-[#222636]',
        cardBorder: 'hover:border-purple-300 dark:hover:border-purple-500/40',
        accentColor: '#9333EA',
      };
    case 'indigo':
      return {
        name: 'indigo',
        bg: 'bg-indigo-50 dark:bg-[#181a26]',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-[#222636]',
        solidBg: 'bg-indigo-600',
        dot: 'bg-indigo-500',
        badgeClass: 'bg-indigo-50 dark:bg-[#181a26] text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-[#222636]',
        cardBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500/40',
        accentColor: '#4F46E5',
      };
    case 'emerald':
    case 'green':
      return {
        name: 'emerald',
        bg: 'bg-emerald-50 dark:bg-[#181a26]',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-[#222636]',
        solidBg: 'bg-emerald-600',
        dot: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 dark:bg-[#181a26] text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-[#222636]',
        cardBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/40',
        accentColor: '#10B981',
      };
    case 'amber':
    case 'yellow':
      return {
        name: 'amber',
        bg: 'bg-amber-50 dark:bg-[#181a26]',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-[#222636]',
        solidBg: 'bg-amber-600',
        dot: 'bg-amber-500',
        badgeClass: 'bg-amber-50 dark:bg-[#181a26] text-amber-700 dark:text-amber-300 border-amber-200 dark:border-[#222636]',
        cardBorder: 'hover:border-amber-300 dark:hover:border-amber-500/40',
        accentColor: '#F59E0B',
      };
    case 'rose':
    case 'red':
      return {
        name: 'rose',
        bg: 'bg-rose-50 dark:bg-[#181a26]',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-[#222636]',
        solidBg: 'bg-rose-600',
        dot: 'bg-rose-500',
        badgeClass: 'bg-rose-50 dark:bg-[#181a26] text-rose-700 dark:text-rose-300 border-rose-200 dark:border-[#222636]',
        cardBorder: 'hover:border-rose-300 dark:hover:border-rose-500/40',
        accentColor: '#F43F5E',
      };
    case 'cyan':
    case 'sky':
      return {
        name: 'cyan',
        bg: 'bg-cyan-50 dark:bg-[#181a26]',
        text: 'text-cyan-700 dark:text-cyan-400',
        border: 'border-cyan-200 dark:border-[#222636]',
        solidBg: 'bg-cyan-600',
        dot: 'bg-cyan-500',
        badgeClass: 'bg-cyan-50 dark:bg-[#181a26] text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-[#222636]',
        cardBorder: 'hover:border-cyan-300 dark:hover:border-cyan-500/40',
        accentColor: '#06B6D4',
      };
    case 'fuchsia':
    case 'pink':
      return {
        name: 'fuchsia',
        bg: 'bg-fuchsia-50 dark:bg-[#181a26]',
        text: 'text-fuchsia-700 dark:text-fuchsia-400',
        border: 'border-fuchsia-200 dark:border-[#222636]',
        solidBg: 'bg-fuchsia-600',
        dot: 'bg-fuchsia-500',
        badgeClass: 'bg-fuchsia-50 dark:bg-[#181a26] text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-[#222636]',
        cardBorder: 'hover:border-fuchsia-300 dark:hover:border-fuchsia-500/40',
        accentColor: '#D946EF',
      };
    case 'lime':
      return {
        name: 'lime',
        bg: 'bg-lime-50 dark:bg-[#181a26]',
        text: 'text-lime-700 dark:text-lime-400',
        border: 'border-lime-200 dark:border-[#222636]',
        solidBg: 'bg-lime-600',
        dot: 'bg-lime-500',
        badgeClass: 'bg-lime-50 dark:bg-[#181a26] text-lime-700 dark:text-lime-300 border-lime-200 dark:border-[#222636]',
        cardBorder: 'hover:border-lime-300 dark:hover:border-lime-500/40',
        accentColor: '#84CC16',
      };
    case 'orange':
      return {
        name: 'orange',
        bg: 'bg-orange-50 dark:bg-[#181a26]',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-200 dark:border-[#222636]',
        solidBg: 'bg-orange-600',
        dot: 'bg-orange-500',
        badgeClass: 'bg-orange-50 dark:bg-[#181a26] text-orange-700 dark:text-orange-300 border-orange-200 dark:border-[#222636]',
        cardBorder: 'hover:border-orange-300 dark:hover:border-orange-500/40',
        accentColor: '#EA580C',
      };
    case 'slate':
    case 'gray':
    default:
      if (c === 'blue') {
        return {
          name: 'blue',
          bg: 'bg-blue-50 dark:bg-[#181a26]',
          text: 'text-blue-700 dark:text-blue-400',
          border: 'border-blue-200 dark:border-[#222636]',
          solidBg: 'bg-blue-600',
          dot: 'bg-blue-500',
          badgeClass: 'bg-blue-50 dark:bg-[#181a26] text-blue-700 dark:text-blue-300 border-blue-200 dark:border-[#222636]',
          cardBorder: 'hover:border-blue-300 dark:hover:border-blue-500/40',
          accentColor: '#2563EB',
        };
      }
      return {
        name: 'slate',
        bg: 'bg-slate-50 dark:bg-[#181a26]',
        text: 'text-slate-700 dark:text-slate-400',
        border: 'border-slate-200 dark:border-[#222636]',
        solidBg: 'bg-slate-600',
        dot: 'bg-slate-500',
        badgeClass: 'bg-slate-50 dark:bg-[#181a26] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#222636]',
        cardBorder: 'hover:border-slate-300 dark:hover:border-slate-500/40',
        accentColor: '#64748B',
      };
  }
}

/**
 * Formats priority tier to user-friendly label (URGENT, IMPORTANT, NORMAL, LOW)
 */
export function getPriorityLabel(tier: string): 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'LOW' {
  if (tier === 'hotspot' || tier === 'urgent' || tier === 'critical') return 'URGENT';
  if (tier === 'important') return 'IMPORTANT';
  if (tier === 'normal' || tier === 'medium') return 'NORMAL';
  return 'LOW';
}

/**
 * Returns clean styling tokens for priority badges in light SaaS theme
 */
export function getPriorityTheme(tier: string) {
  const label = getPriorityLabel(tier);
  switch (label) {
    case 'URGENT':
      return {
        label: 'URGENT',
        bg: 'bg-red-50 dark:bg-red-950/60',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        dot: 'bg-red-500',
        badgeClass: 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        cardBorder: 'hover:border-red-300 dark:hover:border-red-800',
        accentColor: '#EF4444',
      };
    case 'IMPORTANT':
      return {
        label: 'IMPORTANT',
        bg: 'bg-amber-50 dark:bg-amber-950/60',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        cardBorder: 'hover:border-amber-300 dark:hover:border-amber-800',
        accentColor: '#F59E0B',
      };
    case 'NORMAL':
      return {
        label: 'NORMAL',
        bg: 'bg-blue-50 dark:bg-blue-950/60',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
        badgeClass: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        cardBorder: 'hover:border-blue-300 dark:hover:border-blue-800',
        accentColor: '#3B82F6',
      };
    case 'LOW':
    default:
      return {
        label: 'LOW',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        cardBorder: 'hover:border-emerald-300 dark:hover:border-emerald-800',
        accentColor: '#22C55E',
      };
  }
}

