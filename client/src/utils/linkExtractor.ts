/**
 * Utility to extract clean, actionable, high-value links from email content (HTML or plain text).
 * Filters out image assets, fonts, stylesheets, tracking beacons, social profile links, and unsubscribe URLs.
 */

export interface ExtractedEmailLink {
  url: string;
  label: string;
  domain: string;
  isPrimaryAction?: boolean;
}

/**
 * Decodes common HTML entities into plain characters
 */
function decodeHtmlEntities(str: string): string {
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
  };
  let decoded = str;
  for (const [entity, replacement] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), replacement);
  }
  return decoded;
}

/**
 * Strips dangerous trailing punctuation, brackets, quotes, and whitespace from raw URLs
 */
export function cleanUrlString(rawUrl: string): string {
  if (!rawUrl) return '';
  let u = decodeHtmlEntities(rawUrl.trim());

  // Remove trailing quotes, punctuation, HTML artifacts and escaped chars
  u = u.replace(/[)\]\},;.]+$/, '');
  u = u.replace(/%27\);?$/i, '');
  u = u.replace(/["'<>]+$/g, '');
  u = u.replace(/\\+$/, '');

  // Clean glued words from Telegram/WhatsApp message formatting (e.g. ".../apply/Join")
  const gluedWords = /(Share.*|Apply.*|Click.*|Join.*|WhatsApp.*|Telegram.*|Note.*|Batch.*|Drive.*|Role.*|Location.*|Salary.*|Job.*|How.*|If.*|For.*)$/i;
  const shortlinkMatch = u.match(/^(https?:\/\/(?:pdlink\.in|bit\.ly|tinyurl\.com|t\.me|cutt\.ly|rb\.gy)\/)([A-Za-z0-9_-]+)/i);
  if (shortlinkMatch) {
    const base = shortlinkMatch[1];
    let hash = shortlinkMatch[2];
    if (hash.length > 5 && gluedWords.test(hash)) {
      hash = hash.replace(gluedWords, '');
    }
    return base + hash;
  }

  return u.trim();
}

/**
 * Checks if a URL is an unwanted non-action link (assets, tracking, unsubscribe, footer links)
 */
export function isIgnoredEmailUrl(url: string): boolean {
  const u = url.toLowerCase();

  // 1. Image assets, media & fonts
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|avif|woff|woff2|ttf|eot|css)(\?.*)?$/i.test(u)) return true;
  if (u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return true;
  if (u.includes('/uploads/images/') || u.includes('/assets/images/') || u.includes('/cdn/images/') || u.includes('/static/images/')) return true;
  if (u.includes('redditstatic.com')) return true;

  // 2. Tracking pixels, web beacons, telemetry
  if (u.includes('tracking') || u.includes('open.php') || u.includes('track.') || u.includes('1x1') || u.includes('spacer.') || u.includes('beacon')) return true;
  if (u.includes('click.redditmail.com') && (u.includes('post_hide_subreddit') || u.includes('notification_off') || u.includes('unsubscribe'))) return true;

  // 3. Social network channel footers (unless primary topic)
  if (u.includes('instagram.com') || u.includes('facebook.com') || u.includes('twitter.com') || u.includes('x.com') || u.includes('youtube.com')) return true;
  if (u.includes('linkedin.com/company/') || u.includes('linkedin.com/school/')) return true;

  // 4. App store download badges
  if (u.includes('play.google.com/store') || u.includes('apps.apple.com')) return true;

  // 5. Unsubscribe, preference centers, support, terms, privacy
  if (u.includes('/unsubscribe') || u.includes('opt-out') || u.includes('mail-preferences') || u.includes('/preferences') || u.includes('/notification_off/')) return true;
  if (u.includes('/privacy') || u.includes('/terms') || u.includes('/support') || u.includes('/help') || u.includes('/legal')) return true;

  // 6. Generic bare homepages without a deep link
  if (/^https?:\/\/(www\.)?unstop\.com\/?(pro\/?|all-opportunities\/?)?$/i.test(u)) return true;
  if (/^https?:\/\/(www\.)?linkedin\.com\/?(feed\/?|inbox\/?)?$/i.test(u)) return true;
  if (/^https?:\/\/(www\.)?google\.com\/?$/i.test(u)) return true;

  return false;
}

/**
 * Generates an intelligent, clean, user-friendly label for a link
 */
function deriveSmartLabel(rawLabel: string, parsed: URL): string {
  let label = (rawLabel || '').replace(/<[^>]+>/g, '').trim();
  label = decodeHtmlEntities(label);

  const lower = label.toLowerCase();
  const isGeneric =
    !label ||
    label.length < 3 ||
    lower === 'click here' ||
    lower === 'link' ||
    lower === 'here' ||
    lower.includes('logo') ||
    lower.includes('icon') ||
    lower === 'this link' ||
    lower === 'view more' ||
    lower === 'explore more' ||
    lower.startsWith('http');

  if (!isGeneric) {
    return label;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  const path = parsed.pathname;

  if (host.includes('unstop.com')) {
    if (path.includes('/competitions/') || path.includes('/o/')) return 'View Opportunity / Challenge';
    if (path.includes('/jobs/') || path.includes('/internships/')) return 'View Job Opportunity';
    if (path.includes('/articles/') || path.includes('/blog/')) return 'Read Article on Unstop';
    return 'Open on Unstop';
  }

  if (host.includes('forms.gle') || host.includes('docs.google.com/forms')) {
    return 'Fill Application Form';
  }

  if (host.includes('meet.google.com')) return 'Join Google Meet';
  if (host.includes('zoom.us')) return 'Join Zoom Meeting';
  if (host.includes('teams.microsoft.com')) return 'Join Teams Meeting';

  if (host.includes('linkedin.com')) {
    if (path.includes('/jobs/')) return 'View Job on LinkedIn';
    if (path.includes('/posts/') || path.includes('/feed/update/')) return 'View Post on LinkedIn';
    return 'Open on LinkedIn';
  }

  if (
    host.includes('greenhouse.io') ||
    host.includes('lever.co') ||
    host.includes('myworkdayjobs.com') ||
    host.includes('smartrecruiters.com') ||
    host.includes('darwinbox.')
  ) {
    return 'Apply via Career Portal';
  }

  if (host.includes('github.com')) {
    return 'View GitHub Repository';
  }

  if (host.includes('haveloc.com')) {
    return 'View Placement Details';
  }

  if (host.includes('t.me') || host.includes('telegram.me')) {
    return 'Join Telegram Channel';
  }

  return `Open ${host}`;
}

/**
 * Extracts clean, validated, actionable links with high priority ordering from email body content
 */
export function extractEmailActionLinks(
  htmlOrText: string | null | undefined,
  maxLinks: number = 4
): ExtractedEmailLink[] {
  if (!htmlOrText) return [];

  // 1. Remove style and script blocks entirely so we never extract CSS / font URLs
  const cleanSource = htmlOrText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const rawLinks: Array<{ url: string; label: string }> = [];

  // 2. Extract HTML anchor tags
  const aTagRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = aTagRegex.exec(cleanSource)) !== null) {
    const rawUrl = match[1];
    const anchorText = match[2];
    rawLinks.push({ url: rawUrl, label: anchorText });
  }

  // 3. Extract plain URLs in case plain text is provided
  const plainUrlRegex = /https?:\/\/[^\s<>"'`\)\{\}\[\]]+/gi;
  while ((match = plainUrlRegex.exec(cleanSource)) !== null) {
    rawLinks.push({ url: match[0], label: '' });
  }

  const results: ExtractedEmailLink[] = [];
  const seenUrls = new Set<string>();

  for (const item of rawLinks) {
    const cleanUrl = cleanUrlString(item.url);
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) continue;

    try {
      const parsed = new URL(cleanUrl);
      const normalizedUrl = parsed.toString();

      if (isIgnoredEmailUrl(normalizedUrl)) continue;
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);

      const label = deriveSmartLabel(item.label, parsed);
      const domain = parsed.hostname.replace(/^www\./, '');

      // Check if primary CTA
      const lowerLabel = label.toLowerCase();
      const isPrimary =
        normalizedUrl.includes('/competitions/') ||
        normalizedUrl.includes('/jobs/') ||
        normalizedUrl.includes('/o/') ||
        normalizedUrl.includes('forms.gle') ||
        normalizedUrl.includes('meet.google.com') ||
        normalizedUrl.includes('zoom.us') ||
        lowerLabel.includes('apply') ||
        lowerLabel.includes('opportunity') ||
        lowerLabel.includes('register') ||
        lowerLabel.includes('attempt') ||
        lowerLabel.includes('challenge');

      results.push({
        url: normalizedUrl,
        label,
        domain,
        isPrimaryAction: isPrimary,
      });
    } catch {
      // Invalid URL skipped
    }
  }

  // Sort primary action links first
  results.sort((a, b) => {
    if (a.isPrimaryAction && !b.isPrimaryAction) return -1;
    if (!a.isPrimaryAction && b.isPrimaryAction) return 1;
    return 0;
  });

  return results.slice(0, maxLinks);
}
