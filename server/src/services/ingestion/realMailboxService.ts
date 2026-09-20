import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '../../config/prisma';
import { ingestionQueue } from '../queue/ingestionQueue';

export interface MailboxConnectionConfig {
  email: string;
  password: string; // App password
  host?: string;
  port?: number;
  secure?: boolean;
  provider?: 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'custom';
}

export class RealMailboxService {
  /**
   * Resolves default IMAP server settings based on email domain or provider
   */
  private resolveImapSettings(config: MailboxConnectionConfig) {
    const domain = config.email.split('@')[1]?.toLowerCase() || '';

    if (config.provider === 'gmail' || domain.includes('gmail.com') || domain.includes('googlemail.com')) {
      return { host: 'imap.gmail.com', port: 993, secure: true };
    }
    if (config.provider === 'outlook' || domain.includes('outlook.com') || domain.includes('hotmail.com') || domain.includes('live.com') || domain.includes('office365.com')) {
      return { host: 'outlook.office365.com', port: 993, secure: true };
    }
    if (config.provider === 'yahoo' || domain.includes('yahoo.com')) {
      return { host: 'imap.mail.yahoo.com', port: 993, secure: true };
    }
    if (config.provider === 'icloud' || domain.includes('icloud.com') || domain.includes('me.com')) {
      return { host: 'imap.mail.me.com', port: 993, secure: true };
    }

    return {
      host: config.host || 'imap.gmail.com',
      port: config.port || 993,
      secure: config.secure !== false,
    };
  }

  /**
   * Tests connection to the user's real mailbox
   */
  public async testConnection(config: MailboxConnectionConfig): Promise<{ success: boolean; message: string }> {
    const imapSettings = this.resolveImapSettings(config);
    const cleanedPassword = config.password.replace(/\s+/g, '').trim();

    const client = new ImapFlow({
      host: imapSettings.host,
      port: imapSettings.port,
      secure: imapSettings.secure,
      auth: {
        user: config.email.trim(),
        pass: cleanedPassword,
      },
      logger: false,
    });

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      const status = await client.status('INBOX', { messages: true, unseen: true });
      await client.logout();

      return {
        success: true,
        message: `Successfully connected to ${config.email}! Inbox contains ${status.messages || 0} messages (${status.unseen || 0} unread).`,
      };
    } catch (err: any) {
      console.error('[RealMailboxService.testConnection]', err);
      let errorHint = err.message || 'Connection failed';
      if (
        err.message?.includes('Invalid credentials') ||
        err.message?.includes('AUTHENTICATIONFAILED') ||
        err.authenticationFailed
      ) {
        errorHint = 'Gmail Authentication Failed: Google requires a 16-character App Password (not your regular account password). Please generate one at myaccount.google.com/apppasswords and ensure IMAP is enabled in Gmail Settings.';
      }
      return {
        success: false,
        message: errorHint,
      };
    }
  }

  /**
   * Fetches real recent emails from the mailbox and pushes them into MailHinge's AI pipeline
   */
  public async syncInbox(
    userId: string,
    config: MailboxConnectionConfig,
    limit: number = 20
  ): Promise<{ syncedCount: number; newCount: number; message: string }> {
    const imapSettings = this.resolveImapSettings(config);
    const cleanedPassword = config.password.replace(/\s+/g, '').trim();

    const client = new ImapFlow({
      host: imapSettings.host,
      port: imapSettings.port,
      secure: imapSettings.secure,
      auth: {
        user: config.email.trim(),
        pass: cleanedPassword,
      },
      logger: false,
    });

    let newEmailsCount = 0;
    let totalSynced = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const mailbox = client.mailbox;
        if (!mailbox || !mailbox.exists) {
          return { syncedCount: 0, newCount: 0, message: 'Inbox is empty' };
        }

        const totalMessages = mailbox.exists;
        const fetchStart = Math.max(1, totalMessages - limit + 1);
        const sequenceRange = `${fetchStart}:*`;

        console.log(`[RealMailboxService] Fetching messages in sequence range ${sequenceRange} for ${config.email}...`);

        for await (const msg of client.fetch(sequenceRange, {
          uid: true,
          envelope: true,
          source: true,
          internalDate: true,
        })) {
          totalSynced++;
          const externalId = `imap_${config.email}_${msg.uid || msg.seq}`;

          // Check if email already ingested
          const existing = await prisma.email.findFirst({
            where: { userId, externalId },
          });

          if (existing) {
            continue; // Skip already ingested emails
          }

          // Parse full email body via mailparser
          const parsed: any = msg.source ? await simpleParser(msg.source as any) : null;

          const subject = parsed?.subject || msg.envelope?.subject || '(No Subject)';
          const fromAddress = parsed?.from?.value?.[0]?.address || msg.envelope?.from?.[0]?.address || 'unknown@domain.com';
          const fromName = parsed?.from?.value?.[0]?.name || msg.envelope?.from?.[0]?.name || undefined;
          let bodyText = parsed?.text || '';
          if (!bodyText && parsed?.html) {
            // Convert HTML to clean readable text for AI analysis
            bodyText = parsed.html
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<\/(div|tr|li|h[1-6])>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&rsquo;/g, "'")
              .replace(/&lsquo;/g, "'")
              .replace(/&rdquo;/g, '"')
              .replace(/&ldquo;/g, '"')
              .replace(/&copy;/g, '©')
              .replace(/&#39;/g, "'")
              .replace(/\r\n/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
          } else if (bodyText) {
            // Also clean any leftover HTML or entities in parsed.text
            bodyText = bodyText
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<\/(div|tr|li|h[1-6])>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&rsquo;/g, "'")
              .replace(/&lsquo;/g, "'")
              .replace(/&rdquo;/g, '"')
              .replace(/&ldquo;/g, '"')
              .replace(/&copy;/g, '©')
              .replace(/&#39;/g, "'")
              .replace(/\$\{BtnTxt\}\s*<\[\[\$\{BtnLink\}\]\]>/gi, '')
              .trim();
          }

          const snippet = (bodyText || (parsed?.html ? parsed.html.replace(/<[^>]+>/g, ' ') : '')).slice(0, 300).replace(/\s+/g, ' ').trim();
          const receivedDate = parsed?.date || msg.internalDate || new Date();

          // Preserve authentic rich HTML in bodyFull if available
          const fullBodyToStore = (parsed?.html && typeof parsed.html === 'string' && parsed.html.trim().length > 10)
            ? parsed.html
            : (bodyText || snippet);

          // 1. Persist raw email immediately
          const newEmail = await prisma.email.create({
            data: {
              userId,
              externalId,
              provider: (config.provider as any) || 'gmail',
              sender: fromAddress,
              senderName: fromName || null,
              recipient: config.email,
              subject,
              bodySnippet: snippet || '(Empty content)',
              bodyFull: fullBodyToStore,
              receivedAt: receivedDate,
              status: 'unread',
              priorityTier: 'normal',
              priorityScore: 50.0,
              reasoning: 'Queued for live AI priority scoring...',
            },
          });

          // 2. Add to async AI scoring & task extraction queue
          ingestionQueue.addJob({
            emailId: newEmail.id,
            userId,
          });

          newEmailsCount++;
        }
      } finally {
        lock.release();
      }

      await client.logout();

      // Save connection configuration in user preferences (excluding raw password for security, save encrypted or active flag)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const currentPrefs = user?.preferences ? JSON.parse(user.preferences) : {};
      currentPrefs.connectedMailbox = {
        email: config.email,
        provider: config.provider || 'gmail',
        lastSyncedAt: new Date().toISOString(),
        host: imapSettings.host,
        port: imapSettings.port,
      };

      await prisma.user.update({
        where: { id: userId },
        data: { preferences: JSON.stringify(currentPrefs) },
      });

      return {
        syncedCount: totalSynced,
        newCount: newEmailsCount,
        message: `Successfully synchronized ${newEmailsCount} new real email(s) into MailHinge for ${config.email}!`,
      };
    } catch (err: any) {
      console.error('[RealMailboxService.syncInbox]', err);
      let msg = err.message || 'Failed to sync mailbox';
      if (
        err.message?.includes('Invalid credentials') ||
        err.message?.includes('AUTHENTICATIONFAILED') ||
        err.message?.includes('Command failed') ||
        err.authenticationFailed
      ) {
        msg = 'Gmail Authentication Failed: Google rejected the credentials. Make sure you are using a 16-character App Password (from myaccount.google.com/apppasswords) and that IMAP is enabled in Gmail Settings.';
      }
      throw new Error(msg);
    }
  }
}

export const realMailboxService = new RealMailboxService();
