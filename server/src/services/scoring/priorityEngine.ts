import { SENSITIVITY_THRESHOLDS, SensitivityLevel, PriorityTier, DEFAULT_SCORING_WEIGHTS } from '../../config/constants';
import { LLMAnalysisResult } from '../llm/prompts';

export interface ScoreFactorBreakdown {
  deadlineProximityScore: number; // 0 - 100
  senderImportanceScore: number;  // 0 - 100
  actionRequirementScore: number; // 0 - 100
  urgencyStakesScore: number;     // 0 - 100
  interactionHistoryScore: number;// 0 - 100
  finalCalculatedScore: number;   // 0 - 100
  weightsApplied: typeof DEFAULT_SCORING_WEIGHTS;
}

export interface PriorityCalculationResult {
  priorityScore: number;
  priorityTier: PriorityTier;
  reasoning: string;
  scoreBreakdown: ScoreFactorBreakdown;
}

export class PriorityScoringEngine {
  /**
   * Calculates the priority score and tier with explainability
   */
  public calculateScore(
    llmResult: LLMAnalysisResult,
    senderProfile: { importanceScore: number; isVip: boolean; totalEmails?: number } | null,
    sensitivity: SensitivityLevel = 'balanced',
    now: Date = new Date()
  ): PriorityCalculationResult {
    const weights = DEFAULT_SCORING_WEIGHTS;

    // Factor 1: Deadline Proximity (0 - 100)
    let deadlineScore = 0;
    let deadlineReasonPart = '';
    if (llmResult.deadline) {
      const deadlineDate = new Date(llmResult.deadline);
      const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDeadline >= -24 && hoursUntilDeadline <= 4) {
        deadlineScore = 100; // Imminent or closing today
        deadlineReasonPart = 'Imminent deadline within hours';
      } else if (hoursUntilDeadline <= 24) {
        deadlineScore = 90; // Due today/tomorrow
        deadlineReasonPart = 'Due within 24 hours';
      } else if (hoursUntilDeadline <= 48) {
        deadlineScore = 75;
        deadlineReasonPart = 'Due within 48 hours';
      } else if (hoursUntilDeadline <= 120) {
        deadlineScore = 55;
        deadlineReasonPart = 'Due this week';
      } else {
        deadlineScore = 35;
        deadlineReasonPart = 'Upcoming future deadline';
      }
    } else if (llmResult.urgency === 'critical') {
      deadlineScore = 95; // Unspecified deadline but critical emergency
      deadlineReasonPart = 'Immediate attention required';
    } else {
      deadlineScore = llmResult.requires_action ? 40 : 10;
    }

    // Factor 2: Sender Importance (0 - 100)
    let senderScore = senderProfile ? senderProfile.importanceScore : 50;
    let senderReasonPart = '';
    if (senderProfile?.isVip) {
      senderScore = 98;
      senderReasonPart = 'VIP sender';
    } else if (senderScore >= 75) {
      senderReasonPart = 'Key collaborator';
    } else if (senderScore <= 20) {
      senderReasonPart = 'Low-priority external sender';
    }

    // Factor 3: Action Requirement (0 - 100)
    let actionScore = 0;
    let actionReasonPart = '';
    if (llmResult.requires_action) {
      if (llmResult.intent === 'approval_needed' || llmResult.intent === 'complaint') {
        actionScore = 100;
        actionReasonPart = 'Requires executive approval or resolution';
      } else if (llmResult.intent === 'meeting_invite') {
        actionScore = 80;
        actionReasonPart = 'Meeting invitation awaiting response';
      } else {
        actionScore = 85;
        actionReasonPart = 'Actionable task required';
      }
    } else {
      if (llmResult.category === 'promotional') {
        actionScore = 5;
        actionReasonPart = 'Promotional FYI';
      } else {
        actionScore = 20;
        actionReasonPart = 'Informational update only';
      }
    }

    // Factor 4: Financial/Professional Stakes & Urgency (0 - 100)
    let stakesScore = 30;
    switch (llmResult.urgency) {
      case 'critical':
        stakesScore = 100;
        break;
      case 'high':
        stakesScore = 85;
        break;
      case 'medium':
        stakesScore = 55;
        break;
      case 'low':
        stakesScore = 10;
        break;
    }

    if (llmResult.financial_or_professional_stakes === 'critical') {
      stakesScore = 100;
    } else if (llmResult.financial_or_professional_stakes === 'high') {
      stakesScore = 90;
    }

    // Factor 5: Historical Interaction Pattern (0 - 100)
    let historyScore = 50;
    if (senderProfile && senderProfile.totalEmails) {
      if (senderProfile.isVip || senderProfile.totalEmails > 5) historyScore = 90;
      else if (senderProfile.totalEmails > 2) historyScore = 70;
      else historyScore = 45;
    }
    if (llmResult.category === 'promotional') {
      historyScore = 10;
    }

    // Calculate Weighted Total Score
    const calculatedScore =
      deadlineScore * weights.deadlineProximity +
      senderScore * weights.senderImportance +
      actionScore * weights.actionRequirement +
      stakesScore * weights.urgencyStakes +
      historyScore * weights.interactionHistory;

    // Normalizing between 0 and 100 with rounding
    const finalScore = Math.round(Math.min(100, Math.max(0, calculatedScore)) * 10) / 10;

    // Determine Priority Tier based on sensitivity threshold
    const thresholds = SENSITIVITY_THRESHOLDS[sensitivity] || SENSITIVITY_THRESHOLDS.balanced;
    let tier: PriorityTier = 'low';
    if (finalScore >= thresholds.hotspot) {
      tier = 'hotspot';
    } else if (finalScore >= thresholds.important) {
      tier = 'important';
    } else if (finalScore >= thresholds.normal) {
      tier = 'normal';
    } else {
      tier = 'low';
    }

    // Construct Transparent Natural-Language Reasoning
    const reasoning = this.buildReasoningString(
      tier,
      finalScore,
      llmResult,
      senderProfile?.isVip || false,
      deadlineReasonPart,
      senderReasonPart,
      actionReasonPart
    );

    const breakdown: ScoreFactorBreakdown = {
      deadlineProximityScore: deadlineScore,
      senderImportanceScore: senderScore,
      actionRequirementScore: actionScore,
      urgencyStakesScore: stakesScore,
      interactionHistoryScore: historyScore,
      finalCalculatedScore: finalScore,
      weightsApplied: weights,
    };

    return {
      priorityScore: finalScore,
      priorityTier: tier,
      reasoning,
      scoreBreakdown: breakdown,
    };
  }

  private buildReasoningString(
    tier: PriorityTier,
    score: number,
    llmResult: LLMAnalysisResult,
    isVip: boolean,
    deadlinePart: string,
    senderPart: string,
    actionPart: string
  ): string {
    const highlights: string[] = [];

    if (tier === 'hotspot') {
      if (isVip) highlights.push('VIP Sender');
      if (llmResult.urgency === 'critical') highlights.push('Critical Urgency');
      if (deadlinePart) highlights.push(deadlinePart);
      if (actionPart && llmResult.requires_action) highlights.push(actionPart);
      
      const tag = highlights.length > 0 ? `[${highlights.join(' • ')}] ` : '';
      return `${tag}${llmResult.reasoning}`;
    }

    if (tier === 'important') {
      if (isVip) highlights.push('VIP Sender');
      if (deadlinePart && deadlinePart !== 'Upcoming future deadline') highlights.push(deadlinePart);
      if (llmResult.requires_action) highlights.push('Action Required');
      
      const tag = highlights.length > 0 ? `[${highlights.join(' • ')}] ` : '';
      return `${tag}${llmResult.reasoning}`;
    }

    if (tier === 'normal') {
      return `Standard priority update. ${llmResult.reasoning}`;
    }

    // Low tier
    return `Low priority. ${llmResult.reasoning}`;
  }
}

export const priorityEngine = new PriorityScoringEngine();
