import { prisma } from '../../config/prisma';
import { ingestionQueue } from '../queue/ingestionQueue';

export interface TelegramJobPostInput {
  channelName: string;
  messageText: string;
  messageId?: string | number;
  postUrl?: string;
  timestamp?: Date;
}

export class TelegramService {
  /**
   * Ingests a message from a Telegram channel or bot
   */
  public async ingestTelegramMessage(userId: string, input: TelegramJobPostInput) {
    const text = input.messageText.trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const subjectLine = lines[0] || 'New Telegram Job Posting';
    const channel = input.channelName.startsWith('@') ? input.channelName : `@${input.channelName}`;

    // Extract potential apply URLs
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    const applyUrl = urlMatch ? urlMatch[0] : input.postUrl || '';

    const externalId = `tg_${input.channelName}_${input.messageId || Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // 1. Create raw email/message record in database
    const newRecord = await prisma.email.create({
      data: {
        userId,
        externalId,
        provider: 'telegram',
        sender: `${channel} (Telegram)`,
        senderName: `Telegram: ${channel}`,
        recipient: 'panbhuofficial@gmail.com',
        subject: `[Telegram Job] ${subjectLine.slice(0, 90)}`,
        bodySnippet: text.slice(0, 300),
        bodyFull: `${text}\n\nApply Link: ${applyUrl}`,
        receivedAt: input.timestamp || new Date(),
        status: 'unread',
        category: 'work',
        intent: 'request',
        urgency: 'high',
        priorityTier: 'important',
        priorityScore: 78.0,
        reasoning: `Telegram channel job opportunity from ${channel}. Contains hiring details and active application link.`,
      },
    });

    // 2. Queue for async priority intelligence and task extraction
    ingestionQueue.addJob({
      emailId: newRecord.id,
      userId,
    });

    console.log(`[TelegramService] Ingested Telegram job post from ${channel}: "${subjectLine.slice(0, 60)}"`);

    return newRecord;
  }

  /**
   * Handles incoming Telegram Bot API Webhook payload
   */
  public async handleWebhookUpdate(userId: string, update: any) {
    if (!update) return null;

    const message = update.message || update.channel_post;
    if (!message || !message.text) return null;

    const channelName =
      message.chat?.username ||
      message.chat?.title ||
      message.from?.username ||
      'Telegram Job Channel';

    return this.ingestTelegramMessage(userId, {
      channelName,
      messageText: message.text,
      messageId: message.message_id,
      timestamp: message.date ? new Date(message.date * 1000) : new Date(),
    });
  }
}

export const telegramService = new TelegramService();
