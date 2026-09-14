import { Request, Response } from 'express';
import { authService } from '../services/auth/authService';
import { feedbackEngine } from '../services/personalization/feedbackEngine';

export class FeedbackController {
  public async submitFeedback(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { emailId, action, overrideTier, comments } = req.body;

      if (!emailId || !action) {
        return res.status(400).json({ success: false, error: 'emailId and action are required' });
      }

      if (!['thumbs_up', 'thumbs_down', 'manual_override'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid feedback action' });
      }

      const feedback = await feedbackEngine.recordFeedback({
        userId: user.id,
        emailId,
        action,
        overrideTier,
        comments,
      });

      return res.json({ success: true, data: feedback });
    } catch (err: any) {
      console.error('[FeedbackController.submitFeedback]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const feedbackController = new FeedbackController();
