/**
 * Feature: Analytics Service Server Implementation
 * Purpose: Server-side metrics fetching and performance analysis
 * References:
 *  - Analytics Service Contract: lib/services/contracts/analytics-service.interface.ts
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - Vercel AI SDK v5: https://sdk.vercel.ai/docs
 */

import { generateObject } from 'ai';
import { getModel } from '@/lib/ai/gateway-provider';
import { z } from 'zod';
import { getCachedMetrics } from '@/lib/meta/insights';
import { createServerClient } from '@/lib/supabase/server';
import type {
  AnalyticsService,
  CampaignMetrics,
  DemographicBreakdown,
  GetMetricsInput,
  GetBreakdownInput,
  PerformanceInsight,
} from '../contracts/analytics-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Analytics Service Server Implementation
 * Handles metrics fetching and performance analysis
 */
class AnalyticsServiceServer implements AnalyticsService {
  getMetrics = {
    async execute(input: GetMetricsInput): Promise<ServiceResult<CampaignMetrics>> {
      try {
        // Use existing cached metrics system
        const dateRange = typeof input.dateRange === 'string' ? input.dateRange : '7d';
        const metrics = await getCachedMetrics(input.campaignId, dateRange);

        if (!metrics) {
          return {
            success: true,
            data: {
              reach: 0,
              impressions: 0,
              clicks: 0,
              spend: 0,
              results: 0,
              cost_per_result: null,
              ctr: 0,
              cpc: 0,
              frequency: 0,
              dateRange,
            },
          };
        }

        return {
          success: true,
          data: {
            ...(metrics as unknown as Omit<CampaignMetrics, 'frequency' | 'dateRange'>),
            frequency: 0, // Not in CampaignMetricsSnapshot
            dateRange,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Failed to get metrics',
          },
        };
      }
    },
  };

  getDemographicBreakdown = {
    async execute(_input: GetBreakdownInput): Promise<ServiceResult<DemographicBreakdown>> {
      try {
        // TODO: Implement Meta Insights breakdown API call
        // Would query Meta API for demographic breakdowns
        
        throw new Error('Not implemented - Demographic breakdown requires Meta Insights API integration');
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Failed to get breakdown',
          },
        };
      }
    },
  };

  getPerformanceInsights = {
    async execute(campaignId: string): Promise<ServiceResult<PerformanceInsight[]>> {
      try {
        const supabase = await createServerClient();
        
        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            error: { code: 'unauthorized', message: 'Not authenticated' }
          };
        }

        // Fetch latest campaign metrics
        const { data: metrics, error } = await supabase
          .from('campaign_metrics_cache')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('cached_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return {
            success: false,
            error: { code: 'fetch_failed', message: error.message }
          };
        }

        if (!metrics) {
          // No metrics yet, return empty array
          return { success: true, data: [] };
        }

        // Generate insights using o1-mini reasoning model
        const { object } = await generateObject({
          model: getModel('openai/o1-mini'),
          schema: z.object({
            insights: z.array(z.object({
              type: z.enum(['positive', 'negative', 'neutral']).describe('Insight sentiment'),
              title: z.string().describe('Short insight title'),
              description: z.string().describe('Detailed explanation'),
              metric: z.string().describe('Which metric this relates to'),
              recommendation: z.string().optional().describe('Actionable recommendation'),
            })).min(3).max(5).describe('Generate 3-5 actionable insights'),
          }),
          prompt: `Analyze these Facebook/Instagram ad campaign metrics and provide actionable insights:

Metrics Summary:
- Impressions: ${metrics.impressions || 0}
- Reach: ${metrics.reach || 0}
- Clicks: ${metrics.clicks || 0}
- Click-Through Rate (CTR): ${metrics.ctr || 0}%
- Cost Per Click (CPC): $${metrics.cpc || 0}
- Cost Per 1000 Impressions (CPM): $${metrics.cpm || 0}
- Total Spend: $${metrics.spend || 0}
- Results (Conversions): ${metrics.results || 0}
- Cost Per Result: $${metrics.cost_per_result || 0}
- Date Range: ${metrics.date_start} to ${metrics.date_end}

Generate 3-5 insights with recommendations. Focus on:
1. Performance vs industry benchmarks
2. Areas for optimization
3. What's working well
4. Budget efficiency
5. Actionable next steps`,
        });

        return {
          success: true,
          data: object.insights,
        };
      } catch (error) {
        // Return empty array on error (graceful fallback)
        console.error('[AnalyticsService] Insights generation error:', error);
        return { success: true, data: [] };
      }
    },
  };

  compareAds = {
    async execute(input: { adIds: string[]; metric: string }): Promise<ServiceResult<Array<{ adId: string; value: number }>>> {
      try {
        const supabase = await createServerClient();
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            error: {
              code: 'unauthorized',
              message: 'Not authenticated',
            },
          };
        }

        // Fetch ads with metrics (ownership verified via RLS)
        const { data: ads, error } = await supabase
          .from('ads')
          .select('id, name, metrics_snapshot')
          .in('id', input.adIds);

        if (error) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: error.message,
            },
          };
        }

        if (!ads || ads.length === 0) {
          return {
            success: true,
            data: [],
          };
        }

        // Extract metric value from each ad
        const comparison = ads.map(ad => ({
          adId: ad.id,
          value: (ad.metrics_snapshot as any)?.[input.metric] || 0,
        }));

        // Sort by value descending
        comparison.sort((a, b) => b.value - a.value);

        return {
          success: true,
          data: comparison,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'comparison_failed',
            message: error instanceof Error ? error.message : 'Ad comparison failed',
          },
        };
      }
    },
  };

  getCostEfficiency = {
    async execute(_campaignId: string): Promise<ServiceResult<{ score: number; rating: 'excellent' | 'good' | 'fair' | 'poor' }>> {
      try {
        // TODO: Implement cost efficiency calculation
        // Would analyze cost per result vs industry benchmarks
        
        return {
          success: true,
          data: {
            score: 0,
            rating: 'good' as const,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'calculation_failed',
            message: error instanceof Error ? error.message : 'Cost efficiency calculation failed',
          },
        };
      }
    },
  };

  exportMetrics = {
    async execute(input: { campaignId: string; format: string }): Promise<ServiceResult<{ downloadUrl: string }>> {
      try {
        const supabase = await createServerClient();
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            error: {
              code: 'unauthorized',
              message: 'Not authenticated',
            },
          };
        }

        // Fetch metrics (ownership verified via RLS)
        const { data: metrics, error } = await supabase
          .from('campaign_metrics_cache')
          .select('*')
          .eq('campaign_id', input.campaignId)
          .order('cached_at', { ascending: false });

        if (error) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: error.message,
            },
          };
        }

        if (!metrics || metrics.length === 0) {
          return {
            success: false,
            error: {
              code: 'no_data',
              message: 'No metrics available for export',
            },
          };
        }

        const timestamp = Date.now();
        const fileName = `metrics-${input.campaignId}-${timestamp}.${input.format === 'csv' ? 'csv' : 'json'}`;

        if (input.format === 'csv') {
          // Convert to CSV
          const headers = ['Range', 'Date Start', 'Date End', 'Impressions', 'Reach', 'Clicks', 'Spend', 'Results', 'CTR', 'CPC', 'CPM', 'Cost Per Result', 'Cached At'];
          const rows = metrics.map(m => [
            m.range_key || '',
            m.date_start || '',
            m.date_end || '',
            m.impressions || 0,
            m.reach || 0,
            m.clicks || 0,
            m.spend || 0,
            m.results || 0,
            m.ctr || 0,
            m.cpc || 0,
            m.cpm || 0,
            m.cost_per_result || 0,
            m.cached_at || '',
          ]);
          
          const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('exports')
            .upload(fileName, csvContent, {
              contentType: 'text/csv',
              upsert: false,
            });

          if (uploadError) {
            return {
              success: false,
              error: {
                code: 'upload_failed',
                message: uploadError.message,
              },
            };
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('exports')
            .getPublicUrl(fileName);

          return {
            success: true,
            data: {
              downloadUrl: publicUrl,
            },
          };
        } else {
          // JSON export
          const jsonContent = JSON.stringify(metrics, null, 2);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('exports')
            .upload(fileName, jsonContent, {
              contentType: 'application/json',
              upsert: false,
            });

          if (uploadError) {
            return {
              success: false,
              error: {
                code: 'upload_failed',
                message: uploadError.message,
              },
            };
          }

          const { data: { publicUrl } } = supabase.storage
            .from('exports')
            .getPublicUrl(fileName);

          return {
            success: true,
            data: {
              downloadUrl: publicUrl,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'export_failed',
            message: error instanceof Error ? error.message : 'Metrics export failed',
          },
        };
      }
    },
  };
}

// Export singleton instance
export const analyticsServiceServer = new AnalyticsServiceServer();

