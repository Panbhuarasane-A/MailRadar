import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';
import { normalizeEmail } from '../services/ingestion/normalizer';
import { ingestionQueue } from '../services/queue/ingestionQueue';

export const SIMULATION_PRESETS = [
  {
    id: 'google_otp',
    name: 'Google Sign-in OTP Verification',
    sender: 'account-security-noreply@google.com',
    senderName: 'Google Account Security',
    subject: 'Google Verification Code: 839412 - Verify your sign-in attempt',
    bodySnippet: 'Your Google verification code is 839412. This OTP is valid for 10 minutes. Do not share this code with anyone.',
    bodyFull: 'Hi Panbhuarasane,\n\nWe detected a new sign-in attempt to your Google Account (panbhuofficial@gmail.com) from Chrome on Windows.\n\nYour One-Time Verification Code (OTP) is:\n\n   🔑  839412  🔑\n\nThis verification code expires in 10 minutes. If you did not make this request, please secure your account immediately.\n\nGoogle Security Team',
  },
  {
    id: 'github_password_reset',
    name: 'GitHub Password Reset Link',
    sender: 'support@github.com',
    senderName: 'GitHub Security',
    subject: '[GitHub] Please reset your password - Temporary Security Link',
    bodySnippet: 'We received a request to reset your GitHub password. Click the secure link within 1 hour to set a new password.',
    bodyFull: 'Hi Panbhuarasane,\n\nWe received a request to reset the password for your GitHub account (@panbhuarasane).\n\nTo choose a new password, click the link below:\nhttps://github.com/password_reset?token=9fa81bc32e1847e091b8a72e9c\n\n⚠️ Note: This password reset link is only valid for 1 hour. If you did not request a password reset, you can safely ignore this email.\n\nThanks,\nThe GitHub Team',
  },
  {
    id: 'prod_outage',
    name: 'Critical Outage Alert',
    sender: 'devops-alerts@cloudinfra.net',
    senderName: 'CloudOps Monitor',
    subject: 'URGENT: Primary PostgreSQL cluster read-replica lag > 350s (Production Impact)',
    bodySnippet: 'Automated Alert: Database replica lag exceeded 350s on us-east-1 prod cluster. Checkout latency degraded by 45%. SRE on-call requires immediate tech lead sign-off to execute failover script.',
    bodyFull: 'Incident ID: INC-8921\nSeverity: CRITICAL / P0\nComponent: Database Cluster (us-east-1)\n\nAutomated Alert: Database replica lag exceeded 350s on us-east-1 prod cluster. Checkout latency degraded by 45%.\n\nSRE on-call requires immediate tech lead sign-off to execute failover script. Please join the incident bridge: https://bridge.internal/inc-8921 or approve via command.',
  },
  {
    id: 'cfo_wire',
    name: 'CFO Wire Authorization',
    sender: 'elena.rostova@finance-exec.com',
    senderName: 'Elena Rostova (CFO)',
    subject: 'URGENT: Please authorize $45,000 Q3 vendor wire payment before 4:00 PM today',
    bodySnippet: 'Alex, we need your dual-sign authorization on the AWS reserved instance renewal ($45,000) before 4:00 PM today to lock in the 32% discount tier.',
    bodyFull: 'Alex,\n\nWe need your dual-sign authorization on the AWS reserved instance renewal ($45,000) before 4:00 PM today to lock in the 32% enterprise discount tier. The invoice has been pre-verified by procurement.\n\nPlease review and approve by today EOD.\n\nBest,\nElena Rostova\nChief Financial Officer',
  },
  {
    id: 'design_review',
    name: 'Design System Review',
    sender: 'marcus.chen@designstudio.io',
    senderName: 'Marcus Chen',
    subject: 'Review updated Design System tokens & components by Thursday',
    bodySnippet: 'Hey Alex, I have updated the Figma design tokens for dark mode and hotspot glows. Could you please review and leave your feedback by Thursday 5 PM?',
    bodyFull: 'Hey Alex,\n\nI have updated the Figma design tokens for dark mode, hotspot glowing badges, and high-contrast color palettes.\n\nCould you please review the attached specs and leave your feedback by Thursday 5 PM so we can unblock the frontend engineers for sprint kickoff?\n\nFigma Link: https://figma.com/file/mailradar-tokens\n\nThanks,\nMarcus',
  },
  {
    id: 'sprint_notes',
    name: 'Sprint Retrospective Notes',
    sender: 'jenna.pm@company.io',
    senderName: 'Jenna Morales (Product)',
    subject: 'Sprint 24 Retrospective Summary & Next Milestone Scope',
    bodySnippet: 'Hi team, here is the recap from yesterday’s sprint retro. Velocity increased by 14% and test coverage reached 88%. No action required, just FYI for planning.',
    bodyFull: 'Hi team,\n\nHere is the recap from yesterday’s sprint retro.\n- Velocity increased by 14%\n- Test coverage reached 88%\n- Shipped 12 user stories\n\nNo immediate action required, just sharing for your visibility before next week’s planning.\n\nCheers,\nJenna',
  },
  {
    id: 'saas_newsletter',
    name: 'SaaS Marketing Promo',
    sender: 'newsletters@clouddeals-weekly.com',
    senderName: 'CloudDeals Weekly',
    subject: 'Flash Sale: 50% off Developer Productivity Tools this weekend only!',
    bodySnippet: 'Don’t miss out on exclusive discounts for CI/CD runners, APM monitors, and cloud databases. Click here to claim your code. Unsubscribe anytime.',
    bodyFull: 'Hey Developer,\n\nThis weekend only, save up to 50% on top developer tooling:\n- CI/CD Speed Boosters\n- Log Aggregators\n- Profiling suites\n\nShop now at https://clouddeals-weekly.com/sale\n\nTo unsubscribe, click here.',
  },
];

import { realMailboxService } from '../services/ingestion/realMailboxService';

export class SyncController {
  public async getPresets(req: Request, res: Response) {
    return res.json({ success: true, data: SIMULATION_PRESETS });
  }

  public async simulateEmail(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { presetId, customEmail } = req.body;

      let emailData: any;

      if (presetId) {
        const preset = SIMULATION_PRESETS.find((p) => p.id === presetId);
        if (!preset) {
          return res.status(400).json({ success: false, error: 'Preset not found' });
        }
        emailData = preset;
      } else if (customEmail) {
        emailData = customEmail;
      } else {
        // Pick random preset
        emailData = SIMULATION_PRESETS[Math.floor(Math.random() * SIMULATION_PRESETS.length)];
      }

      const normalized = normalizeEmail(
        {
          ...emailData,
          receivedAt: new Date(),
        },
        'simulated',
        user.id
      );

      // 1. Ingestion: Save raw email immediately with default status 'unread'
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
          reasoning: 'Queued for AI priority scoring...',
        },
      });

      // 2. Queue for async processing
      ingestionQueue.addJob({
        emailId: rawEmail.id,
        userId: user.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Email ingested and enqueued for async LLM intelligence scoring',
        data: rawEmail,
      });
    } catch (err: any) {
      console.error('[SyncController.simulateEmail]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async triggerSync(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);

      let syncSummary: any = null;
      try {
        let mailboxConfig: any = null;
        if (user.preferences) {
          const prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences;
          if (prefs.connectedMailbox?.email && prefs.connectedMailbox?.password) {
            mailboxConfig = prefs.connectedMailbox;
          }
        }

        if (mailboxConfig) {
          syncSummary = await realMailboxService.syncInbox(user.id, mailboxConfig, 100);
        }
      } catch (syncErr) {
        console.warn('[SyncController.triggerSync] Real mailbox sync warning:', syncErr);
      }

      const unreadCount = await prisma.email.count({
        where: { userId: user.id, status: 'unread' },
      });
      const totalCount = await prisma.email.count({
        where: { userId: user.id },
      });

      return res.json({
        success: true,
        message: syncSummary ? syncSummary.message : 'Mailbox synchronized successfully',
        data: {
          syncedAt: new Date().toISOString(),
          unreadCount,
          totalCount,
          syncSummary,
        },
      });
    } catch (err: any) {
      console.error('[SyncController.triggerSync]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const syncController = new SyncController();
