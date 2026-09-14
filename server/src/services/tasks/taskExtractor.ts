import { prisma } from '../../config/prisma';
import { LLMAnalysisResult } from '../llm/prompts';

export interface ExtractedTaskData {
  userId: string;
  sourceEmailId?: string;
  title: string;
  description?: string;
  deadline?: Date | null;
  priority?: string;
}

export class TaskExtractorService {
  /**
   * Auto-creates a task when an email requires action
   */
  public async autoCreateTaskFromEmail(
    email: {
      id: string;
      userId: string;
      subject: string;
      bodySnippet: string;
    },
    llmResult: LLMAnalysisResult,
    priorityTier: string
  ) {
    if (!llmResult.requires_action) {
      return null;
    }

    const fullText = `${email.subject} ${email.bodySnippet} ${llmResult.action_summary || ''} ${llmResult.reasoning || ''}`.toLowerCase();

    // STRICT GUARD: Never extract tasks for OTP, verification, password resets, security alerts, or spam
    const isOtpOrSpam =
      /\botp\b/.test(fullText) ||
      /verification (?:code|otp|pin|email)/.test(fullText) ||
      /verify (?:your|email|account)/.test(fullText) ||
      /enter verification/.test(fullText) ||
      /authenticat(?:e|ion)/.test(fullText) ||
      /password reset|reset (?:your )?password/.test(fullText) ||
      /security (?:code|alert|notice|pin)/.test(fullText) ||
      /login (?:code|alert|pin|attempt)/.test(fullText) ||
      /sign-in (?:code|attempt)/.test(fullText) ||
      /\b2fa\b|two-factor|passcode/.test(fullText) ||
      /confirm (?:your )?(?:account|email)/.test(fullText) ||
      /please anyone help me/.test(fullText);

    if (isOtpOrSpam) {
      return null;
    }

    // STRICT GUARD: If deadline has already passed, do not create task on board
    const deadline = llmResult.deadline ? new Date(llmResult.deadline) : null;
    if (deadline && !isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
      return null;
    }

    // Check if task already exists for this email
    const existingTask = await prisma.task.findFirst({
      where: {
        userId: email.userId,
        sourceEmailId: email.id,
      },
    });

    if (existingTask) {
      return existingTask;
    }

    const rawTitle = llmResult.action_summary || email.subject;
    const cleanTitle = rawTitle
      .replace(/^(?:Review\s+(?:job\s+)?details\s*(?:and\s+submit\s+application)?|Action\s+(?:needed|required|item)|Deliverable|Task)\s*:\s*/i, '')
      .replace(/\[(?:TG\s*@[a-zA-Z0-9_]+|TG|[a-zA-Z0-9_\s@\.-]+)\]\s*/gi, '')
      .replace(/^[\s🚀🔥⚡📌👉•\-\*]+\s*/u, '')
      .replace(/\s+/g, ' ')
      .trim() || email.subject;

    // Map email urgency/tier to task priority
    let taskPriority = 'medium';
    if (priorityTier === 'hotspot' || llmResult.urgency === 'critical') {
      taskPriority = 'critical';
    } else if (priorityTier === 'important' || llmResult.urgency === 'high') {
      taskPriority = 'high';
    } else if (llmResult.urgency === 'low') {
      taskPriority = 'low';
    }

    const task = await prisma.task.create({
      data: {
        userId: email.userId,
        sourceEmailId: email.id,
        title: cleanTitle,
        description: llmResult.reasoning || null,
        deadline,
        status: 'todo',
        priority: taskPriority,
        reminderSent: false,
      },
    });

    return task;
  }

  /**
   * Manual task creation
   */
  public async createTask(data: ExtractedTaskData) {
    return prisma.task.create({
      data: {
        userId: data.userId,
        sourceEmailId: data.sourceEmailId || null,
        title: data.title,
        description: data.description || null,
        deadline: data.deadline || null,
        priority: data.priority || 'medium',
        status: 'todo',
      },
      include: {
        sourceEmail: {
          select: {
            id: true,
            subject: true,
            sender: true,
            senderName: true,
            priorityTier: true,
          },
        },
      },
    });
  }

  /**
   * Update task status (Kanban transitions)
   */
  public async updateTaskStatus(taskId: string, userId: string, status: 'todo' | 'in_progress' | 'done') {
    return prisma.task.updateMany({
      where: { id: taskId, userId },
      data: { status },
    });
  }

  /**
   * Update task details (title, deadline, priority, description)
   */
  public async updateTask(
    taskId: string,
    userId: string,
    data: { title?: string; description?: string; deadline?: Date | null; priority?: string; status?: string }
  ) {
    return prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        sourceEmail: true,
      },
    });
  }

  /**
   * Delete a task
   */
  public async deleteTask(taskId: string, userId: string) {
    return prisma.task.deleteMany({
      where: { id: taskId, userId },
    });
  }
}

export const taskExtractorService = new TaskExtractorService();
