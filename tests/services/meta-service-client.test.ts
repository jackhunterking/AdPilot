/**
 * Test: Meta Service Client
 * Purpose: Unit tests for Meta integration operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { metaServiceClient } from '@/lib/services/client/meta-service-client';

describe('MetaServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConnectionStatus', () => {
    it('should get connection status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            connected: true,
            paymentConnected: false,
            adminConnected: false,
            status: 'connected'
          } 
        })
      });

      const result = await metaServiceClient.getConnectionStatus.execute({ campaignId: 'campaign-id' });

      expect(result.success).toBe(true);
      expect(result.data?.connected).toBe(true);
    });
  });

  describe('getAssets', () => {
    it('should get Meta assets', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { businesses: [], pages: [], adAccounts: [] } 
        })
      });

      const result = await metaServiceClient.getAssets.execute({ 
        campaignId: 'campaign-id',
        type: 'all'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { verified: true } })
      });

      const result = await metaServiceClient.verifyPayment.execute({ 
        campaignId: 'campaign-id',
        adAccountId: 'account-id'
      });

      expect(result.success).toBe(true);
      expect(result.data?.verified).toBe(true);
    });
  });
});

