import * as cheerio from 'cheerio';
import { prisma } from '../../config/prisma';
import { LinkBypassService, linkBypassService } from './linkBypassService';

export interface CrawledDeadlineResult {
  deadline: string;
  verified: boolean;
  isClosed?: boolean;
  isExpired?: boolean;
  sourceUrl?: string;
  details?: string;
}

export class DeadlineCrawlerService {
  /**
   * Helper to parse natural date strings like "15 Aug 2026", "August 10", "12/08/2026", etc.
   */
  private parseNaturalDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
      // Clean ordinal suffixes: 1st, 2nd, 3rd, 4th -> 1, 2, 3, 4
      const clean = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return d;
      }
    } catch {}
    return null;
  }

  /**
   * Crawls a job application link or placement link to extract the official deadline,
   * verify portal availability, and automatically detect expired/closed openings.
   */
  public async crawlDeadlineFromUrl(rawUrl: string, emailId?: string): Promise<CrawledDeadlineResult> {
    const cleanUrl = LinkBypassService.cleanShortlinkUrl(rawUrl);
    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      return { deadline: 'Apply ASAP (Active)', verified: false, isClosed: false, isExpired: false };
    }

    try {
      console.log(`[DeadlineCrawler] Resolving direct application portal for: ${cleanUrl}`);

      // 1. First resolve any 3rd party intermediate blog/shortlinks to get the direct employer ATS / portal
      const bypassResult = await linkBypassService.resolveDirectApplyLink(cleanUrl, emailId);
      const targetUrl = bypassResult.directApplyUrl || cleanUrl;

      console.log(`[DeadlineCrawler] Crawling target destination URL: ${targetUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(targetUrl, {
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

      // Check HTTP 404 (Not Found) or 410 (Gone) -> Requisition deleted/taken down
      if (res.status === 404 || res.status === 410) {
        console.log(`[DeadlineCrawler] HTTP ${res.status} returned. Opening is closed/removed.`);
        const closedResult: CrawledDeadlineResult = {
          deadline: 'Applications Closed (Expired)',
          verified: true,
          isClosed: true,
          isExpired: true,
          sourceUrl: targetUrl,
          details: `Application portal returned HTTP ${res.status} (Posting removed).`,
        };
        if (emailId) {
          await this.persistClosedOrExpired(emailId, 'Applications Closed (Expired)');
        }
        return closedResult;
      }

      if (!res.ok) {
        return {
          deadline: 'Apply ASAP (Active on Portal)',
          verified: true,
          isClosed: false,
          isExpired: false,
          sourceUrl: targetUrl,
        };
      }

      const html = await res.text();
      const finalUrl = res.url || targetUrl;
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, noscript, svg, nav, footer').remove();

      // Convert line breaks and table cells to text delimiters
      $('br').replaceWith('\n');
      $('p, div, tr, li, h1, h2, h3, h4, td, th').each((_, el) => {
        $(el).append('\n');
      });

      const bodyText = $('body').text().replace(/\s+/g, ' ');
      const titleText = $('title').text().replace(/\s+/g, ' ');
      const fullInspectionText = `${titleText} ${bodyText}`;

      // =========================================================================
      // 1. CHECK FOR CLOSED / EXPIRED APPLICATION NOTICES (e.g. Cisco, Workday, etc.)
      // =========================================================================
      const isClosedNotice =
        /not\s+(?:currently\s+)?accepting\s+(?:new\s+)?applications/i.test(fullInspectionText) ||
        /no\s+longer\s+accepting\s+applications/i.test(fullInspectionText) ||
        /no\s+longer\s+(?:open|available|active)/i.test(fullInspectionText) ||
        /job\s+(?:posting\s+)?(?:has\s+)?expired/i.test(fullInspectionText) ||
        /position\s+(?:has\s+been\s+|is\s+)?(?:filled|closed)/i.test(fullInspectionText) ||
        /role\s+(?:has\s+been\s+|is\s+)?(?:filled|closed)/i.test(fullInspectionText) ||
        /applications?\s+(?:are\s+|have\s+been\s+)?closed/i.test(fullInspectionText) ||
        /application\s+window\s+(?:is\s+|has\s+)?closed/i.test(fullInspectionText) ||
        /registration\s+(?:is\s+|has\s+)?closed/i.test(fullInspectionText) ||
        /registrations\s+are\s+closed/i.test(fullInspectionText) ||
        /deadline\s+(?:has\s+|is\s+)?passed/i.test(fullInspectionText) ||
        /contest\s+(?:has\s+|is\s+)?ended/i.test(fullInspectionText) ||
        /event\s+(?:has\s+|is\s+)?concluded/i.test(fullInspectionText) ||
        /we\s+are\s+sorry,\s+this\s+(?:job|position|role|opportunity)\s+is\s+no\s+longer/i.test(fullInspectionText) ||
        /thanks\s+for\s+your\s+interest[^.]*not\s+accepting\s+new\s+applications/i.test(fullInspectionText) ||
        /this\s+opportunity\s+is\s+no\s+longer\s+available/i.test(fullInspectionText) ||
        /this\s+job\s+is\s+closed/i.test(fullInspectionText) ||
        /this\s+requisition\s+is\s+closed/i.test(fullInspectionText) ||
        /the\s+link\s+you\s+followed\s+has\s+expired/i.test(fullInspectionText);

      if (isClosedNotice) {
        console.log(`[DeadlineCrawler] Closed/Expired notice detected on ${finalUrl}`);
        const closedResult: CrawledDeadlineResult = {
          deadline: 'Applications Closed (Expired)',
          verified: true,
          isClosed: true,
          isExpired: true,
          sourceUrl: finalUrl,
          details: 'Employer portal confirms applications are no longer accepted for this role.',
        };
        if (emailId) {
          await this.persistClosedOrExpired(emailId, 'Applications Closed (Expired)');
        }
        return closedResult;
      }

      // =========================================================================
      // 2. CHECK FOR EXPLICIT DEADLINE / LAST DATE TO APPLY
      // =========================================================================
      const explicitPatterns = [
        /(?:Deadline to apply|Deadline|Last Date to Apply|Last Date|Application Deadline|Registration Deadline|Registration Ends|Registration Closes|Apply Before|Submission Deadline|Drive Date|Valid Till|Expires on)\s*[:–-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:202[4-7])?(?:\s*,\s*[\d:]+\s*(?:am|pm|AM|PM))?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s*(?:202[4-7])?|[0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|\d+\s*days?\s*left|ASAP|Immediate|Rolling Basis)/i,
        /(?:Applications?\s+(?:close|closes|close on|ending on))\s*[:–-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:202[4-7])?|[0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
      ];

      for (const pat of explicitPatterns) {
        const match = bodyText.match(pat);
        if (match && match[1]) {
          const rawFound = match[1].trim();
          let cleaned = rawFound.replace(/[|•,;]+$/, '').trim();

          if (/ASAP|Immediate/i.test(cleaned)) {
            cleaned = 'Apply ASAP (Active)';
          }

          if (cleaned.length > 2 && cleaned.length < 40) {
            // Check if this date has passed
            const parsedDate = this.parseNaturalDate(cleaned);
            const now = new Date();
            const isDateInPast = parsedDate && parsedDate.getTime() < (now.getTime() - 24 * 60 * 60 * 1000);

            if (isDateInPast) {
              const deadlineLabel = `Deadline Passed (${cleaned})`;
              console.log(`[DeadlineCrawler] Detected passed deadline date: "${cleaned}" from ${finalUrl}`);
              const expiredResult: CrawledDeadlineResult = {
                deadline: deadlineLabel,
                verified: true,
                isClosed: true,
                isExpired: true,
                sourceUrl: finalUrl,
              };
              if (emailId) {
                await this.persistClosedOrExpired(emailId, deadlineLabel);
              }
              return expiredResult;
            }

            console.log(`[DeadlineCrawler] Found verified active deadline: "${cleaned}" from ${finalUrl}`);
            const result: CrawledDeadlineResult = {
              deadline: `${cleaned} (Verified)`,
              verified: true,
              isClosed: false,
              isExpired: false,
              sourceUrl: finalUrl,
            };

            if (emailId) {
              await this.persistCrawledDeadline(emailId, `${cleaned} (Verified)`);
            }

            return result;
          }
        }
      }

      // =========================================================================
      // 3. CHECK META TAGS FOR EXPIRATION DATES (Greenhouse, Lever, Workday)
      // =========================================================================
      const metaExpires =
        $('meta[name="valid_through"]').attr('content') ||
        $('meta[property="job:expires"]').attr('content') ||
        $('meta[name="expires"]').attr('content');

      if (metaExpires) {
        try {
          const d = new Date(metaExpires);
          if (!isNaN(d.getTime())) {
            const isPast = d.getTime() < Date.now();
            const formatted = d.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            if (isPast) {
              const deadlineLabel = `Deadline Passed (${formatted})`;
              const result = {
                deadline: deadlineLabel,
                verified: true,
                isClosed: true,
                isExpired: true,
                sourceUrl: finalUrl,
              };
              if (emailId) {
                await this.persistClosedOrExpired(emailId, deadlineLabel);
              }
              return result;
            }

            const result = {
              deadline: `${formatted} (Verified)`,
              verified: true,
              isClosed: false,
              isExpired: false,
              sourceUrl: finalUrl,
            };
            if (emailId) {
              await this.persistCrawledDeadline(emailId, `${formatted} (Verified)`);
            }
            return result;
          }
        } catch {}
      }

      // =========================================================================
      // 4. CHECK "X DAYS LEFT" BANNER
      // =========================================================================
      const daysLeftMatch = bodyText.match(/(\d+\s+days?\s+left)/i);
      if (daysLeftMatch) {
        const result: CrawledDeadlineResult = {
          deadline: `Closes Soon (${daysLeftMatch[1]})`,
          verified: true,
          isClosed: false,
          isExpired: false,
          sourceUrl: finalUrl,
        };
        if (emailId) {
          await this.persistCrawledDeadline(emailId, `Closes Soon (${daysLeftMatch[1]})`);
        }
        return result;
      }

      // Default confirmed active status on destination portal
      const defaultResult: CrawledDeadlineResult = {
        deadline: 'Apply ASAP (Active on Portal)',
        verified: true,
        isClosed: false,
        isExpired: false,
        sourceUrl: finalUrl,
      };

      if (emailId) {
        await this.persistCrawledDeadline(emailId, 'Apply ASAP (Active on Portal)');
      }

      return defaultResult;
    } catch (err: any) {
      console.warn(`[DeadlineCrawler] Could not crawl link ${cleanUrl}: ${err.message}`);
      return { deadline: 'Apply ASAP (Active)', verified: false, isClosed: false, isExpired: false };
    }
  }

  /**
   * Persists active verified deadline to database
   */
  private async persistCrawledDeadline(emailId: string, deadlineText: string) {
    try {
      await prisma.email.update({
        where: { id: emailId },
        data: {
          snoozeReason: `Crawled deadline: ${deadlineText}`,
        },
      });
    } catch (err) {
      console.error('[DeadlineCrawler] Error saving crawled deadline:', err);
    }
  }

  /**
   * Automatically marks an expired/closed job as completed/archived,
   * reduces its priority score, and removes it from active top suggestions.
   */
  private async persistClosedOrExpired(emailId: string, deadlineText: string) {
    try {
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'archived', // Move to completed
          priorityScore: 5.0, // De-escalate priority
          priorityTier: 'low',
          snoozeReason: `Crawled deadline: ${deadlineText}`,
          reasoning: `[Application Closed • Expired] Employer portal confirms applications are closed. Automatically marked completed and removed from active recommendations.`,
        },
      });
      console.log(`[DeadlineCrawler] Email ${emailId} successfully auto-archived due to closed portal/deadline.`);
    } catch (err) {
      console.error('[DeadlineCrawler] Error updating expired email:', err);
    }
  }

  /**
   * Scan and verify all active jobs in the inbox, auto-archiving any closed or expired openings
   */
  public async verifyAllActiveJobs(userId: string) {
    const activeJobs = await prisma.email.findMany({
      where: {
        userId,
        status: { not: 'archived' },
      },
    });

    const results = [];
    for (const job of activeJobs) {
      const match = (job.bodyFull || job.bodySnippet || '').match(/https?:\/\/[^\s]+/i);
      if (match) {
        const url = match[0];
        const res = await this.crawlDeadlineFromUrl(url, job.id);
        results.push({ id: job.id, subject: job.subject, ...res });
      }
    }
    return results;
  }
}

export const deadlineCrawlerService = new DeadlineCrawlerService();

