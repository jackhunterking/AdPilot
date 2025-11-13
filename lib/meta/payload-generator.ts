/**
 * Feature: Campaign Payload Generator (Facade)
 * Purpose: Unified interface for generating complete Meta publish payloads from campaign state
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 * 
 * This is a facade over Phase 3 and Phase 4 components for easy integration
 */

import { CampaignAssembler, type CampaignStateData, type MetaConnectionData } from './payload-transformation/campaign-assembler';
import { CreativePayloadGenerator, type GenerateCreativeParams } from './creative-generation/creative-payload-generator';
import { PayloadValidator } from './payload-transformation/payload-validator';
import type { PublishData, ValidationResult, DestinationType } from './types/publishing';

// ============================================================================
// UNIFIED PAYLOAD GENERATOR
// ============================================================================

export class MetaPayloadGenerator {
  private campaignAssembler: CampaignAssembler;
  private creativeGenerator: CreativePayloadGenerator;
  private payloadValidator: PayloadValidator;

  constructor() {
    this.campaignAssembler = new CampaignAssembler();
    this.creativeGenerator = new CreativePayloadGenerator();
    this.payloadValidator = new PayloadValidator();
  }

  /**
   * Generate complete publish_data from campaign state
   */
  async generate(
    campaignName: string,
    campaignStates: CampaignStateData,
    metaConnection: MetaConnectionData,
    destinationType: DestinationType,
    destinationConfig: {
      websiteUrl?: string;
      leadFormId?: string;
      phoneNumber?: string;
    }
  ): Promise<{
    publishData: PublishData;
    validation: ValidationResult;
    warnings: string[];
  }> {
    // Assemble campaign/adset/ad structure
    const assemblyResult = await this.campaignAssembler.assemble(
      campaignName,
      campaignStates,
      metaConnection,
      destinationType,
      destinationConfig
    );

    // Validate the assembled data
    const validation = this.payloadValidator.validate(assemblyResult.publishData);

    return {
      publishData: assemblyResult.publishData,
      validation,
      warnings: assemblyResult.warnings
    };
  }

  /**
   * Generate creative payloads
   */
  generateCreatives(params: GenerateCreativeParams[]) {
    return params.map(p => this.creativeGenerator.generate(p));
  }

  /**
   * Validate publish data
   */
  validate(publishData: PublishData): ValidationResult {
    return this.payloadValidator.validate(publishData);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a payload generator instance
 */
export function createPayloadGenerator(): MetaPayloadGenerator {
  return new MetaPayloadGenerator();
}

/**
 * Quick generate publish data
 */
export async function generatePublishData(
  campaignName: string,
  campaignStates: CampaignStateData,
  metaConnection: MetaConnectionData,
  destinationType: DestinationType,
  destinationConfig: {
    websiteUrl?: string;
    leadFormId?: string;
    phoneNumber?: string;
  }
): Promise<PublishData> {
  const generator = new MetaPayloadGenerator();
  const result = await generator.generate(
    campaignName,
    campaignStates,
    metaConnection,
    destinationType,
    destinationConfig
  );

  return result.publishData;
}

