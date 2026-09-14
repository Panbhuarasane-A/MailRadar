import { prisma } from './config/prisma';
import { ingestionQueue } from './services/queue/ingestionQueue';
import { feedbackEngine } from './services/personalization/feedbackEngine';

async function reprocessInbox() {
  const user = await prisma.user.findFirst({ where: { email: 'panbhuofficial@gmail.com' } });
  if (!user) {
    console.error('User panbhuofficial@gmail.com not found');
    return;
  }

  console.log(`[Reprocess] Reprocessing emails for ${user.email}...`);

  // 1. Promote Key Placement & Contest Senders to VIP
  await feedbackEngine.toggleVip(user.id, 'stjoseph@haveloc.com', true);
  await feedbackEngine.toggleVip(user.id, 'updates@unstop.events', true);
  await feedbackEngine.toggleVip(user.id, 'updates@unstop.email', true);
  await feedbackEngine.toggleVip(user.id, 'student@mail.internshala.com', true);
  await feedbackEngine.toggleVip(user.id, 'manvendra@hackculture.net', true);

  // 2. Clear old tasks so fresh action tasks are extracted
  await prisma.task.deleteMany({ where: { userId: user.id } });

  // 3. Process every email through the new AI rules
  const allEmails = await prisma.email.findMany({ where: { userId: user.id } });

  for (const email of allEmails) {
    await ingestionQueue.processEmail(email.id, user.id);
  }

  const updatedEmails = await prisma.email.findMany({
    where: { userId: user.id },
    orderBy: [{ priorityScore: 'desc' }, { receivedAt: 'desc' }],
    select: {
      subject: true,
      sender: true,
      priorityTier: true,
      priorityScore: true,
      reasoning: true,
      requiresAction: true,
    },
  });

  const hotspots = updatedEmails.filter((e) => e.priorityTier === 'hotspot');
  const important = updatedEmails.filter((e) => e.priorityTier === 'important');
  const tasksCount = await prisma.task.count({ where: { userId: user.id } });

  console.log(`\n[Reprocess] Done! Hotspots: ${hotspots.length}, Important: ${important.length}, Action Tasks: ${tasksCount}`);
  console.log('\n--- TOP HOTSPOTS & IMPORTANT ITEMS ---');
  console.table(updatedEmails.slice(0, 15));
}

reprocessInbox()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
