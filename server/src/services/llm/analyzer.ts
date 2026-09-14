import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { buildAnalysisPrompt, LLMAnalysisResult } from './prompts';

const AnalysisSchema = z.object({
  category: z.enum(['work', 'finance', 'academic', 'personal', 'promotional', 'other']),
  intent: z.enum(['request', 'fyi', 'meeting_invite', 'approval_needed', 'complaint', 'deadline_notice', 'other']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  requires_action: z.boolean(),
  deadline: z.string().nullable().optional(),
  action_summary: z.string().nullable().optional(),
  reasoning: z.string(),
  financial_or_professional_stakes: z.enum(['none', 'moderate', 'high', 'critical']).optional(),
});

export class LLMAnalyzer {
  private anthropic: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && !apiKey.startsWith('your_')) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  public async analyzeEmail(email: {
    sender: string;
    senderName?: string;
    subject: string;
    body: string;
    receivedAt: Date;
  }): Promise<LLMAnalysisResult> {
    if (this.anthropic) {
      try {
        const prompt = buildAnalysisPrompt(email);
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 800,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }],
        });

        const textContent = response.content[0]?.type === 'text' ? response.content[0].text : '';
        const cleaned = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const validated = AnalysisSchema.parse(parsed);

        return {
          category: validated.category,
          intent: validated.intent,
          urgency: validated.urgency,
          requires_action: validated.requires_action,
          deadline: validated.deadline || null,
          action_summary: validated.action_summary || null,
          reasoning: validated.reasoning,
          financial_or_professional_stakes: validated.financial_or_professional_stakes || 'none',
        };
      } catch (err) {
        console.warn('[LLMAnalyzer] Anthropic API failed or returned invalid JSON. Falling back to heuristic analyzer:', err);
      }
    }

    // Heuristic Fallback Analyzer (Zero-API-key instant execution)
    return this.heuristicAnalysis(email);
  }

  /**
   * Rule-based intelligence fallback providing rich explainability when offline or without API keys.
   */
  private heuristicAnalysis(email: {
    sender: string;
    senderName?: string;
    subject: string;
    body: string;
    receivedAt: Date;
  }): LLMAnalysisResult {
    const text = `${email.subject} ${email.body}`.toLowerCase();
    const sender = email.sender.toLowerCase();

    // 0. Security Verification Codes, OTPs & Password Reset Emails (CRITICAL HOTSPOT)
    if (
      /verification\s*code|one-time\s*password|\botp\b|security\s*code|password\s*reset|reset\s*your\s*password|login\s*code|passcode|2fa|two-factor|sign-in\s*attempt|temporary\s*security\s*link|confirm\s*your\s*email|authentication\s*code/i.test(
        text
      )
    ) {
      const otpMatch = text.match(/\b\d{4,8}\b/);
      const otpCode = otpMatch ? otpMatch[0] : '';
      const isPasswordReset = /password\s*reset|reset\s*your\s*password/i.test(text);
      const expiryMinutes = isPasswordReset ? 60 : 10;
      const expiryDate = new Date(email.receivedAt.getTime() + expiryMinutes * 60 * 1000).toISOString();

      return {
        category: 'work',
        intent: 'request',
        urgency: 'critical',
        requires_action: true,
        deadline: expiryDate,
        action_summary: isPasswordReset
          ? 'Complete password reset via secure link before expiration'
          : otpCode
          ? `Enter verification OTP code ${otpCode} to authenticate`
          : 'Enter verification OTP code to authenticate sign-in',
        reasoning: isPasswordReset
          ? 'Time-sensitive security password reset request with short expiration window requiring immediate action.'
          : `High-priority time-sensitive authentication OTP verification code${
              otpCode ? ` (${otpCode})` : ''
            } expiring in ${expiryMinutes} minutes.`,
        financial_or_professional_stakes: 'high',
      };
    }

    // 1. Campus Placement Drives: Haveloc / St. Joseph's Institute of Technology (CRITICAL HOTSPOT)
    if (/haveloc|stjoseph|st\s*joseph|on-campus\s+placement|campus\s+drive|placement\s+drive/i.test(text) || /haveloc/i.test(sender)) {
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      return {
        category: 'work',
        intent: 'deadline_notice',
        urgency: 'critical',
        requires_action: true,
        deadline: extractedDeadline,
        action_summary: `Complete placement drive application: ${email.subject.slice(0, 50)}`,
        reasoning: 'Critical St. Joseph / Haveloc on-campus placement drive deliverable requiring immediate registration and action.',
        financial_or_professional_stakes: 'critical',
      };
    }

    // 2. Telegram Channel Job Postings, Off-Campus Drives & Batch Hiring Alerts (HIGH PRIORITY)
    if (
      /telegram/i.test(sender) ||
      /\[telegram job\]/i.test(email.subject) ||
      (/#hiring|#job|#offcampus|apply\s+link|batch\s*:\s*202|eligibility\s*:|ctc\s*:|stipend\s*:/i.test(text) && /apply|link|registration|form/i.test(text))
    ) {
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      return {
        category: 'work',
        intent: 'request',
        urgency: 'high',
        requires_action: true,
        deadline: extractedDeadline,
        action_summary: `Review job details and submit application: ${email.subject.replace(/\[telegram job\]\s*/i, '').slice(0, 50)}`,
        reasoning: 'High-priority job opening posted in Telegram channel with active application instructions.',
        financial_or_professional_stakes: 'high',
      };
    }

    // 3. Unstop Competitions, Contests, Hackathons & Challenges (CRITICAL / HIGH HOTSPOT)
    if (/unstop|treasure\s+hunt|epic\s*8\.0|contest|competition|hackathon|it\s+challenge|round\s+is\s+live|hours\s+left\s+to\s+attempt|final\s+call\s+to\s+attempt/i.test(text) || /unstop/i.test(sender)) {
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      const isImminent = /two\s+hours|final\s+call|round\s+is\s+live|few\s+hours|today/i.test(text);

      return {
        category: 'work',
        intent: 'request',
        urgency: isImminent ? 'critical' : 'high',
        requires_action: true,
        deadline: extractedDeadline,
        action_summary: `Attempt contest / competition round: ${email.subject.slice(0, 50)}`,
        reasoning: 'High-priority Unstop contest round or competition challenge requiring active participation.',
        financial_or_professional_stakes: 'high',
      };
    }

    // 3. Career Page, Job Application Status & Interview Updates (HIGH PRIORITY)
    if (/air\s+india|application\s+status|registration\s+incomplete|application\s+window\s+is\s+live|pre-placement\s+interview|assessment\s+link|interview\s+call|shortlisted/i.test(text)) {
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      return {
        category: 'work',
        intent: 'request',
        urgency: 'high',
        requires_action: true,
        deadline: extractedDeadline,
        action_summary: `Check application status / complete registration: ${email.subject.slice(0, 50)}`,
        reasoning: 'Direct career portal update regarding your active job/internship application.',
        financial_or_professional_stakes: 'high',
      };
    }

    // 4. LinkedIn Notifications, Social Feeds & Promotional Newsletters (FILTERED / LOW PRIORITY)
    if (
      /linkedin|duolingo/i.test(sender) ||
      /impressions\s+last\s+week|i\s+want\s+to\s+connect|conversations\s+in|duoversary|aptitude\s+skills|fresher\s+jobs\s+in|top\s+openings\s+for/i.test(text)
    ) {
      return {
        category: 'promotional',
        intent: 'fyi',
        urgency: 'low',
        requires_action: false,
        deadline: null,
        action_summary: null,
        reasoning: 'Automated LinkedIn or job alert digest; no user action needed.',
        financial_or_professional_stakes: 'none',
      };
    }

    // 5. Critical incidents & urgent outages
    if (
      /urgent\s+security|critical|outage|downtime|incident|security\s+alert|breach|compromised|emergency|failed\s+pipeline|server\s+down/i.test(text)
    ) {
      return {
        category: 'work',
        intent: /complaint|alert/i.test(text) ? 'complaint' : 'deadline_notice',
        urgency: 'critical',
        requires_action: true,
        deadline: null,
        action_summary: `Investigate and resolve critical incident: ${email.subject.slice(0, 50)}`,
        reasoning: 'Critical system alert or urgent emergency requiring immediate review and mitigation.',
        financial_or_professional_stakes: 'critical',
      };
    }

    // 2. Financial Invoices, Authorizations, Wire Transfers & Approvals (Checked before promo)
    if (/invoice|wire\s+transfer|receipt|payroll|expense\s+report|billing|due\s+amount|contract\s+renewal|dual-authorization|dual-sign|executive\s+sign-off/i.test(text)) {
      const isApproval = /approve|authorization|sign-off|dual-sign|dual-authorization|review\s+invoice|sign\s+today|action\s+required/i.test(text);
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      const isCriticalOrHigh = isApproval || /urgent|today|immediate/i.test(text);

      return {
        category: 'finance',
        intent: isApproval ? 'approval_needed' : 'fyi',
        urgency: isCriticalOrHigh ? 'high' : 'medium',
        requires_action: isApproval,
        deadline: extractedDeadline,
        action_summary: isApproval ? `Authorize financial payment / contract: ${email.subject.slice(0, 50)}` : null,
        reasoning: isApproval
          ? 'Urgent executive sign-off required for high-value financial contract before deadline.'
          : 'Financial billing notice or transaction receipt for your records.',
        financial_or_professional_stakes: 'high',
      };
    }

    // 3. Promotional / Marketing detection
    if (
      (/unsubscribe/i.test(text) && /marketing|newsletter|promo|deal|coupon|sale|shop\s+now|black\s+friday/i.test(text)) ||
      /marketing|newsletter|promo|no-reply|noreply|deals/i.test(sender)
    ) {
      return {
        category: 'promotional',
        intent: 'fyi',
        urgency: 'low',
        requires_action: false,
        deadline: null,
        action_summary: null,
        reasoning: 'Marketing or promotional announcement detected with unsubscribe link; no user action required.',
        financial_or_professional_stakes: 'none',
      };
    }

    // 4. Meeting Invites & Scheduling
    if (/meeting\s+invitation|invite:|zoom\.us|meet\.google|teams\.microsoft|reschedule|sync\s+call|calendar\s+invite/i.test(text)) {
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      return {
        category: 'work',
        intent: 'meeting_invite',
        urgency: 'medium',
        requires_action: true,
        deadline: extractedDeadline,
        action_summary: 'Accept or decline calendar invitation and prepare agenda',
        reasoning: 'Direct calendar invitation or meeting schedule coordination request.',
        financial_or_professional_stakes: 'moderate',
      };
    }

    // 5. Approvals & Work Requests / Design Reviews
    if (/please\s+approve|approval\s+needed|review\s+and\s+sign|feedback\s+required|please\s+review|by\s+eod|action\s+required|review\s+by|leave\s+comments|submit\s+your/i.test(text)) {
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      const isHighUrgency = /asap|today|eod|tomorrow|immediately|urgent/i.test(text);

      return {
        category: 'work',
        intent: /approve|authorization/i.test(text) ? 'approval_needed' : 'request',
        urgency: isHighUrgency ? 'high' : 'medium',
        requires_action: true,
        deadline: extractedDeadline,
        action_summary: `Review requested deliverables for: ${email.subject.slice(0, 60)}`,
        reasoning: 'Direct request requiring review, feedback, or actionable sign-off from sender.',
        financial_or_professional_stakes: 'moderate',
      };
    }

    // 6. Academic / Research
    if (/thesis|submission|paper\s+review|grading|course|lecture|exam|university|research|manuscript|ieee/i.test(text)) {
      const extractedDeadline = this.extractDeadlineHeuristic(email.body, email.receivedAt);
      const requiresAction = /submit|review|grade|feedback|address\s+the|minor\s+annotations/i.test(text);
      return {
        category: 'academic',
        intent: requiresAction ? 'request' : 'fyi',
        urgency: requiresAction ? 'high' : 'medium',
        requires_action: requiresAction,
        deadline: extractedDeadline,
        action_summary: requiresAction ? `Submit revisions for ${email.subject.slice(0, 50)}` : null,
        reasoning: 'Academic or research correspondence regarding publication deliverables and review notes.',
        financial_or_professional_stakes: 'moderate',
      };
    }

    // 7. General Default
    const hasQuestion = /\?|could\s+you|can\s+you|let\s+me\s+know|what\s+do\s+you\s+think/i.test(text);
    return {
      category: 'work',
      intent: hasQuestion ? 'request' : 'fyi',
      urgency: hasQuestion ? 'medium' : 'low',
      requires_action: hasQuestion,
      deadline: null,
      action_summary: hasQuestion ? `Respond to sender regarding ${email.subject.slice(0, 50)}` : null,
      reasoning: hasQuestion
        ? 'Sender asks an inquiry or requests your input on this topic.'
        : 'Informational message received with no explicit immediate action item.',
      financial_or_professional_stakes: 'none',
    };
  }

  /**
   * Helper to extract explicit dates/deadlines without fabricating.
   */
  private extractDeadlineHeuristic(content: string, baseDate: Date): string | null {
    const text = content.toLowerCase();
    
    // Check "by tomorrow" or "before 6pm tomorrow" or "due tomorrow"
    if (/(?:by|due|before).*?tomorrow/i.test(text)) {
      const target = new Date(baseDate);
      target.setDate(target.getDate() + 1);
      target.setHours(17, 0, 0, 0); // 5 PM default
      return target.toISOString();
    }

    // Check "by today EOD", "before 5:00 PM today", "before 6:00 PM today", "due today"
    if (/(?:by|due|before).*?(?:today|eod|end of day)/i.test(text)) {
      const target = new Date(baseDate);
      const timeMatch = text.match(/(?:before|by|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s+today/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const isPm = timeMatch[3].toLowerCase() === 'pm';
        if (isPm && hour < 12) hour += 12;
        if (!isPm && hour === 12) hour = 0;
        target.setHours(hour, minute, 0, 0);
      } else {
        target.setHours(18, 0, 0, 0); // 6 PM
      }
      return target.toISOString();
    }

    // Check "by Friday noon", "by Thursday 5 PM", "by Thursday", etc.
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = text.match(/(?:by|due|before|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|noon))?/i);
    if (dayMatch && dayMatch[1]) {
      const targetDayIndex = days.indexOf(dayMatch[1].toLowerCase());
      if (targetDayIndex !== -1) {
        const currentDayIndex = baseDate.getDay();
        let diff = targetDayIndex - currentDayIndex;
        if (diff <= 0) diff += 7; // Next occurrence
        const target = new Date(baseDate);
        target.setDate(target.getDate() + diff);

        if (dayMatch[4] === 'noon') {
          target.setHours(12, 0, 0, 0);
        } else if (dayMatch[2]) {
          let hour = parseInt(dayMatch[2], 10);
          const minute = dayMatch[3] ? parseInt(dayMatch[3], 10) : 0;
          const isPm = dayMatch[4]?.toLowerCase() === 'pm';
          if (isPm && hour < 12) hour += 12;
          if (!isPm && hour === 12) hour = 0;
          target.setHours(hour, minute, 0, 0);
        } else {
          target.setHours(17, 0, 0, 0);
        }
        return target.toISOString();
      }
    }

    // Strict rule: If no explicit deadline detected, return null
    return null;
  }
}

export const llmAnalyzer = new LLMAnalyzer();
