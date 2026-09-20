import { googleOAuthService } from './services/auth/googleOAuthService';
import { prisma } from './config/prisma';

async function main() {
  console.log('[SyncAllHTML] Starting global Gmail HTML update...');
  const user = await prisma.user.findFirst({
    where: { email: 'panbhuofficial@gmail.com' },
  });

  if (!user) {
    console.error('User not found.');
    return;
  }

  const token = await googleOAuthService.getValidAccessTokenForUser(user.id);
  console.log('[SyncAllHTML] Access token obtained!');

  // 1. Fetch the top 150 messages directly from the Gmail API
  console.log('[SyncAllHTML] Fetching message list from Gmail API...');
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=150&q=in:inbox`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const listData: any = await listRes.json();
  const messages = listData.messages || [];
  console.log(`[SyncAllHTML] Retrieved ${messages.length} messages from Gmail.`);

  let updatedCount = 0;

  for (const msgRef of messages) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const msgData: any = await msgRes.json();
      if (!msgData || !msgData.payload) continue;

      const headers: Record<string, string> = {};
      for (const h of msgData.payload.headers || []) {
        headers[h.name.toLowerCase()] = h.value;
      }

      const subject = headers['subject'] || '(No Subject)';
      const rawFrom = headers['from'] || '';
      let fromAddress = rawFrom;
      let fromName: string | undefined = undefined;
      const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
      if (match) {
        fromName = match[1].replace(/["']/g, '').trim();
        fromAddress = match[2].trim();
      }

      const { text, html } = (googleOAuthService as any).extractBodyFromPayload(msgData.payload);
      if (!html || html.trim().length < 20) continue;

      // Find matching email in DB by externalId or subject + sender
      const existing = await prisma.email.findFirst({
        where: {
          userId: user.id,
          OR: [
            { externalId: `gmail_oauth_${msgRef.id}` },
            { subject: subject },
            {
              AND: [
                { subject: { startsWith: subject.slice(0, 30) } },
                { sender: fromAddress },
              ],
            },
          ],
        },
      });

      if (existing) {
        await prisma.email.update({
          where: { id: existing.id },
          data: {
            bodyFull: html,
            externalId: `gmail_oauth_${msgRef.id}`,
          },
        });
        updatedCount++;
        console.log(`[✓] Updated HTML for: "${subject}" (ID: ${existing.id})`);
      } else {
        // Create new email if not present
        const snippet = msgData.snippet || text.slice(0, 300).trim() || '(No content)';
        const rawDate = headers['date'] ? new Date(headers['date']) : new Date();

        await prisma.email.create({
          data: {
            userId: user.id,
            externalId: `gmail_oauth_${msgRef.id}`,
            provider: 'gmail',
            sender: fromAddress,
            senderName: fromName || null,
            recipient: user.email,
            subject,
            bodySnippet: snippet,
            bodyFull: html,
            receivedAt: isNaN(rawDate.getTime()) ? new Date() : rawDate,
            status: 'unread',
            priorityTier: 'normal',
            priorityScore: 50.0,
            reasoning: 'Ingested with authentic Gmail HTML.',
          },
        });
        updatedCount++;
        console.log(`[+] Created with HTML: "${subject}"`);
      }
    } catch (err: any) {
      console.error(`Error on message ${msgRef.id}:`, err.message);
    }
  }

  // Remove duplicate text-only IMAP duplicates where a gmail_oauth email with HTML exists
  const allEmails = await prisma.email.findMany({
    where: { userId: user.id },
    select: { id: true, subject: true, sender: true, externalId: true, bodyFull: true },
  });

  const seenSubjects = new Map<string, string>(); // subject -> id of email with HTML
  const toDelete: string[] = [];

  for (const e of allEmails) {
    const key = `${e.sender}::${e.subject}`.toLowerCase().trim();
    const hasHtml = /<[a-z][\s\S]*>/i.test(e.bodyFull || '');

    if (hasHtml) {
      seenSubjects.set(key, e.id);
    }
  }

  for (const e of allEmails) {
    const key = `${e.sender}::${e.subject}`.toLowerCase().trim();
    const hasHtml = /<[a-z][\s\S]*>/i.test(e.bodyFull || '');

    if (!hasHtml && seenSubjects.has(key) && seenSubjects.get(key) !== e.id) {
      toDelete.push(e.id);
    }
  }

  if (toDelete.length > 0) {
    console.log(`[SyncAllHTML] Removing ${toDelete.length} legacy plain-text duplicate records...`);
    await prisma.email.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  console.log(`[SyncAllHTML] Finished! Total updated: ${updatedCount}, Duplicates cleaned: ${toDelete.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
