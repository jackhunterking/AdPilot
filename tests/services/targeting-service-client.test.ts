/**
 * Test: Targeting Service Client
 * Purpose: Unit tests for location targeting operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { targetingServiceClient } from '@/lib/services/client/targeting-service-client';

describe('TargetingServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addLocations', () => {
    it('should add locations to ad', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { locations: [{ id: '1', name: 'Toronto', type: 'city', mode: 'include', coordinates: [-79.38, 43.65] }], count: 1 } 
        })
      });

      const result = await targetingServiceClient.addLocations.execute({
        adId: 'ad-id',
        locations: [{ name: 'Toronto', type: 'city', mode: 'include' }]
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(1);
    });
  });

  describe('removeLocation', () => {
    it('should remove location from ad', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await targetingServiceClient.removeLocation.execute({
        adId: 'ad-id',
        locationId: 'location-id'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('clearLocations', () => {
    it('should clear all locations', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await targetingServiceClient.clearLocations.execute('ad-id');

      expect(result.success).toBe(true);
    });
  });
});

