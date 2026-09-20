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
    'myworkday.com',
    'workday.com',
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
    'eightfold.ai',
    'icims.com',
    'oraclecloud.com',
    'successfactors.com',
    'ashbyhq.com',
    'bamboohr.com',
    'jobvite.com',
    'ripplehire.com',
    'phenompeople.com',
    'metacareers.com',
    'careers.google.com',
    'careers.microsoft.com',
    'jobs.apple.com',
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
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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

      // 2. Check meta-refresh tags
      const metaRefresh = $('meta[http-equiv="refresh" i]').attr('content');
      if (metaRefresh) {
        const refreshUrlMatch = metaRefresh.match(/url=['"]?([^'"\s;]+)/i);
        if (refreshUrlMatch && refreshUrlMatch[1]) {
          const targetUrl = refreshUrlMatch[1];
          if (targetUrl.startsWith('http')) {
            console.log(`[LinkBypassService] Meta-refresh redirect found: ${targetUrl}`);
            return this.resolveDirectApplyLink(targetUrl, emailId);
          }
        }
      }

      // 3. Scan all <a> and <button> tags for direct application buttons & links
      $('a, button').each((_, el) => {
        const href = $(el).attr('href') || $(el).attr('data-href') || $(el).attr('data-url') || $(el).attr('onclick');
        const text = $(el).text().trim().toLowerCase();
        const title = ($(el).attr('title') || '').toLowerCase();
        const className = ($(el).attr('class') || '').toLowerCase();
        const id = ($(el).attr('id') || '').toLowerCase();

        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:')
        ) {
          return;
        }

        // If onclick has window.open or location.href
        let actualHref = href;
        if (href.startsWith('javascript:') || href.includes('window.open') || href.includes('location.href')) {
          const scriptUrlMatch = href.match(/(?:window\.open\(|location\.href\s*=\s*)['"](https?:\/\/[^'"]+)['"]/i);
          if (scriptUrlMatch && scriptUrlMatch[1]) {
            actualHref = scriptUrlMatch[1];
          } else {
            return;
          }
        }

        // Ignore social share / telegram / whatsapp channels
        if (
          actualHref.includes('t.me/') ||
          actualHref.includes('telegram.me/') ||
          actualHref.includes('whatsapp.com/') ||
          actualHref.includes('linkedin.com/sharing') ||
          actualHref.includes('twitter.com/') ||
          actualHref.includes('facebook.com/') ||
          actualHref.includes('instagram.com/')
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
          className.includes('apply') ||
          id.includes('apply');

        const matchedAts = this.knownAtsDomains.find((d) => actualHref.includes(d));

        if (matchedAts || isApplyText) {
          try {
            const landingHost = new URL(finalLandingUrl).hostname;
            const linkHost = new URL(actualHref).hostname;

            // Prefer external links or known ATS domains
            if (matchedAts || linkHost !== landingHost) {
              bestDirectLink = actualHref;
              if (matchedAts) targetPlatform = matchedAts;
            } else if (!bestDirectLink && isApplyText) {
              bestDirectLink = actualHref;
            }
          } catch {
            if (!bestDirectLink && isApplyText) {
              bestDirectLink = actualHref;
            }
          }
        }
      });

      // 4. Scan inline scripts for redirects or ATS URLs if not found yet
      if (!bestDirectLink) {
        $('script').each((_, el) => {
          const scriptContent = $(el).html() || '';
          if (scriptContent.includes('window.location') || scriptContent.includes('location.replace')) {
            const match = scriptContent.match(/(?:window\.location(?:\.href)?\s*=\s*|location\.replace\()['"](https?:\/\/[^'"]+)['"]/i);
            if (match && match[1]) {
              const u = match[1];
              const matchedAts = this.knownAtsDomains.find((d) => u.includes(d));
              if (matchedAts || !u.includes(new URL(finalLandingUrl).hostname)) {
                bestDirectLink = u;
                if (matchedAts) targetPlatform = matchedAts;
              }
            }
          }
        });
      }

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
