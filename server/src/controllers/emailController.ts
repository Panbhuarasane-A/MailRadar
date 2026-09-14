import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';

export class EmailController {
  public async getEmails(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { tier, status, category, search } = req.query;

      // Auto-purge completed (archived) emails older than 2 days (48 hours)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      try {
        await prisma.email.deleteMany({
          where: {
            userId: user.id,
            status: 'archived',
            updatedAt: { lt: twoDaysAgo },
          },
        });
      } catch (e) {
        console.error('[EmailController] Error purging old completed emails:', e);
      }

      const where: any = { userId: user.id };

      // Priority tier filter
      if (tier && tier !== 'all') {
        where.priorityTier = String(tier);
      }

      // Status filter
      if (status && status !== 'all') {
        where.status = String(status);
        if (status === 'archived') {
          where.updatedAt = { gte: twoDaysAgo };
        }
      } else if (!status) {
        // Default: exclude archived and snoozed unless requested
        where.status = { in: ['unread', 'read'] };
      }

      // Category filter
      if (category && category !== 'all') {
        where.category = String(category);
      }

      // Search query filter
      if (search && String(search).trim().length > 0) {
        const query = String(search).trim();
        where.OR = [
          { subject: { contains: query } },
          { sender: { contains: query } },
          { senderName: { contains: query } },
          { bodySnippet: { contains: query } },
          { reasoning: { contains: query } },
        ];
      }

      const emails = await prisma.email.findMany({
        where,
        orderBy: [
          { priorityScore: 'desc' },
          { receivedAt: 'desc' },
        ],
        include: {
          tasks: true,
          feedbacks: true,
        },
      });

      return res.json({ success: true, count: emails.length, data: emails });
    } catch (err: any) {
      console.error('[EmailController.getEmails]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async getEmailById(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;

      const email = await prisma.email.findFirst({
        where: { id, userId: user.id },
        include: {
          tasks: true,
          feedbacks: true,
        },
      });

      if (!email) {
        return res.status(404).json({ success: false, error: 'Email not found' });
      }

      const senderProfile = await prisma.senderProfile.findUnique({
        where: {
          userId_senderEmail: {
            userId: user.id,
            senderEmail: email.sender,
          },
        },
      });

      return res.json({
        success: true,
        data: {
          ...email,
          senderProfile,
        },
      });
    } catch (err: any) {
      console.error('[EmailController.getEmailById]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async updateEmailStatus(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;
      const { status } = req.body;

      if (!['unread', 'read', 'archived', 'snoozed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const email = await prisma.email.updateMany({
        where: { id, userId: user.id },
        data: { status },
      });

      return res.json({ success: true, data: email });
    } catch (err: any) {
      console.error('[EmailController.updateEmailStatus]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async snoozeEmail(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;
      const { snoozedUntil, snoozeReason } = req.body;

      if (!snoozedUntil) {
        return res.status(400).json({ success: false, error: 'snoozedUntil date is required' });
      }

      const email = await prisma.email.update({
        where: { id },
        data: {
          status: 'snoozed',
          snoozedUntil: new Date(snoozedUntil),
          snoozeReason: snoozeReason || 'Snoozed by user',
        },
      });

      return res.json({ success: true, data: email });
    } catch (err: any) {
      console.error('[EmailController.snoozeEmail]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async unsnoozeEmail(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;

      const email = await prisma.email.update({
        where: { id },
        data: {
          status: 'unread',
          snoozedUntil: null,
          snoozeReason: null,
        },
      });

      return res.json({ success: true, data: email });
    } catch (err: any) {
      console.error('[EmailController.unsnoozeEmail]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async updateEmailCategory(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;
      const { category } = req.body;

      if (!category || typeof category !== 'string') {
        return res.status(400).json({ success: false, error: 'Category string is required' });
      }

      await prisma.email.updateMany({
        where: { id, userId: user.id },
        data: { category: category.toLowerCase().trim() },
      });

      const updated = await prisma.email.findFirst({
        where: { id, userId: user.id },
        include: { tasks: true, feedbacks: true },
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[EmailController.updateEmailCategory]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const emailController = new EmailController();
