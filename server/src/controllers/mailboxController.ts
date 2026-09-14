import { Request, Response } from 'express';
import { authService } from '../services/auth/authService';
import { realMailboxService } from '../services/ingestion/realMailboxService';
import { googleOAuthService } from '../services/auth/googleOAuthService';
import { prisma } from '../config/prisma';

export class MailboxController {
  public async getStatus(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const prefs = user.preferences ? JSON.parse(user.preferences) : {};

      let isOAuthConnected = false;
      if (user.oauthTokens) {
        try {
          const parsed = JSON.parse(user.oauthTokens);
          if (parsed.accessToken || parsed.provider === 'google' || parsed.refreshToken) {
            isOAuthConnected = true;
          }
        } catch {}
      }

      let connectedMailbox = prefs.connectedMailbox || null;
      if (!connectedMailbox && isOAuthConnected) {
        connectedMailbox = {
          email: user.email,
          provider: 'google_oauth',
          host: 'gmail.googleapis.com',
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
        };
      }

      const totalRealEmails = await prisma.email.count({
        where: {
          userId: user.id,
          provider: { not: 'simulated' },
        },
      });

      return res.json({
        success: true,
        data: {
          connected: Boolean(connectedMailbox),
          isOAuthConnected,
          connectedMailbox,
          totalRealEmails,
        },
      });
    } catch (err: any) {
      console.error('[MailboxController.getStatus]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async testConnection(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { email, password, host, port, secure, provider } = req.body;

      // Handle Google OAuth verification without password
      if (provider === 'google_oauth' || (!password && user.oauthTokens)) {
        try {
          const token = await googleOAuthService.getValidAccessTokenForUser(user.id);
          if (token) {
            return res.json({
              success: true,
              message: 'Google OAuth connection is active and verified!',
            });
          }
        } catch (e: any) {
          return res.status(400).json({
            success: false,
            error: 'Google OAuth session expired. Please reconnect via Google OAuth 2.0.',
          });
        }
      }

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and App Password are required.' });
      }

      const result = await realMailboxService.testConnection({
        email,
        password,
        host,
        port: port ? parseInt(port, 10) : undefined,
        secure,
        provider,
      });

      return res.json({
        success: result.success,
        message: result.message,
      });
    } catch (err: any) {
      console.error('[MailboxController.testConnection]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async syncRealMailbox(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { email, password, host, port, secure, provider, limit } = req.body;
      const syncLimit = limit ? parseInt(limit, 10) : 25;

      let isOAuthConnected = false;
      if (user.oauthTokens) {
        try {
          const parsed = JSON.parse(user.oauthTokens);
          if (parsed.accessToken || parsed.provider === 'google' || parsed.refreshToken) {
            isOAuthConnected = true;
          }
        } catch {}
      }

      // If provider is Google OAuth or user has active OAuth tokens and no manual password was given
      if (provider === 'google_oauth' || (isOAuthConnected && !password)) {
        const result = await googleOAuthService.syncGmailInbox(user.id, syncLimit);
        return res.json({
          success: true,
          data: result,
        });
      }

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and App Password are required to sync.' });
      }

      const result = await realMailboxService.syncInbox(
        user.id,
        {
          email,
          password,
          host,
          port: port ? parseInt(port, 10) : undefined,
          secure,
          provider,
        },
        syncLimit
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[MailboxController.syncRealMailbox]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const mailboxController = new MailboxController();
