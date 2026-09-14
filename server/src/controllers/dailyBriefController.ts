import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';

export class DailyBriefController {
  public async getDailyBrief(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Fetch active emails
      const activeEmails = await prisma.email.findMany({
        where: {
          userId: user.id,
          status: { in: ['unread', 'read'] },
        },
        orderBy: { priorityScore: 'desc' },
      });

      // Fetch pending tasks
      const pendingTasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          status: { in: ['todo', 'in_progress'] },
        },
        include: {
          sourceEmail: true,
        },
        orderBy: { deadline: 'asc' },
      });

      // Calculate brief metrics
      const hotspotEmails = activeEmails.filter((e) => e.priorityTier === 'hotspot');
      const importantEmails = activeEmails.filter((e) => e.priorityTier === 'important');
      const actionRequiredEmails = activeEmails.filter((e) => e.requiresAction);
      
      const deadlinesToday = activeEmails.filter((e) => {
        if (!e.deadline) return false;
        const d = new Date(e.deadline);
        return d >= now && d <= next24h;
      });

      const tasksDueToday = pendingTasks.filter((t) => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        return d >= now && d <= next24h;
      });

      const pendingApprovals = activeEmails.filter((e) => e.intent === 'approval_needed');

      // Synthesize high-level AI digest sentence
      let headline = '';
      if (hotspotEmails.length > 0) {
        headline = `Radar Alert: ${hotspotEmails.length} critical hotspot ${hotspotEmails.length === 1 ? 'item requires' : 'items require'} immediate attention today.`;
      } else if (deadlinesToday.length > 0) {
        headline = `Good morning. You have ${deadlinesToday.length} impending ${deadlinesToday.length === 1 ? 'deadline' : 'deadlines'} closing in the next 24 hours.`;
      } else if (actionRequiredEmails.length > 0) {
        headline = `Clear skies ahead: ${actionRequiredEmails.length} action ${actionRequiredEmails.length === 1 ? 'item is' : 'items are'} queued in your Action Center.`;
      } else {
        headline = 'Inbox Zero on high-priority items. No urgent deadlines or blockers detected.';
      }

      // Top 3 urgent highlights for the briefing
      const topHighlights = hotspotEmails.slice(0, 3).map((e) => ({
        id: e.id,
        subject: e.subject,
        sender: e.senderName || e.sender,
        priorityScore: e.priorityScore,
        priorityTier: e.priorityTier,
        deadline: e.deadline,
        actionSummary: e.actionSummary || 'Review email',
        reasoning: e.reasoning,
      }));

      // If less than 3 hotspots, backfill with top important items
      if (topHighlights.length < 3) {
        const needed = 3 - topHighlights.length;
        const fill = importantEmails.slice(0, needed).map((e) => ({
          id: e.id,
          subject: e.subject,
          sender: e.senderName || e.sender,
          priorityScore: e.priorityScore,
          priorityTier: e.priorityTier,
          deadline: e.deadline,
          actionSummary: e.actionSummary || 'Review email',
          reasoning: e.reasoning,
        }));
        topHighlights.push(...fill);
      }

      // Category breakdown
      const categories: Record<string, number> = {};
      for (const e of activeEmails) {
        categories[e.category] = (categories[e.category] || 0) + 1;
      }

      return res.json({
        success: true,
        data: {
          timestamp: now.toISOString(),
          headline,
          summaryStats: {
            hotspotsCount: hotspotEmails.length,
            importantCount: importantEmails.length,
            deadlines24hCount: deadlinesToday.length + tasksDueToday.length,
            actionRequiredCount: actionRequiredEmails.length,
            pendingApprovalsCount: pendingApprovals.length,
            totalActiveCount: activeEmails.length,
          },
          topHighlights,
          categoryBreakdown: categories,
        },
      });
    } catch (err: any) {
      console.error('[DailyBriefController.getDailyBrief]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const dailyBriefController = new DailyBriefController();
