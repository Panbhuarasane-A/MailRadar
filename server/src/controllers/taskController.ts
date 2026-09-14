import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';
import { taskExtractorService } from '../services/tasks/taskExtractor';

export class TaskController {
  public async getTasks(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { status } = req.query;

      const now = new Date();

      // Automatically purge OTP, password reset, spam tasks and tasks with expired deadlines
      try {
        await prisma.task.deleteMany({
          where: {
            userId: user.id,
            OR: [
              { title: { contains: 'OTP' } },
              { title: { contains: 'otp' } },
              { title: { contains: 'verification' } },
              { title: { contains: 'Verification' } },
              { title: { contains: 'authenticate' } },
              { title: { contains: 'Authenticate' } },
              { title: { contains: 'password reset' } },
              { title: { contains: 'Password reset' } },
              { title: { contains: 'passcode' } },
              { title: { contains: '2FA' } },
              { title: { contains: 'anyone help me' } },
              {
                deadline: {
                  lt: now,
                },
              },
            ],
          },
        });
      } catch (cleanupErr) {
        console.warn('[TaskController.getTasks] Auto-cleanup warning:', cleanupErr);
      }

      const where: any = { userId: user.id };
      if (status && status !== 'all') {
        where.status = String(status);
      }

      const rawTasks = await prisma.task.findMany({
        where,
        orderBy: [
          { deadline: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          sourceEmail: {
            select: {
              id: true,
              subject: true,
              sender: true,
              senderName: true,
              priorityTier: true,
              priorityScore: true,
            },
          },
        },
      });

      // Filter in-memory for comprehensive safety
      const filteredTasks = rawTasks.filter((task) => {
        const text = `${task.title} ${task.description || ''} ${task.sourceEmail?.subject || ''}`.toLowerCase();
        
        const isSpamOrOtp =
          /\botp\b/.test(text) ||
          /verification (?:code|otp|pin)/.test(text) ||
          /verify (?:your|account|email)/.test(text) ||
          /enter verification/.test(text) ||
          /authenticat(?:e|ion)/.test(text) ||
          /password reset|reset (?:your )?password/.test(text) ||
          /security (?:code|alert|notice|pin)/.test(text) ||
          /login (?:code|pin|alert|attempt)/.test(text) ||
          /sign-in (?:code|attempt)/.test(text) ||
          /\b2fa\b|two-factor|passcode/.test(text) ||
          /confirm (?:your )?(?:account|email)/.test(text) ||
          /please anyone help me/.test(text);

        if (isSpamOrOtp) return false;

        if (task.deadline) {
          const dl = new Date(task.deadline);
          if (!isNaN(dl.getTime()) && dl.getTime() < now.getTime()) {
            return false;
          }
        }

        return true;
      });

      return res.json({ success: true, count: filteredTasks.length, data: filteredTasks });
    } catch (err: any) {
      console.error('[TaskController.getTasks]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async createTask(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { title, description, deadline, priority, sourceEmailId } = req.body;

      if (!title || String(title).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Title is required' });
      }

      const task = await taskExtractorService.createTask({
        userId: user.id,
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || 'medium',
        sourceEmailId,
      });

      return res.status(201).json({ success: true, data: task });
    } catch (err: any) {
      console.error('[TaskController.createTask]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async updateTaskStatus(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;
      const { status } = req.body;

      if (!['todo', 'in_progress', 'done'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      await taskExtractorService.updateTaskStatus(id, user.id, status as any);
      return res.json({ success: true, message: `Task status updated to ${status}` });
    } catch (err: any) {
      console.error('[TaskController.updateTaskStatus]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async updateTask(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;
      const { title, description, deadline, priority, status } = req.body;

      const updated = await taskExtractorService.updateTask(id, user.id, {
        title,
        description,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        priority,
        status,
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[TaskController.updateTask]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async deleteTask(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { id } = req.params;

      await taskExtractorService.deleteTask(id, user.id);
      return res.json({ success: true, message: 'Task deleted' });
    } catch (err: any) {
      console.error('[TaskController.deleteTask]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const taskController = new TaskController();
