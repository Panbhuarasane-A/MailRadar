import * as cheerio from 'cheerio';
import { prisma } from '../../config/prisma';
import { ingestionQueue } from '../queue/ingestionQueue';

export interface ScrapedTelegramPost {
  channelHandle: string;
  channelTitle?: string;
  messageId: string;
  text: string;
  postUrl: string;
  applyUrl?: string;
  timestamp: Date;
}

export class TelegramScraperService {
  /**
   * Sanitizes various forms of channel links into pure handle
   * (e.g. "https://t.me/s/techjobs" -> "techjobs", "@techjobs" -> "techjobs")
   */
  public cleanChannelHandle(input: string): string {
    if (!input) return '';
    let handle = input.trim();
    // 1. Remove all leading @ or https prefixes even if combined like @https://t.me/
    handle = handle.replace(/^@+/, '').trim();
    const tmeMatch = handle.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/(?:s\/)?([a-zA-Z0-9_+]+)/i);
    if (tmeMatch && tmeMatch[1]) {
      return tmeMatch[1].trim();
    }
    handle = handle.replace(/^https?:\/\//i, '');
    handle = handle.replace(/^t\.me\/(s\/)?/i, '');
    handle = handle.replace(/^@+/, '');
    handle = handle.split('/')[0].split('?')[0].trim();
    return handle;
  }

  /**
   * Scrapes recent public messages from Telegram web preview (https://t.me/s/<channel>)
   */
  public async scrapePublicChannel(
    channelInput: string,
    limit: number = 20
  ): Promise<{ channelHandle: string; channelTitle: string; posts: ScrapedTelegramPost[] }> {
    const handle = this.cleanChannelHandle(channelInput);
    if (!handle) {
      throw new Error('Invalid Telegram channel handle or link provided.');
    }

    const previewUrl = `https://t.me/s/${handle}`;
    console.log(`[TelegramScraper] Scraping public Telegram channel: ${previewUrl}`);

    const res = await fetch(previewUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`Telegram returned HTTP ${res.status} when accessing channel @${handle}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const channelTitle =
      $('.tgme_channel_info_header_title').text().trim() ||
      $('.tgme_page_title').text().trim() ||
      `@${handle}`;

    const posts: ScrapedTelegramPost[] = [];

    $('.tgme_widget_message').each((_, el) => {
      const textElem = $(el).find('.tgme_widget_message_text');
      // Convert HTML line breaks and paragraph ends to newlines
      textElem.find('br').replaceWith('\n');
      textElem.find('p, div, li').each((_, elem) => {
        $(elem).append('\n');
      });
      const text = textElem.text().trim();
      const htmlContent = textElem.html() || '';

      if (!text) return; // Skip media-only messages without text

      const dateAttr = $(el).find('time').attr('datetime');
      const date = dateAttr ? new Date(dateAttr) : new Date();

      const postLinkElem = $(el).find('.tgme_widget_message_date');
      const postUrl = postLinkElem.attr('href') || `https://t.me/${handle}`;
      const messageIdMatch = postUrl.match(/\/(\d+)$/);
      const messageId = messageIdMatch ? messageIdMatch[1] : `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Extract direct application URLs from <a> tags or plain text regex
      let applyUrl: string | undefined;
      textElem.find('a').each((_, linkEl) => {
        const href = $(linkEl).attr('href');
        if (href && !href.includes('t.me/') && !applyUrl) {
          applyUrl = href;
        }
      });

      if (!applyUrl) {
        const textUrlMatch = text.match(/https?:\/\/[^\s]+/);
        if (textUrlMatch) applyUrl = textUrlMatch[0];
      }

      posts.push({
        channelHandle: handle,
        channelTitle,
        messageId,
        text,
        postUrl,
        applyUrl,
        timestamp: date,
      });
    });

    // Sort newest first
    posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      channelHandle: handle,
      channelTitle,
      posts: posts.slice(0, limit),
    };
  }

  /**
   * Cleans text, normalizes mathematical/styled telegram unicode, and escapes invalid characters
   */
  private sanitizeText(str: string): string {
    if (!str) return '';

    let text = typeof (str as any).toWellFormed === 'function' ? (str as any).toWellFormed() : str;

    // 1. Convert mathematical styled unicode (Bold, Italic, Sans-serif) to plain ASCII
    text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, (char: string) => {
      const codePoint = char.codePointAt(0);
      if (!codePoint) return '';

      // Math Bold A-Z (0x1D400 - 0x1D419)
      if (codePoint >= 0x1d400 && codePoint <= 0x1d419) return String.fromCharCode(65 + (codePoint - 0x1d400));
      // Math Bold a-z (0x1D41A - 0x1D433)
      if (codePoint >= 0x1d41a && codePoint <= 0x1d433) return String.fromCharCode(97 + (codePoint - 0x1d41a));
      // Math Italic A-Z (0x1D434 - 0x1D44D)
      if (codePoint >= 0x1d434 && codePoint <= 0x1d44d) return String.fromCharCode(65 + (codePoint - 0x1d434));
      // Math Italic a-z (0x1D44E - 0x1D467)
      if (codePoint >= 0x1d44e && codePoint <= 0x1d467) return String.fromCharCode(97 + (codePoint - 0x1d44e));
      // Math Bold Italic A-Z
      if (codePoint >= 0x1d468 && codePoint <= 0x1d481) return String.fromCharCode(65 + (codePoint - 0x1d468));
      // Math Bold Italic a-z
      if (codePoint >= 0x1d482 && codePoint <= 0x1d49b) return String.fromCharCode(97 + (codePoint - 0x1d482));
      // Sans-serif Bold A-Z
      if (codePoint >= 0x1d5d4 && codePoint <= 0x1d5ed) return String.fromCharCode(65 + (codePoint - 0x1d5d4));
      // Sans-serif Bold a-z
      if (codePoint >= 0x1d5ee && codePoint <= 0x1d607) return String.fromCharCode(97 + (codePoint - 0x1d5ee));
      // Bold Digits 0-9 (0x1D7CE - 0x1D7D7)
      if (codePoint >= 0x1d7ce && codePoint <= 0x1d7d7) return String.fromCharCode(48 + (codePoint - 0x1d7ce));
      // Sans-serif Bold Digits 0-9
      if (codePoint >= 0x1d7ec && codePoint <= 0x1d7f5) return String.fromCharCode(48 + (codePoint - 0x1d7ec));
      // Monospace Digits 0-9
      if (codePoint >= 0x1d7f6 && codePoint <= 0x1d7ff) return String.fromCharCode(48 + (codePoint - 0x1d7f6));

      // Keep standard emojis and common symbols, or return clean character
      return char;
    });

    return text
      .replace(/\\/g, ' ') // replace backslashes with space so no hex escape issues occur
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove control chars
      .trim();
  }

  /**
   * Scrapes and synchronizes a Telegram channel into the user's MailRadar inbox
   */
  public async syncChannel(userId: string, channelInput: string, limit: number = 20) {
    const { channelHandle, channelTitle, posts } = await this.scrapePublicChannel(channelInput, limit);
    const cleanTitle = this.sanitizeText(channelTitle) || `@${channelHandle}`;

    const userRecord = await prisma.user.findUnique({ where: { id: userId } });
    const userRecipientEmail = userRecord?.email || 'user@mailradar.ai';

    let newCount = 0;

    for (const post of posts) {
      try {
        const externalId = `tg_web_${channelHandle}_${post.messageId}`;

        // Check if already ingested
        const existing = await prisma.email.findFirst({
          where: { userId, externalId },
        });

        const sanitizedText = this.sanitizeText(post.text);
        const lines = sanitizedText.split('\n').map((l) => l.trim()).filter(Boolean);
        const firstLine = lines[0] || 'Telegram Job Posting';
        const cleanSubject = this.sanitizeText(`[TG @${channelHandle}] ${firstLine.slice(0, 80)}`);
        const bodySnippet = sanitizedText.slice(0, 300);
        const bodyFull = this.sanitizeText(`${sanitizedText}\n\nTelegram Post: ${post.postUrl}\n${post.applyUrl ? `Direct Apply: ${post.applyUrl}` : ''}`);

        if (existing) {
          // Update timestamp and metadata if changed
          await prisma.email.update({
            where: { id: existing.id },
            data: {
              receivedAt: post.timestamp,
              senderName: cleanTitle,
              sender: `@${channelHandle} (Telegram Channel)`,
              subject: cleanSubject,
              bodySnippet,
              bodyFull,
            },
          });
          continue;
        }

        // 1. Create raw email record
        const email = await prisma.email.create({
          data: {
            userId,
            externalId,
            provider: 'telegram',
            sender: `@${channelHandle} (Telegram Channel)`,
            senderName: cleanTitle,
            recipient: userRecipientEmail,
            subject: cleanSubject,
            bodySnippet,
            bodyFull,
            receivedAt: post.timestamp,
            status: 'unread',
            category: 'work',
            intent: 'request',
            urgency: 'high',
            priorityTier: 'important',
            priorityScore: 82.0,
            reasoning: `Telegram hiring alert from ${cleanTitle}. Contains active job details and application link.`,
          },
        });

        // 2. Queue for async priority scoring & task extraction
        ingestionQueue.addJob({
          emailId: email.id,
          userId,
        });

        newCount++;
      } catch (postErr: any) {
        console.error(`[TelegramScraper] Error ingesting post ${post.messageId}:`, postErr.message);
      }
    }

    // Save channel to user's saved channels list in preferences
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = user?.preferences ? JSON.parse(user.preferences) : {};
    let savedChannels: string[] = prefs.savedTelegramChannels || [];

    savedChannels = Array.from(
      new Set([...savedChannels.map((c) => this.cleanChannelHandle(c)), channelHandle])
    ).filter((h) => h && h !== 'https' && h !== 'http');

    prefs.savedTelegramChannels = savedChannels;
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(prefs) },
    });

    return {
      channelHandle,
      channelTitle,
      totalScraped: posts.length,
      newIngested: newCount,
      message: `Successfully parsed ${posts.length} posts from @${channelHandle} (${newCount} new job alerts added to your Radar)!`,
    };
  }

  /**
   * Syncs all saved channels for the user
   */
  public async syncAllSavedChannels(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = user?.preferences ? JSON.parse(user.preferences) : {};
    let channels: string[] = prefs.savedTelegramChannels || [];

    channels = Array.from(new Set(channels.map((c) => this.cleanChannelHandle(c)))).filter(
      (h) => h && h !== 'https' && h !== 'http'
    );

    if (channels.length === 0) {
      channels = ['placementdriveofficial', 'job4fresherss'];
    }

    const results = [];
    for (const ch of channels) {
      try {
        const res = await this.syncChannel(userId, ch, 25);
        results.push(res);
      } catch (err: any) {
        results.push({ channelHandle: ch, error: err.message });
      }
    }

    return results;
  }

  /**
   * Get list of saved Telegram channels
   */
  public async getSavedChannels(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = user?.preferences ? JSON.parse(user.preferences) : {};
    return prefs.savedTelegramChannels || [];
  }

  /**
   * Remove a saved Telegram channel
   */
  public async removeChannel(userId: string, channelHandle: string) {
    const clean = this.cleanChannelHandle(channelHandle);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = user?.preferences ? JSON.parse(user.preferences) : {};
    prefs.savedTelegramChannels = (prefs.savedTelegramChannels || []).filter((c: string) => c !== clean);

    await prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(prefs) },
    });

    return prefs.savedTelegramChannels;
  }
}

export const telegramScraperService = new TelegramScraperService();
