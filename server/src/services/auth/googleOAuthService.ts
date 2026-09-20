import { prisma } from '../../config/prisma';
import { ingestionQueue } from '../queue/ingestionQueue';
import fs from 'fs';
import path from 'path';

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
  scope?: string;
  tokenType?: string;
  idToken?: string;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verifiedEmail?: boolean;
}

export class GoogleOAuthService {
  private runtimeClientId: string | null = null;
  private runtimeClientSecret: string | null = null;

  constructor() {
    this.runtimeClientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || null;
    this.runtimeClientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || null;
  }

  public getClientId(): string | null {
    return this.runtimeClientId || process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || null;
  }

  public getClientSecret(): string | null {
    return this.runtimeClientSecret || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || null;
  }

  public isConfigured(): boolean {
    const cid = this.getClientId();
    const sec = this.getClientSecret();
    return Boolean(cid && sec && cid.length > 5 && !cid.startsWith('mock_'));
  }

  public setCredentials(clientId: string, clientSecret: string) {
    this.runtimeClientId = clientId.trim();
    this.runtimeClientSecret = clientSecret.trim();

    // Persist to .env file if possible
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
      }

      const updateOrAppend = (key: string, val: string) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}="${val}"`);
        } else {
          content += `\n${key}="${val}"`;
        }
      };

      updateOrAppend('GMAIL_CLIENT_ID', clientId.trim());
      updateOrAppend('GMAIL_CLIENT_SECRET', clientSecret.trim());
      fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
      console.log('[GoogleOAuthService] Saved Google OAuth credentials to .env');
    } catch (e: any) {
      console.warn('[GoogleOAuthService] Could not write to .env, kept in memory:', e.message);
    }
  }

  public getRedirectUri(reqHost?: string): string {
    if (process.env.GOOGLE_REDIRECT_URI) {
      return process.env.GOOGLE_REDIRECT_URI;
    }
    const host = reqHost || 'localhost:4000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}/api/auth/google/callback`;
  }

  /**
   * Generates the Google OAuth 2.0 Authorization URL
   */
  public getAuthUrl(reqHost?: string, state?: string): { url: string; isConfigured: boolean; clientId: string | null } {
    const clientId = this.getClientId();
    const isConfig = this.isConfigured();

    if (!clientId || !isConfig) {
      return {
        url: '',
        isConfigured: false,
        clientId: null,
      };
    }

    const redirectUri = this.getRedirectUri(reqHost);
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
    ].join(' ');

    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';

    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `include_granted_scopes=true${stateParam}`;

    return {
      url,
      isConfigured: true,
      clientId,
    };
  }

  /**
   * Exchanges an authorization code from Google for access and refresh tokens
   */
  public async exchangeCodeForTokens(code: string, reqHost?: string): Promise<GoogleTokens> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri(reqHost);

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured on server.');
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data: any = await res.json();
    if (!res.ok || data.error) {
      console.error('[GoogleOAuthService.exchangeCodeForTokens]', data);
      throw new Error(data.error_description || data.error || 'Failed to exchange authorization code with Google');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      scope: data.scope,
      tokenType: data.token_type,
      idToken: data.id_token,
    };
  }

  /**
   * Refreshes an expired Google access token using the stored refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured.');
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data: any = await res.json();
    if (!res.ok || data.error) {
      console.error('[GoogleOAuthService.refreshAccessToken]', data);
      throw new Error(data.error_description || data.error || 'Failed to refresh Google OAuth token');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      scope: data.scope,
      tokenType: data.token_type,
      idToken: data.id_token,
    };
  }

  /**
   * Fetches Google User Profile information with an access token
   */
  public async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data: any = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || 'Failed to retrieve Google user profile.');
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture,
      verifiedEmail: data.verified_email,
    };
  }

  /**
   * Creates or updates a User in the database via Google OAuth profile & tokens
   */
  public async loginOrRegisterWithGoogle(profile: GoogleUserProfile, tokens: GoogleTokens) {
    const cleanEmail = profile.email.toLowerCase().trim();

    let user = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    const oauthTokenPayload = {
      provider: 'google',
      googleId: profile.id,
      picture: profile.picture,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    };

    if (user) {
      // Merge with existing oauthTokens if any
      let existingTokens: any = {};
      try {
        if (user.oauthTokens) existingTokens = JSON.parse(user.oauthTokens);
      } catch {}

      // Preserve refreshToken if not returned in this cycle
      if (!oauthTokenPayload.refreshToken && existingTokens.refreshToken) {
        oauthTokenPayload.refreshToken = existingTokens.refreshToken;
      }

      // Update user record
      let existingPrefs: any = {};
      try {
        if (user.preferences) existingPrefs = JSON.parse(user.preferences);
      } catch {}

      existingPrefs.connectedMailbox = {
        email: cleanEmail,
        provider: 'google_oauth',
        lastSyncedAt: new Date().toISOString(),
        host: 'gmail.googleapis.com',
      };

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.name || user.name,
          oauthTokens: JSON.stringify(oauthTokenPayload),
          preferences: JSON.stringify(existingPrefs),
        },
      });
    } else {
      // Create new user account with Google profile
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: profile.name,
          sensitivity: 'balanced',
          oauthTokens: JSON.stringify(oauthTokenPayload),
          preferences: JSON.stringify({
            theme: 'dark',
            dailyBriefTime: '08:30',
            soundAlerts: true,
            savedTelegramChannels: [],
            connectedMailbox: {
              email: cleanEmail,
              provider: 'google_oauth',
              lastSyncedAt: new Date().toISOString(),
              host: 'gmail.googleapis.com',
            },
          }),
        },
      });
    }

    return user;
  }

  /**
   * Retrieves a valid access token for a user, refreshing it if expired
   */
  public async getValidAccessTokenForUser(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.oauthTokens) {
      throw new Error('User has no Google OAuth connection.');
    }

    const tokenData = JSON.parse(user.oauthTokens);
    if (!tokenData.accessToken) {
      throw new Error('User has no Google access token.');
    }

    // Check if token expires within 2 minutes
    const isExpired = !tokenData.expiresAt || tokenData.expiresAt - Date.now() < 120000;

    if (isExpired && tokenData.refreshToken) {
      console.log(`[GoogleOAuthService] Refreshing expired token for user ${user.email}...`);
      const refreshed = await this.refreshAccessToken(tokenData.refreshToken);
      tokenData.accessToken = refreshed.accessToken;
      tokenData.expiresAt = refreshed.expiresAt;
      if (refreshed.refreshToken) tokenData.refreshToken = refreshed.refreshToken;

      await prisma.user.update({
        where: { id: userId },
        data: { oauthTokens: JSON.stringify(tokenData) },
      });
    }

    return tokenData.accessToken;
  }

  /**
   * Decodes a base64url-encoded string from Gmail API
   */
  private decodeBase64Url(data: string): string {
    if (!data) return '';
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    try {
      return Buffer.from(base64, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  /**
   * Recursively extracts plain text / html body from Gmail message payload parts
   */
  private extractBodyFromPayload(payload: any): { text: string; html: string } {
    let text = '';
    let html = '';

    if (!payload) return { text, html };

    if (payload.body && payload.body.data) {
      const decoded = this.decodeBase64Url(payload.body.data);
      if (payload.mimeType === 'text/html') {
        html = decoded;
      } else {
        text = decoded;
      }
    }

    if (Array.isArray(payload.parts)) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          text = this.decodeBase64Url(part.body.data);
        } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
          html = this.decodeBase64Url(part.body.data);
        } else if (part.parts) {
          const nested = this.extractBodyFromPayload(part);
          if (nested.text) text = nested.text;
          if (nested.html) html = nested.html;
        }
      }
    }

    return { text, html };
  }

  /**
   * Fetches real emails directly from the Gmail REST API for the user via their OAuth token
   */
  public async syncGmailInbox(userId: string, limit: number = 25): Promise<{
    syncedCount: number;
    newCount: number;
    message: string;
  }> {
    const accessToken = await this.getValidAccessTokenForUser(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userEmail = user?.email || 'user@mailhinge.ai';

    // 1. List messages from Gmail Inbox
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${Math.min(50, limit)}&q=in:inbox`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listData: any = await listRes.json();
    if (!listRes.ok || listData.error) {
      throw new Error(listData.error?.message || 'Failed to list messages from Gmail API.');
    }

    const messages = listData.messages || [];
    if (messages.length === 0) {
      return { syncedCount: 0, newCount: 0, message: 'No messages found in Gmail inbox.' };
    }

    let newCount = 0;
    let totalSynced = 0;

    for (const msgRef of messages) {
      try {
        totalSynced++;
        const externalId = `gmail_oauth_${msgRef.id}`;

        // Check if already ingested
        const existing = await prisma.email.findFirst({
          where: { userId, externalId },
        });

        if (existing) continue;

        // Fetch full message
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const msgData: any = await msgRes.json();
        if (!msgRes.ok || !msgData.payload) continue;

        // Extract headers
        const headers: { [key: string]: string } = {};
        for (const h of msgData.payload.headers || []) {
          headers[h.name.toLowerCase()] = h.value;
        }

        const subject = headers['subject'] || '(No Subject)';
        const rawFrom = headers['from'] || 'unknown@domain.com';
        const rawDate = headers['date'] ? new Date(headers['date']) : new Date(parseInt(msgData.internalDate || '0', 10) || Date.now());

        // Parse sender name & email
        let senderEmail = rawFrom;
        let senderName: string | undefined = undefined;
        const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
        if (match) {
          senderName = match[1].replace(/["']/g, '').trim();
          senderEmail = match[2].trim();
        }

        // Extract body
        const { text, html } = this.extractBodyFromPayload(msgData.payload);
        let cleanBody = text;
        if (!cleanBody && html) {
          cleanBody = html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'")
            .trim();
        }

        const snippet = msgData.snippet || cleanBody.slice(0, 300).replace(/\s+/g, ' ').trim() || '(No content)';
        const fullBodyToStore = (html && typeof html === 'string' && html.trim().length > 10) ? html : (cleanBody || snippet);

        // 2. Create raw email record
        const newEmail = await prisma.email.create({
          data: {
            userId,
            externalId,
            provider: 'gmail',
            sender: senderEmail,
            senderName: senderName || null,
            recipient: userEmail,
            subject,
            bodySnippet: snippet,
            bodyFull: fullBodyToStore,
            receivedAt: isNaN(rawDate.getTime()) ? new Date() : rawDate,
            status: 'unread',
            priorityTier: 'normal',
            priorityScore: 50.0,
            reasoning: 'Ingested via Google OAuth 2.0. Queued for AI priority scoring...',
          },
        });

        // 3. Queue for AI priority scoring & task extraction
        ingestionQueue.addJob({
          emailId: newEmail.id,
          userId,
        });

        newCount++;
      } catch (err: any) {
        console.error(`[GoogleOAuthService] Error ingesting message ${msgRef.id}:`, err.message);
      }
    }

    // Update lastSyncedAt in user preferences
    const currentPrefs = user?.preferences ? JSON.parse(user.preferences) : {};
    currentPrefs.connectedMailbox = {
      email: userEmail,
      provider: 'google_oauth',
      lastSyncedAt: new Date().toISOString(),
      host: 'gmail.googleapis.com',
    };

    await prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(currentPrefs) },
    });

    return {
      syncedCount: totalSynced,
      newCount,
      message: `Successfully synchronized ${newCount} new email(s) via Google OAuth!`,
    };
  }
}

export const googleOAuthService = new GoogleOAuthService();
