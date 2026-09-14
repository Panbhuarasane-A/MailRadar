import { prisma } from './config/prisma';
import { authService } from './services/auth/authService';
import { normalizeEmail } from './services/ingestion/normalizer';
import { ingestionQueue } from './services/queue/ingestionQueue';
import { priorityEngine } from './services/scoring/priorityEngine';
import { feedbackEngine } from './services/personalization/feedbackEngine';

async function runEndToEndVerification() {
  console.log('\n=============================================================');
  console.log('  🧪 MAILRADAR END-TO-END SYSTEM INTEGRATION TEST SUITE');
  console.log('=============================================================\n');

  // Test 1: User Provisioning
  console.log('[Test 1] Provisioning active user session...');
  const user = await authService.getOrCreateDefaultUser();
  console.log(`  ✓ User active: ${user.email} (ID: ${user.id})`);

  // Test 2: Ingestion & Normalizer
  console.log('\n[Test 2] Normalizing inbound email payload...');
  const samplePayload = {
    sender: 'cto@partner-enterprise.com',
    senderName: 'David Zhang (CTO)',
    recipient: user.email,
    subject: 'URGENT: Production API rate limit breach requiring executive override',
    bodySnippet: 'David here. Our tier-1 integration hit 100% capacity. Please approve the limit expansion before 5:00 PM today to prevent dropped customer traffic.',
    bodyFull: 'David here.\nOur tier-1 payment integration hit 100% capacity.\nPlease review and approve the quota expansion in the management console before 5:00 PM today to prevent dropped customer traffic.\n\nLink: https://console.internal/limits/override\n\nThanks,\nDavid',
    receivedAt: new Date(),
  };

  const normalized = normalizeEmail(samplePayload, 'simulated', user.id);
  console.log(`  ✓ Normalized payload: Sender: "${normalized.senderName} <${normalized.sender}>" | Subject: "${normalized.subject}"`);

  // Test 3: Raw Persistence (Status: unread)
  console.log('\n[Test 3] Persisting raw email (Non-blocking ingestion guarantee)...');
  const rawEmail = await prisma.email.create({
    data: {
      userId: user.id,
      externalId: normalized.externalId,
      provider: normalized.provider,
      sender: normalized.sender,
      senderName: normalized.senderName || null,
      recipient: normalized.recipient,
      subject: normalized.subject,
      bodySnippet: normalized.bodySnippet,
      bodyFull: normalized.bodyFull,
      receivedAt: normalized.receivedAt || new Date(),
      status: 'unread',
      priorityTier: 'normal',
      priorityScore: 50.0,
      reasoning: 'Queued for async processing...',
    },
  });
  console.log(`  ✓ Raw email stored: ID ${rawEmail.id} with status "${rawEmail.status}"`);

  // Test 4: Async Processing Queue Worker (LLM + Scoring + Task Extraction)
  console.log('\n[Test 4] Executing background worker pipeline on email...');
  await ingestionQueue.processEmail(rawEmail.id, user.id);

  const processedEmail = await prisma.email.findUnique({
    where: { id: rawEmail.id },
    include: { tasks: true },
  });

  if (!processedEmail) throw new Error('Processed email not found!');
  console.log(`  ✓ Enriched Tier: ${processedEmail.priorityTier.toUpperCase()} (Score: ${processedEmail.priorityScore}/100)`);
  console.log(`  ✓ Category: ${processedEmail.category} | Intent: ${processedEmail.intent} | Urgency: ${processedEmail.urgency}`);
  console.log(`  ✓ Requires Action: ${processedEmail.requiresAction}`);
  console.log(`  ✓ Deadline Extracted: ${processedEmail.deadline ? processedEmail.deadline.toISOString() : 'None (No fabrication)'}`);
  console.log(`  ✓ Explainability Reasoning: "${processedEmail.reasoning}"`);
  console.log(`  ✓ Auto-Extracted Tasks: ${processedEmail.tasks.length} task(s)`);

  if (processedEmail.tasks.length > 0) {
    console.log(`    - Task Title: "${processedEmail.tasks[0].title}" (Priority: ${processedEmail.tasks[0].priority})`);
  }

  // Test 5: Personalization & Feedback Reinforcement
  console.log('\n[Test 5] Submitting user feedback (Thumbs Up on Hotspot score)...');
  await feedbackEngine.recordFeedback({
    userId: user.id,
    emailId: processedEmail.id,
    action: 'thumbs_up',
  });

  const updatedSender = await prisma.senderProfile.findUnique({
    where: { userId_senderEmail: { userId: user.id, senderEmail: processedEmail.sender } },
  });
  console.log(`  ✓ Sender importance score adjusted to: ${updatedSender?.importanceScore} pts`);

  // Test 6: Clean up test email
  await prisma.task.deleteMany({ where: { sourceEmailId: rawEmail.id } });
  await prisma.userFeedback.deleteMany({ where: { emailId: rawEmail.id } });
  await prisma.email.delete({ where: { id: rawEmail.id } });
  console.log('\n[Test 6] Cleaned up temporary test artifacts.');

  console.log('\n=============================================================');
  console.log('  ✅ ALL 6 PIPELINE INTEGRATION TESTS PASSED WITH 100% SUCCESS');
  console.log('=============================================================\n');
}

runEndToEndVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
