/**
 * Feature: Analytics Service Client (Full Implementation)
 * Purpose: Client-side analytics and metrics operations
 * Microservices: Client service layer calling API routes
 * References:
 *  - Contract: lib/services/contracts/analytics-service.interface.ts
 *  - API v1: app/api/v1/meta/metrics, app/api/v1/meta/breakdown
 */

"use client";

import type { 
  AnalyticsService,
  GetMetricsInput,
  CampaignMetrics,
  GetBreakdownInput,
  DemographicBreakdown,
  PerformanceInsight,
} from '../contracts/analytics-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Analytics Service Client (Full Implementation)
 * 
 * Client-side implementation that calls API v1 Meta analytics endpoints.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/meta/metrics and /api/v1/meta/breakdown endpoints
 * - Processes metrics data for insights
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class AnalyticsServiceClient implements AnalyticsService {
  getMetrics = {
    async execute(input: GetMetricsInput): Promise<ServiceResult<CampaignMetrics>> {
      try {
        const dateRangeParam = typeof input.dateRange === 'string' 
          ? `&dateRange=${input.dateRange}` 
          : input.dateRange 
            ? `&start=${input.dateRange.start}&end=${input.dateRange.end}` 
            : '';
        const refreshParam = input.refresh ? '&refresh=true' : '';
        
        const response = await fetch(`/api/v1/meta/metrics?campaignId=${input.campaignId}${dateRangeParam}${refreshParam}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: CampaignMetrics };
        return {
          success: true,
          data: successResult.data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get metrics',
          },
        };
      }
    }
  };

  getDemographicBreakdown = {
    async execute(input: GetBreakdownInput): Promise<ServiceResult<DemographicBreakdown>> {
      try {
        const dateRangeParam = input.dateRange ? `&dateRange=${input.dateRange}` : '';
        const response = await fetch(`/api/v1/meta/breakdown?campaignId=${input.campaignId}&type=${input.type}${dateRangeParam}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: DemographicBreakdown };
        return {
          success: true,
          data: successResult.data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get demographic breakdown',
          },
        };
      }
    }
  };

  getPerformanceInsights = {
    async execute(campaignId: string): Promise<ServiceResult<PerformanceInsight[]>> {
      try {
        // Fetch metrics inline to avoid circular reference
        const dateRangeParam = '';
        const refreshParam = '';
        const metricsResponse = await fetch(`/api/v1/meta/metrics?campaignId=${campaignId}${dateRangeParam}${refreshParam}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const metricsJson: unknown = await metricsResponse.json();
        const metricsResult = metricsResponse.ok 
          ? { success: true, data: (metricsJson as { success: true; data: CampaignMetrics }).data } as ServiceResult<CampaignMetrics>
          : { success: false, error: { code: 'fetch_failed', message: 'Failed to fetch metrics' } } as ServiceResult<CampaignMetrics>;
        
        if (!metricsResult.success || !metricsResult.data) {
          return {
            success: false,
            error: {
              code: 'metrics_fetch_failed',
              message: 'Failed to fetch metrics for insights',
            },
          };
        }
        
        const metrics = metricsResult.data;
        const insights: PerformanceInsight[] = [];
        
        // Generate insights based on metrics
        if (metrics.ctr < 1.0) {
          insights.push({
            type: 'warning',
            title: 'Low Click-Through Rate',
            description: `Your CTR is ${metrics.ctr.toFixed(2)}%. Consider improving your creative or copy.`,
            action: {
              label: 'Improve Creative',
              actionType: 'edit_creative',
            },
          });
        } else if (metrics.ctr > 2.0) {
          insights.push({
            type: 'success',
            title: 'Excellent Click-Through Rate',
            description: `Your CTR of ${metrics.ctr.toFixed(2)}% is performing well!`,
          });
        }
        
        if (metrics.cost_per_result && metrics.cost_per_result > 50) {
          insights.push({
            type: 'suggestion',
            title: 'High Cost Per Result',
            description: `At $${metrics.cost_per_result.toFixed(2)} per result, consider refining your targeting.`,
            action: {
              label: 'Adjust Targeting',
              actionType: 'edit_targeting',
            },
          });
        }
        
        if (metrics.frequency > 3.0) {
          insights.push({
            type: 'warning',
            title: 'High Frequency',
            description: `Average frequency of ${metrics.frequency.toFixed(1)} suggests audience fatigue. Consider expanding your audience.`,
            action: {
              label: 'Expand Audience',
              actionType: 'edit_targeting',
            },
          });
        }
        
        return {
          success: true,
          data: insights,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'insights_error',
            message: error instanceof Error ? error.message : 'Failed to get performance insights',
          },
        };
      }
    }
  };

  compareAds = {
    async execute(input: { adIds: string[]; metric: keyof CampaignMetrics }): Promise<ServiceResult<Array<{ adId: string; value: number }>>> {
      try {
        // Fetch metrics for each ad
        const comparisons = await Promise.all(
          input.adIds.map(async (adId) => {
            const response = await fetch(`/api/v1/ads/${adId}`, {
              method: 'GET',
              credentials: 'include',
            });
            
            if (!response.ok) {
              return { adId, value: 0 };
            }
            
            const result: unknown = await response.json();
            const adData = result as { 
              success: true; 
              data: { ad: { setup_snapshot?: { metrics?: CampaignMetrics } } } 
            };
            const metrics = adData.data.ad.setup_snapshot?.metrics;
            const value = metrics?.[input.metric] || 0;
            
            return { adId, value: typeof value === 'number' ? value : 0 };
          })
        );
        
        return {
          success: true,
          data: comparisons,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'comparison_error',
            message: error instanceof Error ? error.message : 'Failed to compare ads',
          },
        };
      }
    }
  };

  getCostEfficiency = {
    async execute(campaignId: string): Promise<ServiceResult<{ score: number; rating: 'excellent' | 'good' | 'fair' | 'poor' }>> {
      try {
        // Fetch metrics inline to avoid circular reference
        const dateRangeParam = '';
        const refreshParam = '';
        const metricsResponse = await fetch(`/api/v1/meta/metrics?campaignId=${campaignId}${dateRangeParam}${refreshParam}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const metricsJson: unknown = await metricsResponse.json();
        const metricsResult = metricsResponse.ok 
          ? { success: true, data: (metricsJson as { success: true; data: CampaignMetrics }).data } as ServiceResult<CampaignMetrics>
          : { success: false, error: { code: 'fetch_failed', message: 'Failed to fetch metrics' } } as ServiceResult<CampaignMetrics>;
        
        if (!metricsResult.success || !metricsResult.data) {
          return {
            success: false,
            error: {
              code: 'metrics_fetch_failed',
              message: 'Failed to fetch metrics for efficiency score',
            },
          };
        }
        
        const metrics = metricsResult.data;
        
        // Calculate efficiency score (0-100)
        // Based on: CTR, CPC, cost per result
        let score = 50; // Base score
        
        // CTR component (0-30 points)
        if (metrics.ctr > 2.0) score += 30;
        else if (metrics.ctr > 1.5) score += 20;
        else if (metrics.ctr > 1.0) score += 10;
        else score -= 10;
        
        // CPC component (0-30 points)
        if (metrics.cpc < 0.50) score += 30;
        else if (metrics.cpc < 1.00) score += 20;
        else if (metrics.cpc < 2.00) score += 10;
        else score -= 10;
        
        // Cost per result component (0-40 points)
        if (metrics.cost_per_result) {
          if (metrics.cost_per_result < 10) score += 40;
          else if (metrics.cost_per_result < 25) score += 25;
          else if (metrics.cost_per_result < 50) score += 10;
          else score -= 10;
        }
        
        // Normalize to 0-100
        score = Math.max(0, Math.min(100, score));
        
        // Determine rating
        let rating: 'excellent' | 'good' | 'fair' | 'poor';
        if (score >= 80) rating = 'excellent';
        else if (score >= 60) rating = 'good';
        else if (score >= 40) rating = 'fair';
        else rating = 'poor';
        
        return {
          success: true,
          data: { score, rating },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'efficiency_error',
            message: error instanceof Error ? error.message : 'Failed to calculate cost efficiency',
          },
        };
      }
    }
  };

  exportMetrics = {
    async execute(input: { campaignId: string; format: 'csv' | 'json' }): Promise<ServiceResult<{ downloadUrl: string }>> {
      try {
        const response = await fetch(`/api/v1/leads/export?campaignId=${input.campaignId}&format=${input.format}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          return {
            success: false,
            error: {
              code: 'export_failed',
              message: 'Failed to export metrics',
            },
          };
        }
        
        // For CSV/JSON exports, the API typically returns the file directly
        // Create a download URL from the blob
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        return {
          success: true,
          data: { downloadUrl },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'export_error',
            message: error instanceof Error ? error.message : 'Failed to export metrics',
          },
        };
      }
    }
  };
}

export const analyticsServiceClient = new AnalyticsServiceClient();
