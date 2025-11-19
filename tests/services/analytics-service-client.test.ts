/**
 * Test: Analytics Service Client
 * Purpose: Unit tests for analytics and metrics operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsServiceClient } from '@/lib/services/client/analytics-service-client';

describe('AnalyticsServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should fetch campaign metrics', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            reach: 10000,
            impressions: 15000,
            clicks: 500,
            spend: 100,
            results: 50,
            cost_per_result: 2.0,
            ctr: 3.33,
            cpc: 0.20,
            frequency: 1.5,
            dateRange: '7d'
          } 
        })
      });

      const result = await analyticsServiceClient.getMetrics.execute({ 
        campaignId: 'campaign-id',
        dateRange: '7d'
      });

      expect(result.success).toBe(true);
      expect(result.data?.reach).toBe(10000);
    });
  });

  describe('getDemographicBreakdown', () => {
    it('should get demographic breakdown', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { age: [], gender: [] } 
        })
      });

      const result = await analyticsServiceClient.getDemographicBreakdown.execute({ 
        campaignId: 'campaign-id',
        type: 'age'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getCostEfficiency', () => {
    it('should calculate cost efficiency score', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            reach: 10000,
            impressions: 15000,
            clicks: 500,
            spend: 100,
            results: 50,
            cost_per_result: 2.0,
            ctr: 3.0,
            cpc: 0.20,
            frequency: 1.5,
            dateRange: '7d'
          } 
        })
      });

      const result = await analyticsServiceClient.getCostEfficiency.execute('campaign-id');

      expect(result.success).toBe(true);
      expect(result.data?.score).toBeGreaterThanOrEqual(0);
      expect(result.data?.score).toBeLessThanOrEqual(100);
    });
  });
});

