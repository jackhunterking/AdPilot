/**
 * Test: Campaign Service Client
 * Purpose: Unit tests for campaign service operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { campaignServiceClient } from '@/lib/services/client/campaign-service-client';

describe('CampaignServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('should call API correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { campaign: { id: 'test-id', name: 'Test Campaign' } } })
      });

      const result = await campaignServiceClient.createCampaign.execute({
        name: 'Test Campaign',
        prompt: 'Test prompt',
        goalType: 'leads'
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: expect.any(String)
      });
    });

    it('should handle errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: { code: 'error', message: 'Error' } })
      });

      const result = await campaignServiceClient.createCampaign.execute({ name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('listCampaigns', () => {
    it('should fetch campaigns list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { campaigns: [] } })
      });

      const result = await campaignServiceClient.listCampaigns.execute({ userId: 'user-id' });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/campaigns?limit=50', expect.any(Object));
    });
  });
});

