/**
 * Utility for parsing and cleaning email text and HTML into beautiful,
 * coherent, uncluttered content.
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

export interface StructuredJobItem {
  title: string;
  location?: string;
  url: string;
  domain: string;
}

export interface StructuredEmailContent {
  introParagraphs: string[];
  jobItems: StructuredJobItem[];
  bodyParagraphs: string[];
  footerNotes: string[];
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
    ];
    paramsToStrip.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Unwraps email hard wraps (lines broken at 70-80 chars) into smooth flowing paragraphs
 */
export function unwrapEmailText(rawText: string): string {
  if (!rawText) return '';

  const rawParagraphs = rawText.split(/\n\s*\n/);

  const cleanParas = rawParagraphs.map((para) => {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return para.trim();

    // If every line is a bullet/list item, preserve lines
    const isList = lines.every((l) => /^([•\-\*]|\d+[\.\)])\s+/.test(l));
    if (isList) {
      return lines.join('\n');
    }

    // Otherwise unwrap lines
    let result = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        result = line;
      } else {
        const endsWithHyphen = result.endsWith('-');
        if (endsWithHyphen && !result.endsWith(' -')) {
          result = result.slice(0, -1) + line;
        } else {
          result += ' ' + line;
        }
      }
    }
    return result;
  });

  return cleanParas.filter(Boolean).join('\n\n');
}

/**
 * Parses email content into structured sections, extracting repetitive job lists,
 * unwrapping broken sentences, and isolating footer disclaimers.
 */
export function parseStructuredEmail(rawContent: string): StructuredEmailContent {
  if (!rawContent) {
    return {
      introParagraphs: [],
      jobItems: [],
      bodyParagraphs: [],
      footerNotes: [],
      hasJobs: false,
    };
  }

  // Pre-clean HTML
  let text = rawContent;
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/(div|tr|li|h[1-6]|table|section|article)>/gi, '\n');
  text = text.replace(/<(p|div|tr|li|h[1-6]|table|section|article)[^>]*>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeHtmlEntities(text);
  text = text.replace(/\r\n/g, '\n');

  const lines = text.split('\n').map((l) => l.trim());

  const introParagraphs: string[] = [];
  const jobItems: StructuredJobItem[] = [];
  const bodyParagraphs: string[] = [];
  const footerNotes: string[] = [];

  let isHeaderArea = true;
  let isFooterArea = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check for footer start
    if (
      /^(You are receiving this email|Manage your Job Alerts|Unsubscribe|Email Preferences|This email was sent to|Privacy Policy|Terms of Service)/i.test(
        line
      )
    ) {
      isFooterArea = true;
    }

    if (isFooterArea) {
      // Clean footer lines (strip long bracketed tracking links)
      const cleanFooterLine = line
        .replace(/\[https?:\/\/[^\]]+\]/g, '')
        .replace(/\(https?:\/\/[^\)]+\)/g, '')
        .trim();
      if (cleanFooterLine) {
        footerNotes.push(cleanFooterLine);
      }
      continue;
    }

    // Check for Job Item Pattern:
    // Line i: Job Title (e.g. "Enabling Areas - DEC - Senior Executive - Bengaluru, IN")
    // Line i+1: [http://...southasiacareers.deloitte.com/job/...]
    const nextLine = lines[i + 1] || '';
    const linkMatch =
      nextLine.match(/\[(https?:\/\/[^\]]+)\]/) ||
      nextLine.match(/\((https?:\/\/[^\)]+)\)/) ||
      nextLine.match(/^(https?:\/\/\S+)/);

    const isJobTitleLike =
      (line.includes(' - ') ||
        line.includes(' | ') ||
        /Developer|Engineer|Consultant|Associate|Manager|Executive|Analyst|Intern|Lead|Specialist|Recruitment|Hiring|Trainee/i.test(
          line
        )) &&
      linkMatch;

    if (isJobTitleLike && linkMatch) {
      isHeaderArea = false;
      const rawUrl = linkMatch[1];
      const domain = getDomainFromUrl(rawUrl);

      // Separate title and location if present
      let title = line;
      let location = '';

      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        if (parts.length > 1) {
          const last = parts[parts.length - 1].trim();
          if (/Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Noida|Chennai|Gurgaon|India|Remote|IN|USA/i.test(last)) {
            location = last;
            title = parts.slice(0, parts.length - 1).join(' - ');
          }
        }
      } else if (title.includes(' | ')) {
        const parts = title.split(' | ');
        if (parts.length > 1) {
          const last = parts[parts.length - 1].trim();
          if (/Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Noida|Chennai|Gurgaon|India|Remote|IN|USA/i.test(last)) {
            location = last;
            title = parts.slice(0, parts.length - 1).join(' | ');
          }
        }
      }

      jobItems.push({
        title: title.trim(),
        location: location.trim() || undefined,
        url: rawUrl,
        domain,
      });

      // Skip the link line
      i++;
      continue;
    }

    // Skip standalone link lines if they were just parsed or noise
    if (/^\[https?:\/\/[^\]]+\]$/.test(line) || /^\(https?:\/\/[^\)]+\)$/.test(line)) {
      continue;
    }

    // Skip simple "Jobs" heading if followed by jobs
    if (/^Jobs$/i.test(line)) {
      continue;
    }

    if (isHeaderArea && (line.toLowerCase().includes('you are receiving') || line.toLowerCase().includes('matched the following'))) {
      const cleanIntro = line
        .replace(/\[https?:\/\/[^\]]+\]/g, '')
        .replace(/\(https?:\/\/[^\)]+\)/g, '')
        .trim();
      if (cleanIntro) introParagraphs.push(cleanIntro);
    } else {
      // General Body Line
      const cleanBody = line
        .replace(/\[(https?:\/\/[^\]]+)\]/g, ' ($1) ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanBody) {
        bodyParagraphs.push(cleanBody);
      }
    }
  }

  return {
    introParagraphs: unwrapEmailText(introParagraphs.join('\n\n')).split('\n\n').filter(Boolean),
    jobItems,
    bodyParagraphs: unwrapEmailText(bodyParagraphs.join('\n\n')).split('\n\n').filter(Boolean),
    footerNotes: unwrapEmailText(footerNotes.join('\n\n')).split('\n\n').filter(Boolean),
    hasJobs: jobItems.length > 0,
  };
}

/**
 * Cleans raw email/HTML content into clean, readable, formatted plain text
 */
export function formatCleanEmailContent(rawContent: string): string {
  if (!rawContent) return 'No content available.';

  let text = rawContent;

  // 1. Remove script, style, and comments
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Convert block and break tags to appropriate linebreaks
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/(div|tr|li|h[1-6]|table|section|article)>/gi, '\n');
  text = text.replace(/<(p|div|tr|li|h[1-6]|table|section|article)[^>]*>/gi, '');

  // 3. Convert links <a href="URL">TEXT</a> to readable TEXT or compact link
  text = text.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, (_, __, href, linkText) => {
    const cleanText = linkText.replace(/<[^>]+>/g, '').trim();
    if (!cleanText || cleanText.toLowerCase() === 'click here' || cleanText.toLowerCase() === href.toLowerCase()) {
      return `[Link: ${getDomainFromUrl(href)}]`;
    }
    return cleanText;
  });

  // 4. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 5. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 6. Clean long bracketed URLs with tracking parameters
  text = text.replace(/\[https?:\/\/([^\]\s?#]+)[^\]]*\]/gi, ' [🔗 $1] ');
  text = text.replace(/\(https?:\/\/([^)\s?#]+)[^)]*\)/gi, ' (🔗 $1) ');

  // 7. Clean template artifacts
  text = text.replace(/\$\{BtnTxt\}\s*<\[\[\$\{BtnLink\}\]\]>/gi, '');
  text = text.replace(/\*\|[A-Z0-9_:]+\|\*/gi, '');

  // 8. Unwrap broken lines into smooth paragraphs
  text = unwrapEmailText(text);

  return text.trim();
}
