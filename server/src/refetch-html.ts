import { googleOAuthService } from './services/auth/googleOAuthService';
import { prisma } from './config/prisma';

async function main() {
  console.log('[RefetchHTML] Finding user panbhuofficial@gmail.com...');
  const user = await prisma.user.findFirst({
    where: { email: 'panbhuofficial@gmail.com' },
  });

  if (!user) {
    console.error('User not found.');
    return;
  }

  let token: string;
  try {
    token = await googleOAuthService.getValidAccessTokenForUser(user.id);
    console.log('[RefetchHTML] Valid access token retrieved!');
  } catch (err: any) {
    console.error('[RefetchHTML] Could not get access token:', err.message);
    return;
  }

  const emails = await prisma.email.findMany({
    where: {
      userId: user.id,
      externalId: { startsWith: 'gmail_oauth_' },
    },
  });

  console.log(`[RefetchHTML] Found ${emails.length} Gmail OAuth emails to fetch authentic HTML for...`);

  let updatedCount = 0;

  for (const e of emails) {
    if (!e.externalId) continue;
    const msgId = e.externalId.replace('gmail_oauth_', '');

    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data: any = await res.json();
      if (data && data.payload) {
        const { text, html } = (googleOAuthService as any).extractBodyFromPayload(data.payload);
        if (html && html.trim().length > 20) {
          await prisma.email.update({
            where: { id: e.id },
            data: { bodyFull: html },
          });
          updatedCount++;
          console.log(`[✓] Updated authentic HTML for: "${e.subject}" (${html.length} bytes)`);
        } else {
          console.log(`[-] No HTML found for: "${e.subject}", keeping text`);
        }
      }
    } catch (err: any) {
      console.error(`[!] Error fetching msg ${msgId}:`, err.message);
    }
  }

  console.log(`[RefetchHTML] Done! Successfully updated ${updatedCount} emails with authentic Gmail HTML.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
