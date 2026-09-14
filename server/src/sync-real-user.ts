import { prisma } from './config/prisma';
import { realMailboxService } from './services/ingestion/realMailboxService';

async function main() {
  console.log('[Setup] Purging all users and keeping sole user Panbhuarasane...');

  // Delete all feedback, tasks, emails, senders, and users
  await prisma.userFeedback.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.email.deleteMany({});
  await prisma.senderProfile.deleteMany({});
  await prisma.user.deleteMany({});

  // Create sole user
  const user = await prisma.user.create({
    data: {
      email: 'panbhuofficial@gmail.com',
      name: 'Panbhuarasane',
      sensitivity: 'balanced',
      preferences: JSON.stringify({
        theme: 'dark',
        dailyBriefTime: '08:30',
        soundAlerts: true,
      }),
    },
  });

  console.log(`[Setup] Created sole primary user: ${user.name} <${user.email}> (ID: ${user.id})`);

  // Sync real emails from Gmail
  console.log('[Setup] Syncing 50 latest emails directly from Gmail...');
  const syncResult = await realMailboxService.syncInbox(
    user.id,
    {
      email: 'panbhuofficial@gmail.com',
      password: 'ywaw qkln hisr wues',
      provider: 'gmail',
    },
    50
  );

  console.log('[Setup] Sync result:', syncResult);

  const emailCount = await prisma.email.count({ where: { userId: user.id } });
  const taskCount = await prisma.task.count({ where: { userId: user.id } });

  console.log(`[Setup] Successfully loaded ${emailCount} real emails and ${taskCount} action tasks.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
