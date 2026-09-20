import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';
import { ingestionQueue } from '../services/queue/ingestionQueue';

const SEED_EMAILS = [
  {
    sender: 'account-security-noreply@google.com',
    senderName: 'Google Account Security',
    subject: 'Google Verification Code: 839412 - Verify your sign-in attempt',
    bodySnippet: 'Your Google verification code is 839412. This OTP is valid for 10 minutes. Do not share this code with anyone.',
    bodyFull: 'Hi Panbhuarasane,\n\nWe detected a new sign-in attempt to your Google Account (panbhuofficial@gmail.com) from Chrome on Windows.\n\nYour One-Time Verification Code (OTP) is:\n\n   🔑  839412  🔑\n\nThis verification code expires in 10 minutes. If you did not make this request, please secure your account immediately.\n\nGoogle Security Team',
    receivedAt: new Date(Date.now() - 3 * 60 * 1000), // 3 mins ago
    isVip: true,
  },
  {
    sender: 'support@github.com',
    senderName: 'GitHub Security',
    subject: '[GitHub] Please reset your password - Temporary Security Link',
    bodySnippet: 'We received a request to reset your GitHub password. Click the secure link within 1 hour to set a new password.',
    bodyFull: 'Hi Panbhuarasane,\n\nWe received a request to reset the password for your GitHub account (@panbhuarasane).\n\nTo choose a new password, click the link below:\nhttps://github.com/password_reset?token=9fa81bc32e1847e091b8a72e9c\n\n⚠️ Note: This password reset link is only valid for 1 hour. If you did not request a password reset, you can safely ignore this email.\n\nThanks,\nThe GitHub Team',
    receivedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
    isVip: true,
  },
  {
    sender: 'sarah.connor@cyberdyne-security.io',
    senderName: 'Sarah Connor (Security Director)',
    subject: 'URGENT SECURITY: Critical vulnerability CVE-2026-9912 discovered in auth gateway',
    bodySnippet: 'Alex, security telemetry flagged an unauthenticated token bypass in our production auth service. We need your team to patch and deploy the hotfix before 6:00 PM today.',
    bodyFull: 'Alex,\n\nSecurity telemetry has flagged an active zero-day vulnerability (CVE-2026-9912) in our public API gateway auth module.\n\nAll engineers must suspend current sprint tasks. We need the patched container image deployed to production before 6:00 PM today.\n\nWar room link: https://meet.company.internal/security-incident\n\nThanks,\nSarah Connor\nDirector of Cyber Security',
    receivedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    isVip: true,
  },
  {
    sender: 'elena.rostova@finance-exec.com',
    senderName: 'Elena Rostova (CFO)',
    subject: 'Action Required: Dual-authorization required for $82,000 Datadog renewal contract',
    bodySnippet: 'Alex, the annual APM contract with Datadog requires your executive sign-off before 5:00 PM today to qualify for our multi-year discount of $24,000.',
    bodyFull: 'Hi Alex,\n\nThe annual APM enterprise contract renewal with Datadog is due for sign-off. Please review the attached contract summary and provide dual authorization in Coupa before 5:00 PM today.\n\nFailing to sign today will forfeit our $24,000 volume discount.\n\nLink to approve: https://coupa.internal/req/90812\n\nBest,\nElena Rostova',
    receivedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
    isVip: true,
  },
  {
    sender: 'marcus.chen@designstudio.io',
    senderName: 'Marcus Chen (Lead Designer)',
    subject: 'Review updated Design System tokens & dark mode components by Thursday',
    bodySnippet: 'Hey Alex, I have updated the Figma design tokens for dark mode, glowing hotspot badges, and high-contrast accessibility. Please review by Thursday 5 PM.',
    bodyFull: 'Hey Alex,\n\nI have finished updating our design system specifications in Figma. We now have high-contrast palettes, dark-theme first guidelines, and distinct priority glow markers.\n\nPlease take a look and leave comments on the frames by Thursday at 5 PM so we can start sprint planning.\n\nFigma file: https://figma.com/file/mailradar-tokens-v2\n\nCheers,\nMarcus',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isVip: false,
  },
  {
    sender: 'dr.arun.prof@mit.edu',
    senderName: 'Prof. Arun Patel',
    subject: 'Feedback on IEEE Paper Draft: "Autonomous Priority Scoring in Executive Inboxes"',
    bodySnippet: 'Dear Alex, I read through your co-authored draft. The priority scoring section is strong. Please submit your final revisions by Friday noon for IEEE review.',
    bodyFull: 'Dear Alex,\n\nI have completed my preliminary review of your manuscript "Autonomous Priority Scoring in Executive Inboxes". The section on explainability and transparent reasoning strings is particularly compelling.\n\nPlease address the minor annotations on page 4 and submit the revised PDF by Friday noon.\n\nWarm regards,\nProf. Arun Patel',
    receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isVip: true,
  },
  {
    sender: 'jenna.pm@company.io',
    senderName: 'Jenna Morales (Product Lead)',
    subject: 'Sprint 24 Retro Notes & Roadmap Prioritization for Q4',
    bodySnippet: 'Hi team, thank you for a great demo yesterday. Attached are the retro meeting notes and action items. Velocity was up 18%. No immediate action required.',
    bodyFull: 'Hi team,\n\nThank you everyone for the great work in Sprint 24!\n- Velocity up 18%\n- Zero P0 bugs escaped\n- Customer CSAT reached 94%\n\nAttached is the recording and retro summary. No immediate action required, just FYI ahead of roadmap planning.\n\nBest,\nJenna',
    receivedAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
    isVip: false,
  },
  {
    sender: 'newsletter@hacker-weekly.org',
    senderName: 'Hacker Weekly Digest',
    subject: 'Issue #412: The Future of Agentic AI, Local LLMs, and Vector Indexes',
    bodySnippet: 'Curated tech stories this week: Building real-time event streaming systems, why dark-mode UI boosts productivity, and new benchmarks for lightweight models.',
    bodyFull: 'Hacker Weekly - Issue #412\n\nTop Stories:\n1. Building Real-time Agentic Workflows with TypeScript\n2. The Cognitive Psychology of Action-Centric Inboxes\n3. High-Performance SQLite vs PostgreSQL Benchmarks\n\nUnsubscribe from future issues at https://hacker-weekly.org/unsub',
    receivedAt: new Date(Date.now() - 14 * 60 * 60 * 1000), // 14 hours ago
    isVip: false,
  },
  {
    sender: 'St Joseph Chennai CDC <stjoseph@haveloc.com>',
    senderName: 'St Joseph Chennai CDC',
    subject: 'Important Notice: Student Account Status - Freeze/Unfreeze Notification',
    bodySnippet: 'Hello PANBHUARASANE ANBAZHAGAN, Your Haveloc access has been restored. If you have questions about this change, contact your placement office.',
    bodyFull: 'Hello PANBHUARASANE ANBAZHAGAN,\n\nYour Haveloc access has been restored.\n\nYour account is active again. If you have questions about this change, contact your placement office.\n\n© 2026 Haveloc Placement Services\nThis is an automated message. https://haveloc.com',
    receivedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    isVip: true,
  },
  {
    sender: 'GATE 2027 <noreply-gate2027@iitm.ac.in>',
    senderName: 'GATE 2027',
    subject: 'GATE 2027 Enrollment ID',
    bodySnippet: 'Dear GATE 2027 applicant: Your email address has been registered with the GATE 2027 Online Application Processing System. Enrollment ID: G27-IITM-89124',
    bodyFull: 'Dear GATE 2027 applicant:\n\nYour email address has been registered with the GATE 2027 Online Application Processing System (GOAPS).\n\nYour Enrollment ID is: G27-IITM-89124\nPassword has been sent to your mobile.\n\nPlease save your enrollment ID for all future correspondence.\n\nIIT Madras GATE Office\nhttps://gate2027.iitm.ac.in',
    receivedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
    isVip: true,
  },
  {
    sender: "L'Oréal Careers <noreply@careers.loreal-group.com>",
    senderName: "L'Oréal Careers",
    subject: "L'Oréal - Thank you for registering to L'Oréal Brandstorm 2026",
    bodySnippet: "Dear Panbhuarasane, Thank you for registering to L'Oréal Brandstorm 2026! We are excited to welcome you to the ultimate innovation competition.",
    bodyFull: "Dear Panbhuarasane,\n\nThank you for registering to L'Oréal Brandstorm 2026!\n\nWe are excited to welcome you to this year's competition. Get ready to crack the case, innovate beauty tech, and compete on the global stage.\n\nPortal: https://brandstorm.loreal.com\nCareers: https://careers.loreal-group.com\n\nBest regards,\nL'Oréal Talent Acquisition & University Relations",
    receivedAt: new Date(Date.now() - 35 * 60 * 1000), // 35 mins ago
    isVip: true,
  },
  {
    sender: 'Unstop Opportunities <noreply@emails.unstop.com>',
    senderName: 'Unstop Opportunities',
    subject: 'Application Confirmed: National Coding & AI Hackathon 2026',
    bodySnippet: 'Your registration for National Coding & AI Hackathon 2026 has been confirmed. Round 1 online assessment goes live this Sunday.',
    bodyFull: 'Hi Panbhuarasane,\n\nYour team registration has been successfully confirmed on Unstop!\n\nCompetition: National Coding & AI Challenge\nRound 1 Assessment Window: Sunday 10:00 AM - 6:00 PM IST\n\nLink: https://unstop.com/hackathons/national-ai-challenge-2026\n\nHappy Competing!\nTeam Unstop',
    receivedAt: new Date(Date.now() - 50 * 60 * 1000),
    isVip: false,
  },
  {
    sender: 'Devpost <notifications@devpost.com>',
    senderName: 'Devpost Hackathons',
    subject: 'Submission Open: Global Autonomous Agents Sprints 2026',
    bodySnippet: 'Submissions are officially open for Global Autonomous Agents Sprints. $50,000 in prizes.',
    bodyFull: 'Hey Builders,\n\nSubmissions are now open for the Global Autonomous Agents Sprints!\n\nDeadline to submit: October 20, 2026 at 5:00 PM EST.\nPrize Pool: $50,000 USD\n\nSubmit your project: https://devpost.com/hackathons/agentic-ai-2026\n\nCheers,\nDevpost Team',
    receivedAt: new Date(Date.now() - 80 * 60 * 1000),
    isVip: false,
  },
  {
    sender: 'sales@cloudserver-pro.com',
    senderName: 'CloudServer Pro Special Deals',
    subject: 'Special Offer: 60% OFF Bare Metal Servers & Redis Clusters!',
    bodySnippet: 'Limited time flash discount on dedicated GPU instances and managed Redis clusters. Code: FLASH60 at checkout.',
    bodyFull: 'Supercharge your backend infrastructure!\nGet 60% discount on all dedicated clusters for 12 months with code FLASH60.\n\nClick here to claim: https://cloudserver-pro.com/deal\nUnsubscribe here.',
    receivedAt: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours ago
    isVip: false,
  },
];

export async function seedDatabase() {
  console.log('[Seed] Initializing database seed...');
  
  // 1. Create or get user
  const user = await authService.getOrCreateDefaultUser();
  const admin = await authService.getOrCreateAdminUser();
  console.log(`[Seed] Primary User: ${user.email} (${user.id}), Admin: ${admin.email} (${admin.id})`);

  // Clean existing data for clean demo state
  await prisma.userFeedback.deleteMany({});
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.email.deleteMany({ where: { userId: user.id } });
  await prisma.senderProfile.deleteMany({ where: { userId: user.id } });

  console.log('[Seed] Ingesting realistic email dataset & computing priority intelligence...');

  const createdEmails = [];
  for (const item of SEED_EMAILS) {
    // 1. Create sender profile
    await prisma.senderProfile.create({
      data: {
        userId: user.id,
        senderEmail: item.sender,
        senderName: item.senderName,
        isVip: item.isVip,
        importanceScore: item.isVip ? 95.0 : 50.0,
        totalEmails: item.isVip ? 8 : 2,
      },
    });

    // 2. Create raw email record
    const email = await prisma.email.create({
      data: {
        userId: user.id,
        externalId: `seed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        provider: 'simulated',
        sender: item.sender,
        senderName: item.senderName,
        recipient: user.email,
        subject: item.subject,
        bodySnippet: item.bodySnippet,
        bodyFull: item.bodyFull,
        receivedAt: item.receivedAt,
        status: 'unread',
        priorityTier: 'normal',
        priorityScore: 50.0,
        reasoning: 'Analyzing priority intelligence...',
      },
    });

    // 3. Process email synchronously for seed
    await ingestionQueue.processEmail(email.id, user.id);
    createdEmails.push(email);
  }

  // 4. Do not seed dummy feedbacks - only capture genuine user actions
  console.log('[Seed] Ready for genuine user feedbacks.');

  const emailCount = await prisma.email.count();
  const taskCount = await prisma.task.count();
  const feedbackCount = await prisma.userFeedback.count();
  const userCount = await prisma.user.count();

  console.log(`[Seed] Seeding complete! Ingested ${emailCount} emails across ${userCount} users, ${taskCount} tasks, ${feedbackCount} feedbacks.`);
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
