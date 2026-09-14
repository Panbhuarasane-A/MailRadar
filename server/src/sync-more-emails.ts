import { prisma } from './config/prisma';
import { realMailboxService } from './services/ingestion/realMailboxService';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'panbhuofficial@gmail.com' },
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  console.log(`[Sync] Found user ${user.email} (ID: ${user.id}). Starting deep sync of latest 150 emails from Gmail...`);

  const result = await realMailboxService.syncInbox(
    user.id,
    {
      email: 'panbhuofficial@gmail.com',
      password: 'ywaw qkln hisr wues',
      provider: 'gmail',
    },
    150
  );

  console.log('[Sync] Result:', result);

  // Check if Texas Instruments or JPMorgan emails were ingested
  const texas = await prisma.email.findMany({
    where: {
      userId: user.id,
      OR: [
        { subject: { contains: 'Texas' } },
        { subject: { contains: 'JPMorgan' } },
        { sender: { contains: 'ti.com' } },
      ],
    },
    select: { id: true, subject: true, sender: true, priorityTier: true, category: true },
  });

  console.log('[Sync] Texas / JPMorgan emails in DB:', texas);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
