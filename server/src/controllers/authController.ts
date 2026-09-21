import { Request, Response } from 'express';
import { authService } from '../services/auth/authService';
import { prisma } from '../config/prisma';
import { realMailboxService } from '../services/ingestion/realMailboxService';
import { telegramScraperService } from '../services/ingestion/telegramScraperService';
import { googleOAuthService } from '../services/auth/googleOAuthService';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateCSRFToken,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  CSRF_COOKIE_OPTIONS,
} from '../utils/jwt';

export class AuthController {
  /**
   * Helper to issue Signed HttpOnly JWT cookies and CSRF cookie
   */
  public issueAuthCookies(res: Response, user: { id: string; email: string; name?: string | null }) {
    const payload = { userId: user.id, email: user.email, name: user.name || undefined };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const csrfToken = generateCSRFToken();

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('XSRF-TOKEN', csrfToken, CSRF_COOKIE_OPTIONS);

    return { accessToken, csrfToken };
  }

  /**
   * Formats a user object safely for client responses:
   * - Redacts raw tokens
   * - Computes hasGoogleOAuth flag
   * - Ensures preferences.connectedMailbox is initialized if Google OAuth is active
   */
  public async formatSafeUser(user: any) {
    if (!user) return null;
    let hasGoogleOAuth = false;
    if (user.oauthTokens) {
      try {
        const parsed = JSON.parse(user.oauthTokens);
        if (parsed.accessToken || parsed.provider === 'google' || parsed.refreshToken) {
          hasGoogleOAuth = true;
        }
      } catch {}
    }

    let prefs: any = {};
    try {
      if (user.preferences) {
        prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences;
      }
    } catch {}

    if (hasGoogleOAuth && (!prefs.connectedMailbox || !prefs.connectedMailbox.provider)) {
      prefs.connectedMailbox = {
        email: user.email,
        provider: 'google_oauth',
        lastSyncedAt: new Date().toISOString(),
        host: 'gmail.googleapis.com',
        status: 'connected',
      };
      await prisma.user.update({
        where: { id: user.id },
        data: { preferences: JSON.stringify(prefs) },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || (user.email === 'admin@mailhinge.ai' ? 'admin' : 'user'),
      sensitivity: user.sensitivity,
      preferences: JSON.stringify(prefs),
      hasGoogleOAuth,
      createdAt: user.createdAt,
    };
  }

  public async getMe(req: Request, res: Response) {
    try {
      const headerEmail = (req.headers['x-user-email'] as string | undefined)?.trim();
      const cookieToken = req.cookies?.access_token || req.signedCookies?.access_token;
      
      if (!headerEmail && !cookieToken) {
        return res.json({
          success: true,
          data: {
            user: null,
            availableUsers: [],
          },
        });
      }

      const rawUser = await authService.getUserFromRequest(req);
      const user = await this.formatSafeUser(rawUser);
      const isAdmin = user && (user.role === 'admin' || user.email === 'admin@mailhinge.ai' || user.email?.startsWith('admin@'));
      const availableUsers = isAdmin ? await authService.getAllUsers() : [user].filter(Boolean);
      return res.json({
        success: true,
        data: {
          user,
          availableUsers,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.getMe]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      if (!email || !String(email).includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid email is required.' });
      }

      const rawUser = await authService.authenticate(email, password, name);
      const user = await this.formatSafeUser(rawUser);
      const isAdmin = user && (user.role === 'admin' || user.email === 'admin@mailhinge.ai' || user.email?.startsWith('admin@'));
      const availableUsers = isAdmin ? await authService.getAllUsers() : [user].filter(Boolean);

      // Issue HttpOnly JWTs and CSRF token
      this.issueAuthCookies(res, rawUser);

      return res.json({
        success: true,
        message: `Logged in as ${user?.name || user?.email || email}`,
        data: {
          user,
          availableUsers,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.login]', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public async register(req: Request, res: Response) {
    try {
      const { email, name, password, initialChannels, mailboxConfig } = req.body;
      if (!email || !String(email).includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid email is required.' });
      }

      const rawUser = await authService.authenticate(email, password, name);

      // Save initial custom channels or mailbox if provided
      if (Array.isArray(initialChannels) && initialChannels.length > 0) {
        await authService.updateUserPreferences(rawUser.id, { savedTelegramChannels: initialChannels });
      }
      if (mailboxConfig) {
        await authService.updateUserPreferences(rawUser.id, { connectedMailbox: mailboxConfig });
      }

      const user = await this.formatSafeUser(rawUser);
      const isAdmin = user && (user.role === 'admin' || user.email === 'admin@mailhinge.ai' || user.email?.startsWith('admin@'));
      const availableUsers = isAdmin ? await authService.getAllUsers() : [user].filter(Boolean);

      // Issue HttpOnly JWTs and CSRF token
      this.issueAuthCookies(res, rawUser);

      return res.status(201).json({
        success: true,
        message: `Account created for ${user?.name || user?.email || email}`,
        data: {
          user,
          availableUsers,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.register]', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public async getUsers(req: Request, res: Response) {
    try {
      const users = await authService.getAllUsers();
      return res.json({ success: true, data: users });
    } catch (err: any) {
      console.error('[AuthController.getUsers]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async updatePreferences(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { theme, dailyBriefTime, soundAlerts, savedTelegramChannels, connectedMailbox, customCategories } = req.body;

      const updated = await authService.updateUserPreferences(user.id, {
        ...(theme ? { theme } : {}),
        ...(dailyBriefTime ? { dailyBriefTime } : {}),
        ...(soundAlerts !== undefined ? { soundAlerts } : {}),
        ...(savedTelegramChannels ? { savedTelegramChannels } : {}),
        ...(connectedMailbox !== undefined ? { connectedMailbox } : {}),
        ...(customCategories !== undefined ? { customCategories } : {}),
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[AuthController.updatePreferences]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async updateProfile(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { name, sensitivity, password } = req.body;

      const updated = await authService.updateUserProfile(user.id, {
        name,
        sensitivity,
        password,
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[AuthController.updateProfile]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async deleteAccount(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      await prisma.user.delete({ where: { id: user.id } });
      return res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err: any) {
      console.error('[AuthController.deleteAccount]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // --- GOOGLE OAUTH 2.0 METHODS ---

  /**
   * Returns Google OAuth configuration status and consent authorization URL
   */
  public async getGoogleAuthUrl(req: Request, res: Response) {
    try {
      const reqHost = req.get('host') || 'localhost:4000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const serverOrigin = `${protocol}://${reqHost}`;

      let clientOrigin = (req.query.origin as string) || '';
      if (!clientOrigin && req.headers.referer) {
        try {
          clientOrigin = new URL(req.headers.referer).origin;
        } catch {}
      }
      if (!clientOrigin && req.headers.origin) {
        clientOrigin = String(req.headers.origin);
      }
      if (!clientOrigin) {
        clientOrigin = process.env.CLIENT_URL || process.env.FRONTEND_URL || serverOrigin;
      }

      const authInfo = googleOAuthService.getAuthUrl(reqHost, clientOrigin);

      return res.json({
        success: true,
        data: {
          isConfigured: authInfo.isConfigured,
          authUrl: authInfo.url,
          clientId: authInfo.clientId,
          redirectUri: googleOAuthService.getRedirectUri(reqHost),
        },
      });
    } catch (err: any) {
      console.error('[AuthController.getGoogleAuthUrl]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Configures Google OAuth client ID & Secret on the fly
   */
  public async configureGoogleOAuth(req: Request, res: Response) {
    try {
      const { clientId, clientSecret, origin } = req.body;
      if (!clientId || !clientSecret) {
        return res.status(400).json({ success: false, error: 'Both clientId and clientSecret are required.' });
      }

      googleOAuthService.setCredentials(clientId, clientSecret);
      const reqHost = req.get('host') || 'localhost:4000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const serverOrigin = `${protocol}://${reqHost}`;

      let clientOrigin = (origin as string) || '';
      if (!clientOrigin && req.headers.referer) {
        try {
          clientOrigin = new URL(req.headers.referer).origin;
        } catch {}
      }
      if (!clientOrigin) {
        clientOrigin = process.env.CLIENT_URL || process.env.FRONTEND_URL || serverOrigin;
      }

      const authInfo = googleOAuthService.getAuthUrl(reqHost, clientOrigin);

      return res.json({
        success: true,
        message: 'Google OAuth credentials configured successfully!',
        data: {
          isConfigured: authInfo.isConfigured,
          authUrl: authInfo.url,
          clientId: authInfo.clientId,
          redirectUri: googleOAuthService.getRedirectUri(reqHost),
        },
      });
    } catch (err: any) {
      console.error('[AuthController.configureGoogleOAuth]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Handles the redirect callback from Google OAuth 2.0 consent flow
   */
  public async handleGoogleCallback(req: Request, res: Response) {
    const reqHost = req.get('host') || 'localhost:4000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const currentServerOrigin = `${protocol}://${reqHost}`;

    const stateStr = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    let frontendHost = (stateStr.startsWith('http://') || stateStr.startsWith('https://'))
      ? stateStr.replace(/\/+$/, '')
      : (process.env.CLIENT_URL || process.env.FRONTEND_URL || currentServerOrigin);

    try {
      const { code, error } = req.query;

      if (error) {
        console.error('[AuthController.handleGoogleCallback] Google error:', error);
        const errorUrl = `${frontendHost}/?auth_error=${encodeURIComponent(String(error))}`;
        return res.redirect(errorUrl);
      }

      if (!code || typeof code !== 'string') {
        const noCodeUrl = `${frontendHost}/?auth_error=No authorization code provided`;
        return res.redirect(noCodeUrl);
      }

      const tokens = await googleOAuthService.exchangeCodeForTokens(code, reqHost);
      const profile = await googleOAuthService.getUserProfile(tokens.accessToken);
      const user = await googleOAuthService.loginOrRegisterWithGoogle(profile, tokens);

      console.log(`[AuthController.handleGoogleCallback] User logged in via Google OAuth: ${user.email}`);

      // Issue HttpOnly JWTs and CSRF token
      this.issueAuthCookies(res, user);

      // Kick off background Gmail sync
      googleOAuthService.syncGmailInbox(user.id, 25).catch((syncErr) => {
        console.warn(`[AuthController] Initial Google OAuth sync warning for ${user.email}:`, syncErr.message);
      });

      const redirectTarget = `${frontendHost}/?google_auth_success=true&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`;
      const fallbackTarget = `${currentServerOrigin}/?google_auth_success=true&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`;

      const safeRedirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authenticating with Google — Mail Hinge AI</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #0a0d14;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #121622;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 36px 32px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3.5px solid rgba(245, 158, 11, 0.2);
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 {
      margin: 0 0 10px;
      font-size: 19px;
      font-weight: 700;
      color: #ffffff;
    }
    p {
      margin: 0 0 18px;
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
    }
    a.btn {
      display: inline-block;
      margin-top: 8px;
      padding: 10px 20px;
      background: #f59e0b;
      color: #000;
      font-weight: 700;
      font-size: 13px;
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.2s;
    }
    a.btn:hover {
      background: #d97706;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Authentication Successful</h2>
    <p>Signing in as <strong>${escape(user.name || user.email)}</strong> and syncing your emails...</p>
    <p style="font-size: 12px; color: #64748b;">If you are not redirected automatically, click below:</p>
    <a id="redirect-link" href="${redirectTarget}" class="btn">Open Mail Hinge AI</a>
  </div>
  <script>
    const target = ${JSON.stringify(redirectTarget)};
    const fallback = ${JSON.stringify(fallbackTarget)};
    
    // Immediate redirect attempt
    try {
      window.location.replace(target);
    } catch(e) {
      window.location.href = target;
    }

    // Safety fallback in case dev port was closed/unreachable
    if (fallback !== target) {
      setTimeout(function() {
        try {
          window.location.replace(fallback);
        } catch(e) {
          window.location.href = fallback;
        }
      }, 2200);
    }
  </script>
</body>
</html>`;

      res.setHeader('Location', redirectTarget);
      return res.status(302).send(safeRedirectHtml);
    } catch (err: any) {
      console.error('[AuthController.handleGoogleCallback]', err);
      return res.redirect(`${frontendHost}/?auth_error=${encodeURIComponent(err.message || 'Google authentication failed')}`);
    }
  }

  /**
   * Refreshes access token and rotates refresh token using HttpOnly cookie
   */
  public async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.signedCookies?.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token missing. Please sign in again.',
          code: 'REFRESH_TOKEN_MISSING',
        });
      }

      const payload = verifyRefreshToken(refreshToken);
      if (!payload || !payload.userId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token. Please sign in again.',
          code: 'REFRESH_TOKEN_INVALID',
        });
      }

      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found. Please sign in again.',
          code: 'USER_NOT_FOUND',
        });
      }

      // Rotate tokens
      this.issueAuthCookies(res, user);
      const safeUser = await this.formatSafeUser(user);

      return res.json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          user: safeUser,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.refreshToken]', err);
      return res.status(401).json({
        success: false,
        error: 'Failed to refresh token.',
        code: 'REFRESH_FAILED',
      });
    }
  }

  /**
   * Logs out the user and clears all auth cookies
   */
  public async logout(_req: Request, res: Response) {
    try {
      res.clearCookie('access_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/api/auth' });
      res.clearCookie('XSRF-TOKEN', { path: '/' });

      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err: any) {
      console.error('[AuthController.logout]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Returns current CSRF token / issues new one if missing
   */
  public async getCSRFToken(req: Request, res: Response) {
    try {
      let token = req.cookies?.['XSRF-TOKEN'] || res.locals?.csrfToken || (req as any)?.csrfToken;
      if (!token) {
        token = generateCSRFToken();
        res.cookie('XSRF-TOKEN', token, CSRF_COOKIE_OPTIONS);
      }
      return res.json({
        success: true,
        data: {
          csrfToken: token,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.getCSRFToken]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Synchronizes Gmail inbox via Google OAuth access token for the active user
   */
  public async syncGmailOAuth(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const limit = req.body?.limit ? parseInt(req.body.limit, 10) : 25;

      const result = await googleOAuthService.syncGmailInbox(user.id, limit);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[AuthController.syncGmailOAuth]', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Unified sync for the active user: syncs customized email collection & customized telegram channels
   */
  public async syncAllForUser(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const prefs = user.preferences ? JSON.parse(user.preferences) : {};
      
      let mailboxResult: any = null;
      let telegramResults: any[] = [];

      let hasGoogleOAuth = false;
      if (user.oauthTokens) {
        try {
          const parsed = JSON.parse(user.oauthTokens);
          if (parsed.accessToken || parsed.provider === 'google') hasGoogleOAuth = true;
        } catch {}
      }

      // 1. Sync custom mailbox if connected via Google OAuth or IMAP
      if (prefs.connectedMailbox?.provider === 'google_oauth' || hasGoogleOAuth) {
        try {
          mailboxResult = await googleOAuthService.syncGmailInbox(user.id, 25);
        } catch (gErr: any) {
          mailboxResult = { error: gErr.message };
        }
      } else if (prefs.connectedMailbox?.email) {
        try {
          const appPass = req.body?.mailboxPassword || '';
          if (appPass) {
            mailboxResult = await realMailboxService.syncInbox(
              user.id,
              {
                email: prefs.connectedMailbox.email,
                password: appPass,
                host: prefs.connectedMailbox.host,
                port: prefs.connectedMailbox.port,
                provider: prefs.connectedMailbox.provider,
              },
              25
            );
          }
        } catch (mErr: any) {
          mailboxResult = { error: mErr.message };
        }
      }

      // 2. Sync all saved customized Telegram channels for this user
      try {
        telegramResults = await telegramScraperService.syncAllSavedChannels(user.id);
      } catch (tErr: any) {
        console.error('[AuthController.syncAllForUser Telegram error]', tErr);
      }

      const totalEmails = await prisma.email.count({ where: { userId: user.id } });
      const unreadEmails = await prisma.email.count({ where: { userId: user.id, status: 'unread' } });

      return res.json({
        success: true,
        message: `Synced workspace for ${user.name || user.email}`,
        data: {
          syncedAt: new Date().toISOString(),
          mailboxResult,
          telegramResults,
          totalEmails,
          unreadEmails,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.syncAllForUser]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const authController = new AuthController();
