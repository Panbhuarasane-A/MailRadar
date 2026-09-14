import * as cheerio from 'cheerio';
import { prisma } from '../../config/prisma';

export interface ResolvedLinkResult {
  originalUrl: string;
  directApplyUrl: string;
  isBypassed: boolean;
  targetPlatform?: string;
}

export class LinkBypassService {
  private knownAtsDomains = [
    'myworkdayjobs.com',
    'greenhouse.io',
    'lever.co',
    'smartrecruiters.com',
    'taleo.net',
    'darwinbox.in',
    'darwinbox.com',
    'forms.gle',
    'docs.google.com/forms',
    'amazon.jobs',
    'cisco.com',
    'infosys.com',
    'honeywell.com',
    'teradata.com',
    'xpentra.com',
    'bain.com',
    'anz.com',
    'unstop.com',
    'internshala.com',
    'naukri.com',
    'foundit.in',
    'hirist.tech',
    'wellfound.com',
  ];

  public static cleanShortlinkUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    let u = rawUrl.trim().replace(/[),.;]+$/, '');

    const shortlinkMatch = u.match(
      /^(https?:\/\/(?:pdlink\.in|bit\.ly|tinyurl\.com|t\.me|cutt\.ly|rb\.gy)\/)([A-Za-z0-9_-]+)/i
    );
    if (shortlinkMatch) {
      const base = shortlinkMatch[1];
      let hash = shortlinkMatch[2];

      const gluedWords = /(Share.*|Apply.*|Click.*|Join.*|WhatsApp.*|Telegram.*|Note.*|Batch.*|Drive.*|Role.*|Location.*|Salary.*|Job.*)$/i;
      if (hash.length > 5 && gluedWords.test(hash)) {
        hash = hash.replace(gluedWords, '');
      }
      return base + hash;
    }

    return u;
  }

  /**
   * Resolves and directly bypasses 3rd party intermediate job blogs/redirectors
   * to extract the real, hidden direct application portal link (Workday, Greenhouse, etc.)
   */
  public async resolveDirectApplyLink(rawUrl: string, emailId?: string): Promise<ResolvedLinkResult> {
    const url = LinkBypassService.cleanShortlinkUrl(rawUrl);
    if (!url || !url.startsWith('http')) {
      return { originalUrl: rawUrl, directApplyUrl: rawUrl, isBypassed: false };
    }

    try {
      console.log(`[LinkBypassService] Resolving and bypassing link: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      const finalLandingUrl = res.url || url;

      // 1. If the URL already landed directly on an ATS / official career domain:
      for (const d of this.knownAtsDomains) {
        if (finalLandingUrl.includes(d)) {
          console.log(`[LinkBypassService] Direct ATS link confirmed: ${finalLandingUrl}`);
          if (emailId) await this.updateStoredEmailLink(emailId, finalLandingUrl);
          return {
            originalUrl: url,
            directApplyUrl: finalLandingUrl,
            isBypassed: true,
            targetPlatform: d,
          };
        }
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      let bestDirectLink: string | null = null;
      let targetPlatform: string = 'Official Application Portal';

      // 2. Scan all <a> anchor tags for direct application buttons & links
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim().toLowerCase();
        const title = ($(el).attr('title') || '').toLowerCase();
        const className = ($(el).attr('class') || '').toLowerCase();

        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:')
        ) {
          return;
        }

        // Ignore social share / telegram / whatsapp channels
        if (
          href.includes('t.me/') ||
          href.includes('telegram.me/') ||
          href.includes('whatsapp.com/') ||
          href.includes('linkedin.com/sharing') ||
          href.includes('twitter.com/') ||
          href.includes('facebook.com/') ||
          href.includes('instagram.com/')
        ) {
          return;
        }

        const isApplyText =
          text.includes('click here to apply') ||
          text.includes('click here') ||
          text.includes('apply here') ||
          text.includes('apply now') ||
          text.includes('apply link') ||
          text.includes('official apply') ||
          text.includes('direct apply') ||
          text.includes('registration link') ||
          text.includes('register here') ||
          title.includes('apply') ||
          className.includes('apply');

        const matchedAts = this.knownAtsDomains.find((d) => href.includes(d));

        if (matchedAts || isApplyText) {
          try {
            const landingHost = new URL(finalLandingUrl).hostname;
            const linkHost = new URL(href).hostname;

            // Prefer external links or known ATS domains
            if (matchedAts || linkHost !== landingHost) {
              bestDirectLink = href;
              if (matchedAts) targetPlatform = matchedAts;
            } else if (!bestDirectLink && isApplyText) {
              bestDirectLink = href;
            }
          } catch {
            if (!bestDirectLink && isApplyText) {
              bestDirectLink = href;
            }
          }
        }
      });

      if (bestDirectLink) {
        console.log(`[LinkBypassService] Successfully bypassed to direct application URL: ${bestDirectLink}`);
        if (emailId) await this.updateStoredEmailLink(emailId, bestDirectLink);
        return {
          originalUrl: url,
          directApplyUrl: bestDirectLink,
          isBypassed: true,
          targetPlatform,
        };
      }

      // If no nested button was found, return final landing URL
      return {
        originalUrl: url,
        directApplyUrl: finalLandingUrl,
        isBypassed: false,
      };
    } catch (err: any) {
      console.warn(`[LinkBypassService] Error bypassing link ${url}: ${err.message}`);
      return {
        originalUrl: url,
        directApplyUrl: url,
        isBypassed: false,
      };
    }
  }

  private async updateStoredEmailLink(emailId: string, directUrl: string) {
    try {
      const existing = await prisma.email.findUnique({ where: { id: emailId } });
      if (existing && existing.bodyFull && !existing.bodyFull.includes(directUrl)) {
        await prisma.email.update({
          where: { id: emailId },
          data: {
            bodyFull: `${existing.bodyFull}\n\nDirect Apply Link: ${directUrl}`,
          },
        });
      }
    } catch (err) {
      console.error('[LinkBypassService] Error updating email with direct link:', err);
    }
  }
}

export const linkBypassService = new LinkBypassService();
