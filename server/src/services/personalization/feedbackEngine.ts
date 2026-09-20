import { prisma } from '../../config/prisma';

export interface FeedbackSubmission {
  userId: string;
  emailId?: string;
  action: 'thumbs_up' | 'thumbs_down' | 'manual_override' | 'direct_feedback' | 'bug_report' | 'feature_request' | string;
  overrideTier?: 'hotspot' | 'important' | 'normal' | 'low';
  comments?: string;
}

export class FeedbackEngine {
  /**
   * Records user feedback and applies instant reinforcement learning adjustments
   */
  public async recordFeedback(feedback: FeedbackSubmission) {
    // 1. Record feedback entry
    const savedFeedback = await prisma.userFeedback.create({
      data: {
        userId: feedback.userId,
        emailId: feedback.emailId || null,
        action: feedback.action,
        overrideTier: feedback.overrideTier || null,
        comments: feedback.comments || null,
      },
    });

    if (!feedback.emailId) {
      return savedFeedback;
    }

    // 2. Fetch associated email
    const email = await prisma.email.findUnique({
      where: { id: feedback.emailId },
    });

    if (!email) {
      return savedFeedback;
    }

    // 3. Find sender profile
    const sender = await prisma.senderProfile.findUnique({
      where: {
        userId_senderEmail: {
          userId: feedback.userId,
          senderEmail: email.sender,
        },
      },
    });

    if (sender) {
      let delta = 0;
      if (feedback.action === 'thumbs_up') {
        delta = 5.0; // Positive reinforcement
      } else if (feedback.action === 'thumbs_down') {
        delta = -8.0; // Negative reinforcement
      } else if (feedback.action === 'manual_override') {
        if (feedback.overrideTier === 'hotspot') delta = 15.0;
        else if (feedback.overrideTier === 'low') delta = -15.0;
      }

      const newScore = Math.min(100, Math.max(5, sender.importanceScore + delta));
      await prisma.senderProfile.update({
        where: { id: sender.id },
        data: { importanceScore: newScore },
      });
    }

    // 4. If manual override, update the email's tier directly
    if (feedback.overrideTier) {
      await prisma.email.update({
        where: { id: email.id },
        data: {
          priorityTier: feedback.overrideTier,
          reasoning: `[User Override] Re-classified by user to ${feedback.overrideTier.toUpperCase()}. Original AI analysis: ${email.reasoning}`,
        },
      });
    }

    return savedFeedback;
  }

  /**
   * Toggle VIP status for a sender
   */
  public async toggleVip(userId: string, senderEmail: string, isVip: boolean) {
    return prisma.senderProfile.upsert({
      where: {
        userId_senderEmail: {
          userId,
          senderEmail,
        },
      },
      update: {
        isVip,
        importanceScore: isVip ? 95.0 : 50.0,
      },
      create: {
        userId,
        senderEmail,
        isVip,
        importanceScore: isVip ? 95.0 : 50.0,
        totalEmails: 1,
      },
    });
  }

  /**
   * Update user sensitivity setting (conservative / balanced / aggressive)
   */
  public async updateSensitivity(userId: string, sensitivity: 'conservative' | 'balanced' | 'aggressive') {
    return prisma.user.update({
      where: { id: userId },
      data: { sensitivity },
    });
  }
}

export const feedbackEngine = new FeedbackEngine();
