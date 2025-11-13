/**
 * Feature: Creative Strategy Mapper
 * Purpose: Map internal goals to Meta v24.0 creative strategies and configurations
 * References:
 *  - Meta Campaign Objectives: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group#objectives
 *  - Meta Optimization Goals: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#optimization-goal
 */

import type { 
  GoalType, 
  DestinationType, 
  CTAType,
  CampaignObjective,
  OptimizationGoal,
  BillingEvent,
  BidStrategy
} from '../types/publishing';
import { GOAL_TO_OBJECTIVE_MAP, CTA_TYPE_MAP, DEFAULT_CTA_BY_GOAL } from '../config/publishing-config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreativeStrategy {
  objective: CampaignObjective;
  optimization_goal: OptimizationGoal;
  billing_event: BillingEvent;
  bid_strategy: BidStrategy;
  recommendedCTAs: readonly string[];
  defaultCTA: CTAType;
  requiresLeadForm: boolean;
  requiresWebsiteUrl: boolean;
  requiresPhoneNumber: boolean;
  supportsInstagram: boolean;
  supportsFacebook: boolean;
  placementRecommendations: PlacementRecommendation;
}

export interface PlacementRecommendation {
  facebook: readonly string[];
  instagram: readonly string[];
  preferredFormat: 'feed' | 'story' | 'reel';
}

// ============================================================================
// CREATIVE STRATEGY MAPPER CLASS
// ============================================================================

export class CreativeStrategyMapper {
  /**
   * Get creative strategy for a goal and destination type
   */
  getStrategy(goal: GoalType, destinationType?: DestinationType): CreativeStrategy {
    const baseMapping = GOAL_TO_OBJECTIVE_MAP[goal];

    // Get CTA options for this goal
    const ctaOptions = CTA_TYPE_MAP[goal] || ['LEARN_MORE'];
    const defaultCTA = this.getDefaultCTA(goal, destinationType);

    // Determine requirements based on goal and destination
    const requirements = this.getRequirements(goal, destinationType);

    // Get placement recommendations
    const placements = this.getPlacementRecommendations(goal, destinationType);

    return {
      objective: baseMapping.objective,
      optimization_goal: baseMapping.optimization_goal,
      billing_event: baseMapping.billing_event,
      bid_strategy: baseMapping.bid_strategy,
      recommendedCTAs: ctaOptions,
      defaultCTA,
      requiresLeadForm: requirements.requiresLeadForm,
      requiresWebsiteUrl: requirements.requiresWebsiteUrl,
      requiresPhoneNumber: requirements.requiresPhoneNumber,
      supportsInstagram: requirements.supportsInstagram,
      supportsFacebook: requirements.supportsFacebook,
      placementRecommendations: placements
    };
  }

  /**
   * Get the default CTA for a goal and destination combination
   */
  private getDefaultCTA(goal: GoalType, destinationType?: DestinationType): CTAType {
    // Destination-specific CTAs take precedence
    if (destinationType === 'call') {
      return 'CALL_NOW';
    }

    if (destinationType === 'form') {
      return goal === 'leads' ? 'SIGN_UP' : 'LEARN_MORE';
    }

    if (destinationType === 'website') {
      if (goal === 'website-visits') return 'LEARN_MORE';
      if (goal === 'leads') return 'SIGN_UP';
      if (goal === 'calls') return 'CONTACT_US';
    }

    // Fallback to default for goal
    return DEFAULT_CTA_BY_GOAL[goal] as CTAType;
  }

  /**
   * Determine what's required for this goal/destination
   */
  private getRequirements(goal: GoalType, destinationType?: DestinationType): {
    requiresLeadForm: boolean;
    requiresWebsiteUrl: boolean;
    requiresPhoneNumber: boolean;
    supportsInstagram: boolean;
    supportsFacebook: boolean;
  } {
    return {
      requiresLeadForm: goal === 'leads' && destinationType === 'form',
      requiresWebsiteUrl: destinationType === 'website' || !destinationType,
      requiresPhoneNumber: destinationType === 'call',
      supportsInstagram: true, // All goals support Instagram
      supportsFacebook: true // All goals support Facebook
    };
  }

  /**
   * Get placement recommendations for optimal performance
   */
  private getPlacementRecommendations(
    goal: GoalType,
    destinationType?: DestinationType
  ): PlacementRecommendation {
    // Lead generation performs best in feed
    if (goal === 'leads') {
      return {
        facebook: ['feed', 'marketplace', 'video_feeds'],
        instagram: ['stream', 'explore'],
        preferredFormat: 'feed'
      };
    }

    // Website visits can use all placements
    if (goal === 'website-visits') {
      return {
        facebook: ['feed', 'instant_article', 'marketplace', 'video_feeds', 'story'],
        instagram: ['stream', 'story', 'explore'],
        preferredFormat: 'feed'
      };
    }

    // Calls benefit from prominent placements
    if (goal === 'calls') {
      return {
        facebook: ['feed', 'marketplace'],
        instagram: ['stream'],
        preferredFormat: 'feed'
      };
    }

    // Default fallback
    return {
      facebook: ['feed'],
      instagram: ['stream'],
      preferredFormat: 'feed'
    };
  }

  /**
   * Validate CTA type is appropriate for goal and destination
   */
  validateCTA(cta: string, goal: GoalType, destinationType?: DestinationType): {
    isValid: boolean;
    warning?: string;
  } {
    const strategy = this.getStrategy(goal, destinationType);
    const recommendedCTAs = strategy.recommendedCTAs;

    // Check if CTA is in recommended list
    if (!recommendedCTAs.includes(cta)) {
      return {
        isValid: true, // Still valid, just not optimal
        warning: `CTA "${cta}" is not recommended for ${goal} goal. ` +
                 `Recommended: ${recommendedCTAs.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Get creative format recommendations based on goal
   */
  getFormatRecommendations(goal: GoalType): {
    primary: 'feed' | 'story' | 'reel';
    secondary: Array<'feed' | 'story' | 'reel'>;
    aspectRatios: string[];
  } {
    switch (goal) {
      case 'leads':
        return {
          primary: 'feed',
          secondary: [],
          aspectRatios: ['1:1 (square)', '4:5 (vertical)', '1.91:1 (horizontal)']
        };

      case 'website-visits':
        return {
          primary: 'feed',
          secondary: ['story'],
          aspectRatios: ['1:1 (square)', '4:5 (vertical)', '9:16 (story)']
        };

      case 'calls':
        return {
          primary: 'feed',
          secondary: [],
          aspectRatios: ['1:1 (square)', '4:5 (vertical)']
        };

      default:
        return {
          primary: 'feed',
          secondary: [],
          aspectRatios: ['1:1 (square)']
        };
    }
  }

  /**
   * Get optimization recommendations for creative
   */
  getOptimizationRecommendations(goal: GoalType): {
    textGuidelines: string[];
    imageGuidelines: string[];
    generalTips: string[];
  } {
    const common = {
      textGuidelines: [
        'Keep headline under 27 characters for desktop',
        'Primary text should be concise and action-oriented',
        'Include value proposition early'
      ],
      imageGuidelines: [
        'Use high-quality images (min 1080x1080)',
        'Minimal text overlay (<20% of image)',
        'Clear, focused subject'
      ]
    };

    const goalSpecific: Record<GoalType, { textGuidelines: string[]; imageGuidelines: string[]; generalTips: string[] }> = {
      leads: {
        textGuidelines: [
          ...common.textGuidelines,
          'Highlight offer or benefit clearly',
          'Create urgency or exclusivity'
        ],
        imageGuidelines: [
          ...common.imageGuidelines,
          'Show product or service in use',
          'Include people when relevant'
        ],
        generalTips: [
          'Test multiple form lengths',
          'Offer immediate value',
          'Use trust signals (testimonials, certifications)'
        ]
      },
      'website-visits': {
        textGuidelines: [
          ...common.textGuidelines,
          'Include clear destination preview',
          'Mention what users will find'
        ],
        imageGuidelines: [
          ...common.imageGuidelines,
          'Preview website content',
          'Use lifestyle imagery'
        ],
        generalTips: [
          'Optimize landing page for mobile',
          'Ensure fast page load',
          'Match ad message to landing page'
        ]
      },
      calls: {
        textGuidelines: [
          ...common.textGuidelines,
          'Mention hours of operation',
          'Highlight immediate assistance'
        ],
        imageGuidelines: [
          ...common.imageGuidelines,
          'Show friendly staff if applicable',
          'Include phone icon or visual cue'
        ],
        generalTips: [
          'Ensure phone system can handle volume',
          'Train staff on ad campaign',
          'Track calls with unique numbers if possible'
        ]
      }
    };

    return goalSpecific[goal] || {
      textGuidelines: common.textGuidelines,
      imageGuidelines: common.imageGuidelines,
      generalTips: []
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a creative strategy mapper instance
 */
export function createCreativeStrategyMapper(): CreativeStrategyMapper {
  return new CreativeStrategyMapper();
}

/**
 * Get strategy for goal
 */
export function getStrategyForGoal(goal: GoalType, destinationType?: DestinationType): CreativeStrategy {
  const mapper = new CreativeStrategyMapper();
  return mapper.getStrategy(goal, destinationType);
}

/**
 * Check if CTA is valid for goal
 */
export function isValidCTAForGoal(cta: string, goal: GoalType): boolean {
  const mapper = new CreativeStrategyMapper();
  const result = mapper.validateCTA(cta, goal);
  return result.isValid;
}

/**
 * Get all valid CTAs for a goal
 */
export function getValidCTAsForGoal(goal: GoalType): readonly string[] {
  return CTA_TYPE_MAP[goal] || ['LEARN_MORE'];
}

