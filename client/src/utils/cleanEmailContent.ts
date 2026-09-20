/**
 * Utility for parsing, sanitizing, and orienting email text and HTML into
 * clean, structured, Gmail-grade content.
 */

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';

  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&bull;': '•',
    '&middot;': '·',
    '&pound;': '£',
    '&euro;': '€',
    '&yen;': '¥',
  };

  let decoded = str;

  // Replace named entities
  for (const [entity, replacement] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), replacement);
  }

  // Replace numeric decimal entities (e.g. &#8217;)
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return '';
    }
  });

  // Replace numeric hex entities (e.g. &#x27;)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  return decoded;
}

/**
 * Checks whether content contains valid HTML markup that can be rendered in rich mode
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();

  // If it has basic HTML tags or doctype
  const htmlTagPatterns = [
    /<(?:!doctype|html|head|body|table|tbody|thead|tr|td|th|div|p|span|img|ul|ol|li|section|article|header|footer|style|a\s+href)[^>]*>/i,
    /<\/(?:table|tr|td|th|div|p|span|ul|ol|li|section|article|html|body)>/i,
  ];

  return htmlTagPatterns.some((pattern) => pattern.test(trimmed));
}

export interface StructuredJobItem {
  title: string;
  company?: string;
  location?: string;
  url: string;
  domain: string;
  duration?: string;
  rating?: string;
  badge?: string;
}

export interface StructuredLinkItem {
  label: string;
  url: string;
  domain: string;
  isSecondary?: boolean;
}

export interface StructuredFeatureStep {
  num: string;
  title: string;
  desc: string;
}

export interface StructuredNewsItem {
  title: string;
  content: string;
}

export interface StructuredTestimonial {
  heading: string;
  quote: string;
  author?: string;
  institution?: string;
}

export interface StructuredCtaBanner {
  label: string;
  subtext?: string;
  stats?: string;
  url?: string;
}

export interface StructuredContactCard {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  location?: string;
  website?: string;
}

export interface StructuredOtpCard {
  code: string;
  description?: string;
}

export interface StructuredWelcomeCard {
  title: string;
  body: string;
}

export interface StructuredEventCard {
  title: string;
  schedule?: string;
  description?: string;
}

export interface StructuredSpeakerCard {
  name: string;
  title?: string;
  bio?: string;
}

export interface StructuredBulletList {
  title?: string;
  items: string[];
}

export interface StructuredKeyValueRow {
  key: string;
  value: string;
}

export interface StructuredAccountAlert {
  serviceName?: string;
  userEmail?: string;
  timestamp?: string;
  sharedData?: string[];
  actionUrl?: string;
}

export interface StructuredEmailContent {
  introParagraphs: string[];
  welcomeCard?: StructuredWelcomeCard;
  eventCard?: StructuredEventCard;
  speakerCard?: StructuredSpeakerCard;
  bulletList?: StructuredBulletList;
  otpCard?: StructuredOtpCard;
  contactCard?: StructuredContactCard;
  accountAlert?: StructuredAccountAlert;
  topicTags: string[];
  ctaBanners: StructuredCtaBanner[];
  featureSteps: StructuredFeatureStep[];
  newsItems: StructuredNewsItem[];
  testimonials: StructuredTestimonial[];
  jobItems: StructuredJobItem[];
  linkActions: StructuredLinkItem[];
  bodyParagraphs: string[];
  recipientNotes: string[];
  footerNotes: string[];
  keyValueRows: StructuredKeyValueRow[];
  hasJobs: boolean;
}

/**
 * Extracts clean domain name from URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    const match = url.match(/https?:\/\/(?:www\.)?([^/\s?#]+)/i);
    return match ? match[1] : 'link';
  }
}

/**
 * Cleans tracking params from URL while keeping destination intact
 */
export function cleanTrackingFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const paramsToStrip = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'refid',
      'from',
      'source',
      'eid',
      'locale',
      'tracking_id',
      'trk',
      'trkEmail',
      'lipi',
      'midToken',
      'midSig',
      'sid',
      'ref',
    ];
    paramsToStrip.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Creates a clean, human-readable label for a URL
 */
export function getCleanUrlLabel(url: string, contextPrefix?: string): string {
  const domain = getDomainFromUrl(url);

  if (contextPrefix) {
    const cleanPrefix = contextPrefix.replace(/https?:\/\/\S+/g, '').replace(/[:\-–—\s]+$/, '').trim();
    if (cleanPrefix && cleanPrefix.length > 2 && cleanPrefix.length < 50) {
      return cleanPrefix;
    }
  }

  if (domain.includes('linkedin.com')) {
    if (url.includes('/feed')) return 'Open LinkedIn Feed';
    if (url.includes('/jobs') || url.includes('/job/')) return 'View LinkedIn Job';
    if (url.includes('/in/')) return 'View LinkedIn Profile';
    if (url.includes('/messaging')) return 'Open LinkedIn Messages';
    if (url.includes('/help')) return 'LinkedIn Help Center';
    return 'Open on LinkedIn';
  }

  if (domain.includes('naukri.com') || domain.includes('naukricampus.com')) {
    if (url.includes('/job')) return 'View Job on Naukri';
    if (url.includes('/profile') || url.includes('/update')) return 'Update Naukri Profile';
    return 'Open on Naukri';
  }

  if (domain.includes('internshala.com')) {
    if (url.includes('/chat')) return 'Open Internshala Chat';
    if (url.includes('/application')) return 'View Application Status';
    return 'View on Internshala';
  }

  if (domain.includes('github.com')) {
    if (url.includes('/pull/')) return 'View Pull Request';
    if (url.includes('/issues/')) return 'View Issue';
    return 'View on GitHub';
  }

  if (domain.includes('zoom.us') || domain.includes('meet.google.com') || domain.includes('teams.microsoft.com')) {
    return 'Join Meeting';
  }

  if (domain.includes('docs.google.com') || domain.includes('drive.google.com')) {
    return 'Open Google Document';
  }

  if (domain.includes('notion.so')) {
    return 'Open Notion Page';
  }

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    if (path && path.length > 1 && path.length < 30) {
      return `${domain}${path}`;
    }
  } catch {}

  return `Visit ${domain}`;
}

/**
 * Heals fragmented vertical text cascades into cohesive, well-oriented paragraphs
 */
export function healBrokenText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Remove excessive tabs and trailing line whitespace
  text = text
    .split('\n')
    .map((line) => line.replace(/^\t+/, '').replace(/\s+$/, ''))
    .join('\n');

  // 2. Collapse runs of more than 2 empty lines
  text = text.replace(/\n{3,}/g, '\n\n');

  // 3. Heal sentence fragments broken across single linebreaks
  // e.g. "sign in to \n eightfold.ai \n on September 11" -> "sign in to eightfold.ai on September 11"
  const lines = text.split('\n');
  const healedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    if (!current) {
      healedLines.push('');
      continue;
    }

    // Check if the previous line is incomplete and this line continues it
    const lastIndex = healedLines.length - 1;
    const prev = lastIndex >= 0 ? healedLines[lastIndex] : '';

    const isPrevEndingInConnectingWord =
      prev &&
      /(?:\bto|\bfor|\bwith|\bon|\bat|\bin|\band|\bor|\bby|\bthe|\ba|\ban|\bof|\bfrom|\bbecause|\byou|\bis|\bwas|\bare|\bwere|\bhave|\bhas|\buse|\bused|\bsign in to)$/i.test(
        prev
      );

    const isCurrentStartingWithContinuation =
      prev &&
      /^(?:on\s+[A-Z][a-z]+|at\s+\d+|to\s+|with\s+|for\s+|in\s+|by\s+|from\s+|\.|\,)/i.test(
        current
      );

    const isShortFragment =
      prev &&
      prev.length > 0 &&
      !prev.endsWith('.') &&
      !prev.endsWith(':') &&
      !prev.endsWith('!') &&
      !prev.endsWith('?') &&
      !prev.startsWith('•') &&
      !prev.startsWith('-') &&
      !prev.startsWith('*') &&
      !/^\d+[\.\)]/.test(prev) &&
      current.length > 0 &&
      !current.startsWith('•') &&
      !current.startsWith('-') &&
      !current.startsWith('*') &&
      !/^\d+[\.\)]/.test(current) &&
      (isPrevEndingInConnectingWord || isCurrentStartingWithContinuation || (prev.length < 50 && !/^[A-Z\s]{4,}$/.test(prev)));

    if (isShortFragment) {
      healedLines[lastIndex] = `${prev} ${current}`.replace(/\s{2,}/g, ' ');
    } else {
      healedLines.push(current);
    }
  }

  return healedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Pre-cleans raw HTML and splits glued text lines
 */
export function cleanRawText(rawContent: string): string {
  if (!rawContent) return '';
  let text = rawContent;

  // 1. Remove script, style, comments
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Strip tracking pixels, image URLs, and CDN image assets
  text = text.replace(/\[https?:\/\/[^\]]+?\.(?:png|jpg|jpeg|gif|svg|webp)[^\]]*\]/gi, '');
  text = text.replace(/https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|svg|webp)[^\s]*/gi, '');
  text = text.replace(/\[https?:\/\/d369l941qjmgj3\.cloudfront\.net\/[^\]]+\]/gi, '');
  text = text.replace(/https?:\/\/d369l941qjmgj3\.cloudfront\.net\/\S+/gi, '');

  // 3. Strip raw ESP redirect tracking URLs
  text = text.replace(
    /\[https?:\/\/(?:link\.info\.paperpal\.com|mandrillapp\.com|sendgrid\.net|list-manage\.com|createsend\.com)\/(?:ss\/[a-z]\/|track\/|clk\/)?[^\s\]]+\]/gi,
    ''
  );
  text = text.replace(
    /https?:\/\/(?:link\.info\.paperpal\.com|mandrillapp\.com|sendgrid\.net|list-manage\.com|createsend\.com)\/(?:ss\/[a-z]\/|track\/|clk\/)?[^\s\)\>]+/gi,
    ''
  );

  // 4. Convert block and break tags to appropriate linebreaks
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/(div|tr|li|h[1-6]|table|section|article)>/gi, '\n');
  text = text.replace(/<(p|div|tr|li|h[1-6]|table|section|article)[^>]*>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeHtmlEntities(text);

  // 5. Heal broken fragmented vertical lines
  text = healBrokenText(text);

  // 6. Split glued sentences: e.g. "for what matters.Hi Panbhuarasane," -> "for what matters.\n\nHi Panbhuarasane,"
  text = text.replace(/([.!?])([A-Z][a-z]+(?: [A-Z][a-z]+)?(?:,|\b))/g, '$1\n\n$2');
  text = text.replace(/([.!?])(Hi |Hello |Dear |Hey )/g, '$1\n\n$2');

  return text;
}

/**
 * Parses email content into structured sections and cards, extracting repetitive job lists,
 * contact signatures, keyword pill clouds, news cards, promo banners, event cards, speaker profiles, and isolating footer disclaimers.
 */
export function parseStructuredEmail(rawContent: string): StructuredEmailContent {
  if (!rawContent) {
    return {
      introParagraphs: [],
      ctaBanners: [],
      featureSteps: [],
      newsItems: [],
      testimonials: [],
      topicTags: [],
      jobItems: [],
      linkActions: [],
      bodyParagraphs: [],
      recipientNotes: [],
      footerNotes: [],
      keyValueRows: [],
      hasJobs: false,
    };
  }

  const cleanedText = cleanRawText(rawContent);
  // Split into double-newline logical blocks first
  const rawBlocks = cleanedText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  const sections: StructuredEmailContent = {
    introParagraphs: [],
    ctaBanners: [],
    featureSteps: [],
    newsItems: [],
    testimonials: [],
    topicTags: [],
    jobItems: [],
    linkActions: [],
    bodyParagraphs: [],
    recipientNotes: [],
    footerNotes: [],
    keyValueRows: [],
    hasJobs: false,
  };

  let inFooter = false;
  let contactName = '';
  let contactTitle = '';
  let contactPhone = '';
  let contactEmail = '';
  let contactLocation = '';
  let contactWebsite = '';

  const bulletItems: string[] = [];
  let bulletTitle = '';

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];

    // Check for footer / unsubscribe
    if (
      /^(?:unsubscribe|email preferences|manage your preferences|privacy policy|terms of service|you are receiving this email because|view this email in your browser|this email was sent to)/i.test(
        block
      ) ||
      inFooter
    ) {
      inFooter = true;
      sections.footerNotes.push(block);
      continue;
    }

    // 1. Check for Account / Security Notification (like Google sign-in alert, eightfold.ai)
    if (
      /(?:Keep track of your Google Account|Google Account data|Sign in with Google|received this profile info)/i.test(
        block
      )
    ) {
      if (!sections.accountAlert) {
        sections.accountAlert = {
          serviceName: block.includes('eightfold.ai') ? 'eightfold.ai' : undefined,
          sharedData: [],
        };
      }
      sections.introParagraphs.push(block);
      continue;
    }

    // 2. Check for Key-Value Rows (e.g. "Name and profile picture", "panbhuofficial@gmail.com", "Email address")
    if (
      /^(?:Name and profile picture|Email address|Password|Reference ID|Order Number|Transaction ID|Account ID)[:\s]*/i.test(
        block
      )
    ) {
      sections.keyValueRows.push({
        key: block,
        value: rawBlocks[i + 1] && !rawBlocks[i + 1].includes('\n') ? rawBlocks[++i] : '',
      });
      continue;
    }

    // 3. Check for OTP Verification Code
    const otpMatch =
      block.match(/(?:verification code|OTP|code is|security code)[:\s]*([0-9]{4,8})/i) ||
      block.match(/^[🔑\s]*([0-9]{6})[🔑\s]*$/);
    if (otpMatch) {
      sections.otpCard = {
        code: otpMatch[1],
        description: block,
      };
      continue;
    }

    // 4. Check for Job Recommendation (Naukri / LinkedIn style)
    if (
      /(?:Software Engineer|Research Engineer|Full Stack|Intern|Frontend|Backend|Developer|Product Manager|Data Scientist)/i.test(
        block
      ) &&
      (block.includes('duration') ||
        block.includes('Internship') ||
        block.includes('hiring') ||
        block.includes('match your preferences') ||
        block.includes('Apply with') ||
        block.includes('View job'))
    ) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const title = lines[0] || 'Job Opportunity';
      const company = lines[1] || undefined;
      const location = lines[2] || undefined;
      const urlMatch = block.match(/(https?:\/\/[^\s]+)/);

      sections.jobItems.push({
        title,
        company,
        location,
        url: urlMatch ? urlMatch[1] : 'https://naukri.com',
        domain: urlMatch ? getDomainFromUrl(urlMatch[1]) : 'naukri.com',
        duration: block.includes('duration') ? 'No fixed duration' : undefined,
        badge: block.includes('Internship') ? 'Internship' : 'Full Time',
      });
      continue;
    }

    // 5. Check for Event / Masterclass / Webinar
    if (
      /(?:Live Masterclass|Webinar|Live Session|Workshop|Keynote|Conference|Live Demo)/i.test(block) &&
      block.length < 250
    ) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      sections.eventCard = {
        title: lines[0] || 'Live Session',
        schedule: lines.find((l) => /(?:AM|PM|EST|PST|IST|GMT|UTC|\d{1,2}:\d{2})/i.test(l)) || undefined,
        description: lines.slice(1).join(' '),
      };
      continue;
    }

    // 6. Check for Topic Tags / Keywords
    if (block.includes(',') && block.split(',').length >= 5) {
      const tags = block
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && t.length < 50);
      if (tags.length >= 5) {
        sections.topicTags = tags;
        continue;
      }
    }

    // 7. Check for Action Links
    if (/^(?:📅 Event Calendar|🤝 Full Membership|View all posts|Go to group|Discover inspiring|Update profile|View All Recommendations|Get App)/i.test(block)) {
      const label = block.replace(/(https?:\/\/\S+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/\S*)/g, '').replace(/[:\-–—\s]+$/, '').trim();
      const urlMatch = block.match(/(https?:\/\/\S+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/\S*)/);
      const url = urlMatch ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://${urlMatch[1]}`) : '#';
      sections.linkActions.push({
        label: label || block,
        url,
        domain: getDomainFromUrl(url),
      });
      continue;
    }

    // 8. Check for Contact Signature
    if (/^(?:Text\/WhatsApp|WhatsApp|Phone|Tel|Mobile|Cell)[:\s]*([+\d\s\(\)\-]+)/i.test(block)) {
      contactPhone = block.replace(/^(?:Text\/WhatsApp|WhatsApp|Phone|Tel|Mobile|Cell)[:\s]*/i, '').trim();
      continue;
    }
    if (/^Email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i.test(block)) {
      contactEmail = block.replace(/^Email[:\s]*/i, '').trim();
      continue;
    }
    if (/^(?:www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/i.test(block)) {
      contactWebsite = block;
      continue;
    }

    // 9. Check for Bullet Points
    if (/^(?:•|-|\*|✓|✔)\s+/m.test(block)) {
      const items = block
        .split('\n')
        .map((l) => l.replace(/^(?:•|-|\*|✓|✔)\s+/, '').trim())
        .filter(Boolean);
      bulletItems.push(...items);
      continue;
    }

    // 10. General Clean Body Paragraph
    const cleanParagraph = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\[(https?:\/\/[^\]]+)\]/g, ' $1 ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanParagraph) {
      sections.bodyParagraphs.push(cleanParagraph);
    }
  }

  if (bulletItems.length > 0) {
    sections.bulletList = {
      title: bulletTitle || 'Key Highlights & Information',
      items: bulletItems,
    };
  }

  if (contactName || contactPhone || contactEmail || contactLocation || contactWebsite) {
    sections.contactCard = {
      name: contactName,
      title: contactTitle,
      phone: contactPhone,
      email: contactEmail,
      location: contactLocation,
      website: contactWebsite,
    };
  }

  sections.hasJobs = sections.jobItems.length > 0;
  return sections;
}

/**
 * Cleans raw email/HTML content into clean, readable, formatted plain text
 */
export function formatCleanEmailContent(rawContent: string): string {
  if (!rawContent) return 'No content available.';
  return cleanRawText(rawContent);
}
