import { Request, Response } from 'express';
import { authService } from '../services/auth/authService';
import { telegramService } from '../services/ingestion/telegramService';
import { telegramScraperService } from '../services/ingestion/telegramScraperService';

export class TelegramController {
  /**
   * Scrapes and synchronizes a public Telegram channel link (e.g. t.me/channel or @channel)
   */
  public async syncChannel(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { channelLink, limit } = req.body;

      if (!channelLink || String(channelLink).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Telegram channel link or handle is required.' });
      }

      const syncLimit = limit ? parseInt(limit, 10) : 20;
      const result = await telegramScraperService.syncChannel(user.id, channelLink, syncLimit);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[TelegramController.syncChannel]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Syncs all saved Telegram channels for the user
   */
  public async syncAllSaved(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const results = await telegramScraperService.syncAllSavedChannels(user.id);

      return res.json({
        success: true,
        data: results,
      });
    } catch (err: any) {
      console.error('[TelegramController.syncAllSaved]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Gets list of saved Telegram channels
   */
  public async getSavedChannels(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const channels = await telegramScraperService.getSavedChannels(user.id);

      return res.json({
        success: true,
        data: channels,
      });
    } catch (err: any) {
      console.error('[TelegramController.getSavedChannels]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Removes a saved Telegram channel
   */
  public async removeChannel(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { channelHandle } = req.body;

      const channels = await telegramScraperService.removeChannel(user.id, channelHandle);

      return res.json({
        success: true,
        data: channels,
      });
    } catch (err: any) {
      console.error('[TelegramController.removeChannel]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Ingests a raw job post text manually
   */
  public async ingestJobPost(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { channelName, messageText, postUrl } = req.body;

      if (!messageText || String(messageText).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message text is required' });
      }

      const item = await telegramService.ingestTelegramMessage(user.id, {
        channelName: channelName || '@PlacementAlerts',
        messageText,
        postUrl,
      });

      return res.status(201).json({
        success: true,
        message: 'Telegram job posting successfully ingested and queued for AI intelligence analysis',
        data: item,
      });
    } catch (err: any) {
      console.error('[TelegramController.ingestJobPost]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Webhook handler for Telegram Bot updates
   */
  public async handleWebhook(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const update = req.body;

      await telegramService.handleWebhookUpdate(user.id, update);
      return res.status(200).send('OK');
    } catch (err: any) {
      console.error('[TelegramController.handleWebhook]', err);
      return res.status(200).send('OK');
    }
  }

  public async getConfig(req: Request, res: Response) {
    return res.json({
      success: true,
      data: {
        webhookUrl: 'http://localhost:4000/api/telegram/webhook',
      },
    });
  }

  /**
   * Crawls official application site for exact last date to apply
   */
  public async crawlDeadline(req: Request, res: Response) {
    try {
      const { url, emailId } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'Application URL is required.' });
      }

      const { deadlineCrawlerService } = await import('../services/ingestion/deadlineCrawlerService');
      const result = await deadlineCrawlerService.crawlDeadlineFromUrl(url, emailId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[TelegramController.crawlDeadline]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Directly resolves and bypasses 3rd party intermediate job blogs to extract hidden direct apply link
   */
  public async resolveLink(req: Request, res: Response) {
    try {
      const { url, emailId } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'URL is required.' });
      }

      const { linkBypassService } = await import('../services/ingestion/linkBypassService');
      const result = await linkBypassService.resolveDirectApplyLink(url, emailId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[TelegramController.resolveLink]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Scans and verifies all active job openings, auto-archiving expired/closed links
   */
  public async verifyAllJobs(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { deadlineCrawlerService } = await import('../services/ingestion/deadlineCrawlerService');
      const results = await deadlineCrawlerService.verifyAllActiveJobs(user.id);

      return res.json({
        success: true,
        message: 'All active job links verified against career portals.',
        data: results,
      });
    } catch (err: any) {
      console.error('[TelegramController.verifyAllJobs]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const telegramController = new TelegramController();
