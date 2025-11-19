/**
 * Feature: Analytics Service Contract
 * Purpose: Interface for metrics fetching and performance analysis
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - Meta Insights API
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Analytics Types
// ============================================================================

export interface CampaignMetrics {
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  results: number; // Leads, calls, or conversions
  cost_per_result: number | null;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  frequency: number;
  dateRange: string;
}

export interface DemographicBreakdown {
  age: Array<{
    range: string; // e.g., "18-24"
    impressions: number;
    reach: number;
    spend: number;
  }>;
  gender: Array<{
    type: 'male' | 'female' | 'unknown';
    impressions: number;
    reach: number;
    spend: number;
  }>;
}

export interface GetMetricsInput {
  campaignId: string;
  dateRange?: '7d' | '30d' | 'lifetime' | { start: string; end: string };
  refresh?: boolean; // Force fetch from Meta
}

export interface GetBreakdownInput {
  campaignId: string;
  type: 'age' | 'gender' | 'placement';
  dateRange?: '7d' | '30d' | 'lifetime';
}

export interface PerformanceInsight {
  type: 'suggestion' | 'warning' | 'success';
  title: string;
  description: string;
  action?: {
    label: string;
    actionType: string;
  };
}

// ============================================================================
// Analytics Service Interface
// ============================================================================

export interface AnalyticsService {
  /**
   * Get campaign metrics
   * Returns cached data or fetches from Meta if refresh=true
   */
  getMetrics: ServiceContract<GetMetricsInput, ServiceResult<CampaignMetrics>>;

  /**
   * Get demographic breakdown
   */
  getDemographicBreakdown: ServiceContract<
    GetBreakdownInput,
    ServiceResult<DemographicBreakdown>
  >;

  /**
   * Get performance insights
   * AI-generated suggestions based on metrics
   */
  getPerformanceInsights: ServiceContract<
    string,
    ServiceResult<PerformanceInsight[]>
  >;

  /**
   * Compare ad performance
   */
  compareAds: ServiceContract<
    { adIds: string[]; metric: keyof CampaignMetrics },
    ServiceResult<Array<{ adId: string; value: number }>>
  >;

  /**
   * Get cost efficiency score
   */
  getCostEfficiency: ServiceContract<
    string,
    ServiceResult<{ score: number; rating: 'excellent' | 'good' | 'fair' | 'poor' }>
  >;

  /**
   * Export metrics to CSV
   */
  exportMetrics: ServiceContract<
    { campaignId: string; format: 'csv' | 'json' },
    ServiceResult<{ downloadUrl: string }>
  >;
}

