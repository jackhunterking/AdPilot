/**
 * Feature: Creative Payload Generator
 * Purpose: Generate complete Meta AdCreative payloads from campaign data
 * References:
 *  - AdCreative Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-creative
 *  - Creative Best Practices: https://www.facebook.com/business/ads-guide/update/image
 */

import type {
  MetaCreativePayload,
  ObjectStorySpec,
  GoalType,
  DestinationType,
  CTAType
} from '../types/publishing';
import { CreativeStrategyMapper } from './creative-strategy';
import { ObjectStoryBuilder } from './object-story-builder';
import { TextSanitizer } from './text-sanitizer';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateCreativeParams {
  // Meta connection data
  pageId: string;
  instagramActorId?: string | null;

  // Campaign data
  goal: GoalType;
  destinationType: DestinationType;
  destinationUrl?: string;
  leadFormId?: string;
  phoneNumber?: string;

  // Ad copy
  primaryText: string;
  headline: string;
  description?: string;

  // Creative assets
  imageHash?: string;
  imageUrl?: string;

  // Optional customization
  ctaType?: CTAType;
  creativeName?: string;

  // Variation identifier
  variationIndex?: number;
}

export interface CreativeGenerationResult {
  payload: MetaCreativePayload;
  sanitizationWarnings: string[];
  policyWarnings: string[];
}

// ============================================================================
// CREATIVE PAYLOAD GENERATOR CLASS
// ============================================================================

export class CreativePayloadGenerator {
  private strategyMapper: CreativeStrategyMapper;
  private storyBuilder: ObjectStoryBuilder;
  private textSanitizer: TextSanitizer;

  constructor() {
    this.strategyMapper = new CreativeStrategyMapper();
    this.storyBuilder = new ObjectStoryBuilder();
    this.textSanitizer = new TextSanitizer();
  }

  /**
   * Generate complete creative payload
   */
  generate(params: GenerateCreativeParams): CreativeGenerationResult {
    const {
      pageId,
      instagramActorId,
      goal,
      destinationType,
      destinationUrl,
      leadFormId,
      phoneNumber,
      primaryText,
      headline,
      description,
      imageHash,
      imageUrl,
      ctaType,
      creativeName,
      variationIndex
    } = params;

    const sanitizationWarnings: string[] = [];
    const policyWarnings: string[] = [];

    // ========================================================================
    // STEP 1: GET CREATIVE STRATEGY
    // ========================================================================
    const strategy = this.strategyMapper.getStrategy(goal, destinationType);

    // Determine CTA type
    const finalCtaType = ctaType || strategy.defaultCTA;

    // Validate CTA
    const ctaValidation = this.strategyMapper.validateCTA(finalCtaType, goal, destinationType);
    if (ctaValidation.warning) {
      sanitizationWarnings.push(ctaValidation.warning);
    }

    // ========================================================================
    // STEP 2: SANITIZE TEXT
    // ========================================================================
    const primaryResult = this.textSanitizer.sanitizePrimaryText(primaryText);
    if (primaryResult.warnings.length > 0) {
      sanitizationWarnings.push(...primaryResult.warnings);
    }

    const headlineResult = this.textSanitizer.sanitizeHeadline(headline);
    if (headlineResult.warnings.length > 0) {
      sanitizationWarnings.push(...headlineResult.warnings);
    }

    let descriptionResult: ReturnType<typeof this.textSanitizer.sanitizeDescription> | undefined;
    if (description) {
      descriptionResult = this.textSanitizer.sanitizeDescription(description);
      if (descriptionResult.warnings.length > 0) {
        sanitizationWarnings.push(...descriptionResult.warnings);
      }
    }

    // ========================================================================
    // STEP 3: CHECK POLICY COMPLIANCE
    // ========================================================================
    const primaryPolicy = this.textSanitizer.checkPolicyCompliance(primaryResult.sanitized);
    if (!primaryPolicy.compliant || primaryPolicy.violations.length > 0) {
      policyWarnings.push(...primaryPolicy.violations.map(v => v.message));
    }
    policyWarnings.push(...primaryPolicy.warnings);

    const headlinePolicy = this.textSanitizer.checkPolicyCompliance(headlineResult.sanitized);
    if (headlinePolicy.warnings.length > 0) {
      policyWarnings.push(...headlinePolicy.warnings);
    }

    // ========================================================================
    // STEP 4: BUILD OBJECT STORY SPEC
    // ========================================================================
    const objectStorySpec = this.storyBuilder.buildObjectStorySpec({
      pageId,
      instagramActorId: instagramActorId || undefined,
      destinationType,
      destinationUrl,
      leadFormId,
      phoneNumber,
      primaryText: primaryResult.sanitized,
      headline: headlineResult.sanitized,
      description: descriptionResult?.sanitized,
      ctaType: finalCtaType,
      imageHash,
      imageUrl
    });

    // ========================================================================
    // STEP 5: BUILD COMPLETE CREATIVE PAYLOAD
    // ========================================================================
    const name = this.generateCreativeName(
      creativeName,
      headlineResult.sanitized,
      variationIndex
    );

    const payload: MetaCreativePayload = {
      name,
      object_story_spec: objectStorySpec,
      degrees_of_freedom_spec: {
        creative_features_spec: {
          standard_enhancements: {
            enroll_status: 'OPT_OUT' // Start without auto-optimization
          }
        }
      }
    };

    // ========================================================================
    // RETURN RESULT
    // ========================================================================
    return {
      payload,
      sanitizationWarnings,
      policyWarnings
    };
  }

  /**
   * Generate multiple creative variations
   */
  generateVariations(
    baseParams: Omit<GenerateCreativeParams, 'primaryText' | 'headline' | 'description'>,
    variations: Array<{
      primaryText: string;
      headline: string;
      description?: string;
      imageHash?: string;
      imageUrl?: string;
    }>
  ): CreativeGenerationResult[] {
    return variations.map((variation, index) => {
      return this.generate({
        ...baseParams,
        ...variation,
        variationIndex: index
      });
    });
  }

  /**
   * Generate creative name with timestamp
   */
  private generateCreativeName(
    customName: string | undefined,
    headline: string,
    variationIndex?: number
  ): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const variationSuffix = variationIndex !== undefined ? ` - Variation ${variationIndex + 1}` : '';

    if (customName) {
      return `${customName}${variationSuffix}`;
    }

    // Generate from headline (truncate to avoid too long names)
    const shortHeadline = headline.length > 30 ? headline.substring(0, 30) + '...' : headline;
    return `Creative - ${shortHeadline}${variationSuffix} - ${timestamp}`;
  }

  /**
   * Validate all required fields are present
   */
  validateRequiredFields(params: GenerateCreativeParams): {
    isValid: boolean;
    missingFields: string[];
  } {
    const missing: string[] = [];

    if (!params.pageId) missing.push('pageId');
    if (!params.primaryText) missing.push('primaryText');
    if (!params.headline) missing.push('headline');

    // Destination-specific requirements
    if (params.destinationType === 'website' && !params.destinationUrl) {
      missing.push('destinationUrl');
    }

    if (params.destinationType === 'form' && !params.leadFormId) {
      missing.push('leadFormId');
    }

    if (params.destinationType === 'call' && !params.phoneNumber) {
      missing.push('phoneNumber');
    }

    // At least one image identifier required
    if (!params.imageHash && !params.imageUrl) {
      missing.push('imageHash or imageUrl');
    }

    return {
      isValid: missing.length === 0,
      missingFields: missing
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a creative payload generator instance
 */
export function createCreativePayloadGenerator(): CreativePayloadGenerator {
  return new CreativePayloadGenerator();
}

/**
 * Quick generate single creative
 */
export function generateCreative(params: GenerateCreativeParams): CreativeGenerationResult {
  const generator = new CreativePayloadGenerator();
  return generator.generate(params);
}

/**
 * Generate creatives for all variations
 */
export function generateCreativeVariations(
  baseParams: Omit<GenerateCreativeParams, 'primaryText' | 'headline' | 'description'>,
  variations: Array<{
    primaryText: string;
    headline: string;
    description?: string;
    imageHash?: string;
    imageUrl?: string;
  }>
): CreativeGenerationResult[] {
  const generator = new CreativePayloadGenerator();
  return generator.generateVariations(baseParams, variations);
}

/**
 * Extract payloads from generation results
 */
export function extractPayloads(results: CreativeGenerationResult[]): MetaCreativePayload[] {
  return results.map(r => r.payload);
}

/**
 * Check if any results have policy warnings
 */
export function hasAnyPolicyWarnings(results: CreativeGenerationResult[]): boolean {
  return results.some(r => r.policyWarnings.length > 0);
}

/**
 * Get all warnings from results
 */
export function getAllWarnings(results: CreativeGenerationResult[]): {
  sanitization: string[];
  policy: string[];
} {
  const sanitization: string[] = [];
  const policy: string[] = [];

  results.forEach(result => {
    sanitization.push(...result.sanitizationWarnings);
    policy.push(...result.policyWarnings);
  });

  return {
    sanitization: Array.from(new Set(sanitization)), // Deduplicate
    policy: Array.from(new Set(policy))
  };
}

