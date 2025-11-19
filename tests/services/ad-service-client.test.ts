/**
 * Test: Ad Service Client
 * Purpose: Unit tests for ad service operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adServiceClient } from '@/lib/services/client/ad-service-client';

describe('AdServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAd', () => {
    it('should call API correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { ad: { id: 'test-ad-id', name: 'Test Ad' } } })
      });

      const result = await adServiceClient.createAd.execute({
        name: 'Test Ad',
        campaignId: 'campaign-id'
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/ads', expect.any(Object));
    });

    it('should handle errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: { code: 'error', message: 'Error' } })
      });

      const result = await adServiceClient.createAd.execute({ name: 'Test', campaignId: 'id' });

      expect(result.success).toBe(false);
    });
  });

  describe('publishAd', () => {
    it('should publish ad via API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { meta_ad_id: '123', status: 'active' } })
      });

      const result = await adServiceClient.publishAd.execute('ad-id');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/ads/ad-id/publish', expect.any(Object));
    });
  });
});

