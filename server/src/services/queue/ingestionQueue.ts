import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../config/prisma';
import { llmAnalyzer } from '../llm/analyzer';
import { priorityEngine } from '../scoring/priorityEngine';
import { taskExtractorService } from '../tasks/taskExtractor';
import { SensitivityLevel } from '../../config/constants';
import { logger } from '../../utils/logger';

export interface IngestionJob {
  emailId: string;
  userId: string;
}

class IngestionQueue {
  private queue: IngestionJob[] = [];
  private isProcessing = false;
  private listeners: ((event: { type: string; data: any }) => void)[] = [];

  // BullMQ instances (active when REDIS_URL is configured)
  private bullQueue: Queue<IngestionJob> | null = null;
  private bullWorker: Worker<IngestionJob> | null = null;
  private isRedisActive = false;

  constructor() {
    this.initRedisQueue();
  }

  private initRedisQueue() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl || redisUrl.trim() === '') {
      logger.info('[IngestionQueue] No REDIS_URL configured. Running in-memory queue engine.');
      return;
    }

    try {
      const redisConnection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          if (times > 5) return null; // stop retrying after 5 attempts and fall back to in-memory
          return Math.min(times * 500, 2000);
        },
      });

      redisConnection.on('error', (err) => {
        logger.warn({ err: err.message }, '[IngestionQueue] Redis connection error, falling back to in-memory queue.');
        this.isRedisActive = false;
      });

      redisConnection.on('ready', () => {
        logger.info('[IngestionQueue] Redis connected successfully. Distributed BullMQ queue active.');
        this.isRedisActive = true;
      });

      this.bullQueue = new Queue<IngestionJob>('mailradar-email-ingestion', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });

      this.bullWorker = new Worker<IngestionJob>(
        'mailradar-email-ingestion',
        async (job: Job<IngestionJob>) => {
          await this.processEmail(job.data.emailId, job.data.userId);
        },
        {
          connection: redisConnection,
          concurrency: 5,
        }
      );

      this.bullWorker.on('completed', (job) => {
        logger.debug({ jobId: job.id, emailId: job.data.emailId }, '[IngestionQueue] BullMQ job completed.');
      });

      this.bullWorker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err }, '[IngestionQueue] BullMQ job failed.');
      });
    } catch (err) {
      logger.warn({ err }, '[IngestionQueue] Failed to initialize BullMQ, using in-memory engine.');
      this.isRedisActive = false;
    }
  }

  public async addJob(job: IngestionJob) {
    if (this.isRedisActive && this.bullQueue) {
      try {
        await this.bullQueue.add('process-email', job);
        this.notify({ type: 'JOB_ADDED', data: job });
        return;
      } catch (err) {
        logger.warn({ err }, '[IngestionQueue] Failed to enqueue to Redis. Falling back to in-memory.');
      }
    }

    // In-memory queue fallback
    this.queue.push(job);
    this.notify({ type: 'JOB_ADDED', data: job });
    this.processNext();
  }

  public subscribe(listener: (event: { type: string; data: any }) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(event: { type: string; data: any }) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error({ err }, '[IngestionQueue] Listener notification error');
      }
    }
  }

  public async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    if (!job) {
      this.isProcessing = false;
      return;
    }

    try {
      await this.processEmail(job.emailId, job.userId);
    } catch (err) {
      logger.error({ err, emailId: job.emailId }, '[IngestionQueue] Error processing email');
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  public async processEmail(emailId: string, userId: string) {
    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      logger.warn({ emailId }, '[IngestionQueue] Email not found');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const sensitivity = (user?.sensitivity as SensitivityLevel) || 'balanced';

    // 1. Fetch or create SenderProfile
    let senderProfile = await prisma.senderProfile.findUnique({
      where: {
        userId_senderEmail: {
          userId,
          senderEmail: email.sender,
        },
      },
    });

    if (!senderProfile) {
      senderProfile = await prisma.senderProfile.create({
        data: {
          userId,
          senderEmail: email.sender,
          senderName: email.senderName || null,
          importanceScore: 50.0,
          isVip: false,
          totalEmails: 1,
        },
      });
    } else {
      senderProfile = await prisma.senderProfile.update({
        where: { id: senderProfile.id },
        data: {
          totalEmails: { increment: 1 },
          lastInteractionAt: new Date(),
        },
      });
    }

    // 2. Run LLM Analysis Engine
    const llmResult = await llmAnalyzer.analyzeEmail({
      sender: email.sender,
      senderName: email.senderName || undefined,
      subject: email.subject,
      body: email.bodyFull || email.bodySnippet,
      receivedAt: email.receivedAt,
    });

    // 3. Run Priority Scoring Engine
    const scoringResult = priorityEngine.calculateScore(
      llmResult,
      {
        importanceScore: senderProfile.importanceScore,
        isVip: senderProfile.isVip,
        totalEmails: senderProfile.totalEmails,
      },
      sensitivity,
      email.receivedAt
    );

    // 4. Update Email Record with LLM & Scoring Enriched Data
    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        category: llmResult.category,
        intent: llmResult.intent,
        urgency: llmResult.urgency,
        requiresAction: llmResult.requires_action,
        deadline: llmResult.deadline ? new Date(llmResult.deadline) : null,
        actionSummary: llmResult.action_summary || null,
        priorityScore: scoringResult.priorityScore,
        priorityTier: scoringResult.priorityTier,
        reasoning: scoringResult.reasoning,
        scoreBreakdown: JSON.stringify(scoringResult.scoreBreakdown),
      },
    });

    // 5. Task Extraction Pipeline
    let createdTask = null;
    if (llmResult.requires_action) {
      createdTask = await taskExtractorService.autoCreateTaskFromEmail(
        {
          id: email.id,
          userId,
          subject: email.subject,
          bodySnippet: email.bodySnippet,
        },
        llmResult,
        scoringResult.priorityTier
      );
    }

    this.notify({
      type: 'EMAIL_PROCESSED',
      data: {
        email: updatedEmail,
        task: createdTask,
      },
    });

    logger.info(
      {
        subject: email.subject,
        tier: scoringResult.priorityTier.toUpperCase(),
        score: scoringResult.priorityScore,
      },
      `[IngestionQueue] Processed email "${email.subject}" -> Tier: ${scoringResult.priorityTier.toUpperCase()} (${scoringResult.priorityScore})`
    );
  }
}

export const ingestionQueue = new IngestionQueue();
