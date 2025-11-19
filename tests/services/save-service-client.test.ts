/**
 * Test: Save Service Client
 * Purpose: Unit tests for ad save/snapshot operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveServiceClient } from '@/lib/services/client/save-service-client';

describe('SaveServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveAd', () => {
    it('should save ad snapshot', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { snapshot: {} } })
      });

      const result = await saveServiceClient.saveAd.execute({
        adId: 'ad-id',
        creative: { variations: [] },
        copy: { variations: [] },
        location: { locations: [] },
        destination: { type: 'website_url', data: {} },
        budget: { dailyBudget: 50, currency: 'USD', selectedAdAccount: null }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getSnapshot', () => {
    it('should get ad snapshot', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            snapshot: {
              creative: {},
              copy: {},
              location: {},
              destination: {},
              budget: {}
            } 
          } 
        })
      });

      const result = await saveServiceClient.getSnapshot.execute('ad-id');

      expect(result.success).toBe(true);
    });
  });
});

