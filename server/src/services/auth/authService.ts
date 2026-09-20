import { Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';

export const DEFAULT_USER_EMAIL = 'panbhuofficial@gmail.com';
export const DEFAULT_ADMIN_EMAIL = 'admin@mailhinge.ai';

export class AuthService {
  /**
   * Hashes a password using SHA-256 with salt for persistent, zero-dependency security
   */
  public hashPassword(password: string, salt: string = 'mailradar_salt_2026'): string {
    return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  }

  /**
   * Resolves the authenticated user from the incoming request (via x-user-email or x-user-id header),
   * falling back to the primary default user if not specified.
   */
  public async getUserFromRequest(req: Request) {
    const headerEmail = (req.headers['x-user-email'] as string | undefined)?.trim();
    const headerId = (req.headers['x-user-id'] as string | undefined)?.trim();

    if (headerEmail && headerEmail.length > 0) {
      return this.getOrCreateUser(headerEmail);
    }

    if (headerId && headerId.length > 0) {
      const user = await prisma.user.findUnique({ where: { id: headerId } });
      if (user) return user;
    }

    return this.getOrCreateDefaultUser();
  }

  /**
   * Ensures the default primary user exists
   */
  public async getOrCreateDefaultUser() {
    return this.getOrCreateUser(DEFAULT_USER_EMAIL, 'Panbhuarasane');
  }

  /**
   * Ensures the default system admin user exists
   */
  public async getOrCreateAdminUser() {
    return this.getOrCreateUser(DEFAULT_ADMIN_EMAIL, 'System Administrator', undefined, 'admin');
  }

  /**
   * Gets or provisions a user by email, initializing their isolated preferences
   */
  public async getOrCreateUser(email: string, name?: string, password?: string, explicitRole?: string) {
    const cleanEmail = email.toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    const role =
      explicitRole ||
      (cleanEmail === DEFAULT_ADMIN_EMAIL || cleanEmail.startsWith('admin@') || cleanEmail.includes('admin') ? 'admin' : 'user');

    if (!user) {
      const displayName =
        name ||
        cleanEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

      const passwordHash = password ? this.hashPassword(password) : undefined;

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: displayName,
          role,
          oauthTokens: passwordHash ? JSON.stringify({ passwordHash }) : null,
          sensitivity: 'balanced',
          preferences: JSON.stringify({
            theme: 'dark',
            dailyBriefTime: '08:30',
            soundAlerts: true,
            savedTelegramChannels: [],
            connectedMailbox: null,
          }),
        },
      });
      console.log(`[AuthService] Provisioned new user: ${user.email} (${user.name}) [Role: ${user.role}]`);
    } else if (explicitRole && user.role !== explicitRole) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: explicitRole },
      });
    }

    return user;
  }

  /**
   * Validates user credentials or registers new user
   */
  public async authenticate(email: string, password?: string, name?: string, role?: string) {
    const cleanEmail = email.toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (user) {
      // If user has a password set and password is provided, verify it
      if (user.oauthTokens && password) {
        try {
          const authData = JSON.parse(user.oauthTokens);
          if (authData.passwordHash) {
            const incomingHash = this.hashPassword(password);
            if (authData.passwordHash !== incomingHash) {
              throw new Error('Invalid password for this account.');
            }
          }
        } catch (e: any) {
          if (e.message.includes('Invalid password')) throw e;
        }
      } else if (password && !user.oauthTokens) {
        // Set password for future logins
        const passwordHash = this.hashPassword(password);
        user = await prisma.user.update({
          where: { id: user.id },
          data: { oauthTokens: JSON.stringify({ passwordHash }) },
        });
      }

      if (name && name !== user.name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name },
        });
      }

      if (role && role !== user.role) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role },
        });
      }
      return user;
    }

    // If new user, create account
    return this.getOrCreateUser(cleanEmail, name, password, role);
  }

  /**
   * Returns all registered user profiles for quick multi-account switching
   */
  public async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sensitivity: true,
        preferences: true,
        createdAt: true,
        _count: {
          select: {
            emails: true,
            tasks: true,
            feedbacks: true,
            senders: true,
          },
        },
      },
    });
  }

  /**
   * Updates user preferences (e.g. theme, channels, connected mailbox, sensitivity)
   */
  public async updateUserPreferences(userId: string, newPreferences: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    let existingPrefs: any = {};
    try {
      if (user.preferences) existingPrefs = JSON.parse(user.preferences);
    } catch {}

    const merged = { ...existingPrefs, ...newPreferences };

    return prisma.user.update({
      where: { id: userId },
      data: {
        preferences: JSON.stringify(merged),
      },
    });
  }

  /**
   * Updates core user profile details (Name, Sensitivity)
   */
  public async updateUserProfile(userId: string, data: { name?: string; sensitivity?: string; password?: string }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.sensitivity) updateData.sensitivity = data.sensitivity;
    if (data.password) {
      updateData.oauthTokens = JSON.stringify({ passwordHash: this.hashPassword(data.password) });
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  /**
   * Generates OAuth connection URL for Gmail
   */
  public getGmailAuthUrl(): string {
    const clientId = process.env.GMAIL_CLIENT_ID || 'mock_gmail_client_id';
    const redirectUri = encodeURIComponent('http://localhost:4000/api/auth/callback/gmail');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }

  /**
   * Generates OAuth connection URL for Outlook / Microsoft Graph
   */
  public getOutlookAuthUrl(): string {
    const clientId = process.env.OUTLOOK_CLIENT_ID || 'mock_outlook_client_id';
    const redirectUri = encodeURIComponent('http://localhost:4000/api/auth/callback/outlook');
    const scope = encodeURIComponent('offline_access Mail.Read User.Read');
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  }
}

export const authService = new AuthService();


