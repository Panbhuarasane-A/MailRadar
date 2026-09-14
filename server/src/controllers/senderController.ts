import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';
import { feedbackEngine } from '../services/personalization/feedbackEngine';

export class SenderController {
  public async getSenders(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { vipOnly, search } = req.query;

      const where: any = { userId: user.id };
      if (vipOnly === 'true') {
        where.isVip = true;
      }
      if (search && String(search).trim().length > 0) {
        const query = String(search).trim();
        where.OR = [
          { senderEmail: { contains: query } },
          { senderName: { contains: query } },
        ];
      }

      const senders = await prisma.senderProfile.findMany({
        where,
        orderBy: [
          { isVip: 'desc' },
          { importanceScore: 'desc' },
          { totalEmails: 'desc' },
        ],
      });

      return res.json({ success: true, count: senders.length, data: senders });
    } catch (err: any) {
      console.error('[SenderController.getSenders]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async toggleVip(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { senderEmail, isVip } = req.body;

      if (!senderEmail) {
        return res.status(400).json({ success: false, error: 'senderEmail is required' });
      }

      const updated = await feedbackEngine.toggleVip(user.id, senderEmail, Boolean(isVip));
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[SenderController.toggleVip]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const senderController = new SenderController();
