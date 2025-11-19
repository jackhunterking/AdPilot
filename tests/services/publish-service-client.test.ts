/**
 * Test: Publish Service Client
 * Purpose: Unit tests for ad publishing operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishServiceClient } from '@/lib/services/client/publish-service-client';

describe('PublishServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAd', () => {
    it('should validate complete ad', async () => {
      const result = await publishServiceClient.validateAd.execute({
        creative: { selectedVariationIndex: 0, variations: [{ url: 'http://example.com/img.jpg' }] },
        copy: { headline: 'Test', primaryText: 'Test text', cta: 'Learn More' },
        location: { locations: [{ id: '1', name: 'Toronto', type: 'city', mode: 'include', coordinates: [-79.38, 43.65] }] },
        destination: { type: 'website_url', data: { websiteUrl: 'https://example.com' } },
        budget: { dailyBudget: 50, currency: 'USD', selectedAdAccount: 'account-id' }
      });

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    });

    it('should reject incomplete ad', async () => {
      const result = await publishServiceClient.validateAd.execute({
        creative: {},
        copy: {},
        location: {},
        destination: {},
        budget: {}
      });

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
    });
  });

  describe('publishAd', () => {
    it('should publish ad', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { meta_ad_id: '123', status: 'active' } })
      });

      const result = await publishServiceClient.publishAd.execute('ad-id');

      expect(result.success).toBe(true);
    });
  });
});

