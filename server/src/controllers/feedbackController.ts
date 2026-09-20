import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';
import { feedbackEngine } from '../services/personalization/feedbackEngine';

export class FeedbackController {
  public async submitFeedback(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { emailId, action, overrideTier, comments, subject, category } = req.body;

      const resolvedAction = action || 'direct_feedback';

      // Package full comments if subject or category provided for direct feedback
      let fullComments = comments || '';
      if (subject || category) {
        const metadataPrefix = [
          subject ? `[Subject: ${subject}]` : '',
          category ? `[Category: ${category}]` : '',
        ].filter(Boolean).join(' ');
        fullComments = metadataPrefix ? `${metadataPrefix} ${fullComments}`.trim() : fullComments;
      }

      if (!emailId && !fullComments && !action) {
        return res.status(400).json({ success: false, error: 'Feedback content or action is required' });
      }

      const feedback = await feedbackEngine.recordFeedback({
        userId: user.id,
        emailId: emailId || undefined,
        action: resolvedAction,
        overrideTier,
        comments: fullComments || undefined,
      });

      console.log(`[FeedbackController] User feedback logged for Admin from ${user.email}: Action=${resolvedAction}, Comments=${fullComments.slice(0, 50)}`);

      return res.json({ success: true, message: 'Feedback successfully sent to Admin', data: feedback });
    } catch (err: any) {
      console.error('[FeedbackController.submitFeedback]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async getUserFeedbacks(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const feedbacks = await prisma.userFeedback.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          email: {
            select: {
              id: true,
              subject: true,
              sender: true,
              senderName: true,
              priorityScore: true,
              priorityTier: true,
              category: true,
              receivedAt: true,
            },
          },
        },
      });

      return res.json({ success: true, count: feedbacks.length, data: feedbacks });
    } catch (err: any) {
      console.error('[FeedbackController.getUserFeedbacks]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async deleteFeedback(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;

      await prisma.userFeedback.deleteMany({
        where: { id, userId: user.id },
      });

      return res.json({ success: true, message: 'Feedback removed successfully' });
    } catch (err: any) {
      console.error('[FeedbackController.deleteFeedback]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const feedbackController = new FeedbackController();
