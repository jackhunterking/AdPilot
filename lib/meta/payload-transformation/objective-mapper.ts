/**
 * Feature: Objective Mapper
 * Purpose: Map internal goals to Meta API v24.0 campaign objectives and optimization settings
 * References:
 *  - Campaign Objectives: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group#Creating
 *  - Optimization Goals: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#optimization-goal
 */

import type {
  GoalType,
  CampaignObjective,
  OptimizationGoal,
  BillingEvent,
  BidStrategy,
  MetaCampaignPayload,
  MetaAdSetPayload
} from '../types/publishing';
import { GOAL_TO_OBJECTIVE_MAP } from '../config/publishing-config';

// ============================================================================
// TYPES
// ============================================================================

export interface ObjectiveMapping {
  campaign: {
    objective: CampaignObjective;
    special_ad_categories: string[];
  };
  adset: {
    optimization_goal: OptimizationGoal;
    billing_event: BillingEvent;
    bid_strategy: BidStrategy;
  };
}

export interface GoalData {
  selectedGoal?: GoalType;
  formData?: Record<string, unknown> | null;
  status?: string;
}

// ============================================================================
// OBJECTIVE MAPPER CLASS
// ============================================================================

export class ObjectiveMapper {
  /**
   * Map goal to Meta objective and optimization settings
   */
  mapGoalToObjective(goal: GoalType): ObjectiveMapping {
    const mapping = GOAL_TO_OBJECTIVE_MAP[goal];

    if (!mapping) {
      throw new Error(`Unsupported goal type: ${goal}`);
    }

    return {
      campaign: {
        objective: mapping.objective,
        special_ad_categories: [] // Empty for now, would add HOUSING, EMPLOYMENT, CREDIT if needed
      },
      adset: {
        optimization_goal: mapping.optimization_goal,
        billing_event: mapping.billing_event,
        bid_strategy: mapping.bid_strategy
      }
    };
  }

  /**
   * Extract goal from campaign goal_data
   */
  extractGoalFromData(goalData: unknown): GoalType | null {
    if (!goalData || typeof goalData !== 'object') {
      return null;
    }

    const data = goalData as GoalData;
    return data.selectedGoal || null;
  }

  /**
   * Validate goal type
   */
  isValidGoal(goal: unknown): goal is GoalType {
    return goal === 'leads' || goal === 'website-visits' || goal === 'calls';
  }

  /**
   * Get available goals
   */
  getAvailableGoals(): readonly GoalType[] {
    return ['leads', 'website-visits', 'calls'] as const;
  }

  /**
   * Apply objective to campaign payload
   */
  applyCampaignObjective(
    payload: Partial<MetaCampaignPayload>,
    goal: GoalType
  ): MetaCampaignPayload {
    const mapping = this.mapGoalToObjective(goal);

    return {
      name: payload.name || 'Campaign',
      status: payload.status || 'PAUSED',
      ...payload,
      objective: mapping.campaign.objective,
      special_ad_categories: mapping.campaign.special_ad_categories
    };
  }

  /**
   * Apply optimization settings to adset payload
   */
  applyAdSetOptimization(
    payload: Partial<MetaAdSetPayload>,
    goal: GoalType
  ): Partial<MetaAdSetPayload> {
    const mapping = this.mapGoalToObjective(goal);

    return {
      ...payload,
      optimization_goal: mapping.adset.optimization_goal,
      billing_event: mapping.adset.billing_event,
      bid_strategy: mapping.adset.bid_strategy
    };
  }

  /**
   * Get objective description for user display
   */
  getObjectiveDescription(goal: GoalType): string {
    const descriptions: Record<GoalType, string> = {
      leads: 'Generate leads through Meta Lead Ads or website conversions',
      'website-visits': 'Drive traffic to your website or landing page',
      calls: 'Encourage phone calls to your business'
    };

    return descriptions[goal] || 'Unknown objective';
  }

  /**
   * Get optimization description
   */
  getOptimizationDescription(goal: GoalType): string {
    const descriptions: Record<GoalType, string> = {
      leads: 'Optimized for lead generation - Meta will show your ad to people likely to fill out forms',
      'website-visits': 'Optimized for link clicks - Meta will show your ad to people likely to click through',
      calls: 'Optimized for link clicks with call action - Meta will show your ad to people likely to call'
    };

    return descriptions[goal] || 'Standard optimization';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an objective mapper instance
 */
export function createObjectiveMapper(): ObjectiveMapper {
  return new ObjectiveMapper();
}

/**
 * Quick map goal to objective
 */
export function mapGoal(goal: GoalType): ObjectiveMapping {
  const mapper = new ObjectiveMapper();
  return mapper.mapGoalToObjective(goal);
}

/**
 * Extract goal from campaign_states.goal_data
 */
export function extractGoal(goalData: unknown): GoalType | null {
  const mapper = new ObjectiveMapper();
  return mapper.extractGoalFromData(goalData);
}

/**
 * Check if value is a valid goal
 */
export function isGoal(value: unknown): value is GoalType {
  const mapper = new ObjectiveMapper();
  return mapper.isValidGoal(value);
}

