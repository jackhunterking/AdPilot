/**
 * Feature: Campaign Payload Assembler
 * Purpose: Assemble complete publish_data structure from all campaign state data
 * References:
 *  - Meta Campaign Structure: https://developers.facebook.com/docs/marketing-api/campaign-structure
 */

import type {
  PublishData,
  MetaCampaignPayload,
  MetaAdSetPayload,
  MetaAdPayload,
  GoalType,
  DestinationType
} from '../types/publishing';
import { ObjectiveMapper } from './objective-mapper';
import { TargetingTransformer } from './targeting-transformer';
import { BudgetTransformer } from './budget-transformer';
import { ScheduleTransformer } from './schedule-transformer';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignStateData {
  goal_data: unknown;
  location_data: unknown;
  budget_data: unknown;
  ad_copy_data: unknown;
  ad_preview_data: unknown;
  meta_connect_data?: unknown;
}

export interface MetaConnectionData {
  selected_page_id?: string | null;
  selected_ig_user_id?: string | null;
  selected_ad_account_id?: string | null;
  ad_account_currency_code?: string | null;
}

export interface AdVariation {
  primaryText: string;
  headline: string;
  description?: string;
  imageUrl?: string;
  imageHash?: string;
}

export interface AssemblyResult {
  publishData: PublishData;
  warnings: string[];
  metadata: {
    campaignName: string;
    objective: string;
    dailyBudget: string;
    targetingDescription: string;
    adCount: number;
  };
}

// ============================================================================
// CAMPAIGN ASSEMBLER CLASS
// ============================================================================

export class CampaignAssembler {
  private objectiveMapper: ObjectiveMapper;
  private targetingTransformer: TargetingTransformer;
  private budgetTransformer: BudgetTransformer;
  private scheduleTransformer: ScheduleTransformer;

  constructor() {
    this.objectiveMapper = new ObjectiveMapper();
    this.targetingTransformer = new TargetingTransformer();
    this.budgetTransformer = new BudgetTransformer();
    this.scheduleTransformer = new ScheduleTransformer();
  }

  /**
   * Assemble complete publish_data from campaign state
   */
  async assemble(
    campaignName: string,
    campaignStates: CampaignStateData,
    metaConnection: MetaConnectionData,
    destinationType: DestinationType,
    destinationConfig: {
      websiteUrl?: string;
      leadFormId?: string;
      phoneNumber?: string;
    }
  ): Promise<AssemblyResult> {
    const allWarnings: string[] = [];

    // ========================================================================
    // STEP 1: EXTRACT AND VALIDATE GOAL
    // ========================================================================
    const goal = this.objectiveMapper.extractGoalFromData(campaignStates.goal_data);

    if (!goal) {
      throw new Error('Campaign goal not found. Please complete the goal selection step.');
    }

    // ========================================================================
    // STEP 2: MAP OBJECTIVE
    // ========================================================================
    const objectiveMapping = this.objectiveMapper.mapGoalToObjective(goal);

    // ========================================================================
    // STEP 3: TRANSFORM TARGETING
    // ========================================================================
    const targetingResult = this.targetingTransformer.transform(campaignStates.location_data);
    allWarnings.push(...targetingResult.warnings);

    // ========================================================================
    // STEP 4: TRANSFORM BUDGET
    // ========================================================================
    const currency = metaConnection.ad_account_currency_code || 'USD';
    const budgetResult = this.budgetTransformer.transform(campaignStates.budget_data, currency);
    allWarnings.push(...budgetResult.warnings);

    // ========================================================================
    // STEP 5: TRANSFORM SCHEDULE
    // ========================================================================
    const budgetData = campaignStates.budget_data as { startTime?: string; endTime?: string; timezone?: string } | null;
    const scheduleResult = this.scheduleTransformer.transform({
      startTime: budgetData?.startTime || null,
      endTime: budgetData?.endTime || null,
      timezone: budgetData?.timezone || null
    });
    allWarnings.push(...scheduleResult.warnings);

    // ========================================================================
    // STEP 6: BUILD CAMPAIGN PAYLOAD
    // ========================================================================
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const campaign: MetaCampaignPayload = {
      name: `${campaignName} - ${timestamp}`,
      objective: objectiveMapping.campaign.objective,
      status: 'PAUSED', // Always start paused for safety
      special_ad_categories: objectiveMapping.campaign.special_ad_categories
    };

    // ========================================================================
    // STEP 7: BUILD ADSET PAYLOAD
    // ========================================================================
    const adset: Partial<MetaAdSetPayload> = {
      name: `${campaignName} - AdSet`,
      campaign_id: '', // Will be filled after campaign creation
      daily_budget: budgetResult.daily_budget,
      lifetime_budget: budgetResult.lifetime_budget,
      billing_event: objectiveMapping.adset.billing_event,
      optimization_goal: objectiveMapping.adset.optimization_goal,
      bid_strategy: objectiveMapping.adset.bid_strategy,
      targeting: targetingResult.targeting,
      status: 'PAUSED',
      start_time: scheduleResult.start_time,
      end_time: scheduleResult.end_time
    };

    // ========================================================================
    // STEP 8: BUILD AD PAYLOADS (PLACEHOLDER)
    // ========================================================================
    // Note: Actual ad payloads will be built with creative IDs after creative creation
    // This is a placeholder structure
    const ads: Partial<MetaAdPayload>[] = [{
      name: `${campaignName} - Ad 1`,
      adset_id: '', // Will be filled after adset creation
      creative: { creative_id: '' }, // Will be filled after creative creation
      status: 'PAUSED'
    }];

    // ========================================================================
    // STEP 9: BUILD METADATA
    // ========================================================================
    const metadata = {
      preparedAt: new Date().toISOString(),
      version: '1.0.0',
      imageHashes: {}, // Will be populated after image upload
      creativeIds: [] // Will be populated after creative creation
    };

    // ========================================================================
    // STEP 10: ASSEMBLE COMPLETE PUBLISH_DATA
    // ========================================================================
    const publishData: PublishData = {
      campaign,
      adset: adset as MetaAdSetPayload,
      ads: ads as MetaAdPayload[],
      metadata
    };

    // ========================================================================
    // STEP 11: BUILD DISPLAY METADATA
    // ========================================================================
    const displayMetadata = {
      campaignName: campaign.name,
      objective: objectiveMapping.campaign.objective,
      dailyBudget: budgetResult.daily_budget 
        ? this.formatBudget(budgetResult.daily_budget, currency)
        : budgetResult.lifetime_budget
          ? `${this.formatBudget(budgetResult.lifetime_budget, currency)} lifetime`
          : 'Not set',
      targetingDescription: this.buildTargetingDescription(targetingResult),
      adCount: ads.length
    };

    return {
      publishData,
      warnings: allWarnings,
      metadata: displayMetadata
    };
  }

  /**
   * Build human-readable targeting description
   */
  private buildTargetingDescription(targetingResult: {
    targeting: { geo_locations: { countries?: string[]; regions?: unknown[]; cities?: unknown[] } };
    includedLocationCount: number;
    excludedLocationCount: number;
  }): string {
    const geo = targetingResult.targeting.geo_locations;
    const parts: string[] = [];

    if (geo.countries && geo.countries.length > 0) {
      parts.push(`${geo.countries.length} ${geo.countries.length === 1 ? 'country' : 'countries'}`);
    }

    if (geo.regions && geo.regions.length > 0) {
      parts.push(`${geo.regions.length} ${geo.regions.length === 1 ? 'region' : 'regions'}`);
    }

    if (geo.cities && geo.cities.length > 0) {
      parts.push(`${geo.cities.length} ${geo.cities.length === 1 ? 'city' : 'cities'}`);
    }

    let description = parts.join(', ') || 'No targeting set';

    if (targetingResult.excludedLocationCount > 0) {
      description += ` (excluding ${targetingResult.excludedLocationCount})`;
    }

    return description;
  }

  /**
   * Format budget for display
   */
  private formatBudget(cents: number, currency: string): string {
    const dollars = cents / 100;

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(dollars);
    } catch {
      return `${dollars.toFixed(2)} ${currency}`;
    }
  }

  /**
   * Validate all campaign state data is present
   */
  validateCompleteness(campaignStates: CampaignStateData): {
    isComplete: boolean;
    missingData: string[];
  } {
    const missing: string[] = [];

    if (!campaignStates.goal_data) {
      missing.push('goal_data');
    }

    if (!campaignStates.location_data) {
      missing.push('location_data');
    }

    if (!campaignStates.budget_data) {
      missing.push('budget_data');
    }

    if (!campaignStates.ad_copy_data) {
      missing.push('ad_copy_data');
    }

    if (!campaignStates.ad_preview_data) {
      missing.push('ad_preview_data');
    }

    return {
      isComplete: missing.length === 0,
      missingData: missing
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a campaign assembler instance
 */
export function createCampaignAssembler(): CampaignAssembler {
  return new CampaignAssembler();
}

/**
 * Assemble campaign from state data
 */
export async function assembleCampaign(
  campaignName: string,
  campaignStates: CampaignStateData,
  metaConnection: MetaConnectionData,
  destinationType: DestinationType,
  destinationConfig: {
    websiteUrl?: string;
    leadFormId?: string;
    phoneNumber?: string;
  }
): Promise<AssemblyResult> {
  const assembler = new CampaignAssembler();
  return assembler.assemble(
    campaignName,
    campaignStates,
    metaConnection,
    destinationType,
    destinationConfig
  );
}

/**
 * Check if campaign state is complete
 */
export function isCampaignStateComplete(campaignStates: CampaignStateData): boolean {
  const assembler = new CampaignAssembler();
  const result = assembler.validateCompleteness(campaignStates);
  return result.isComplete;
}

/**
 * Get missing campaign data
 */
export function getMissingCampaignData(campaignStates: CampaignStateData): string[] {
  const assembler = new CampaignAssembler();
  const result = assembler.validateCompleteness(campaignStates);
  return result.missingData;
}

