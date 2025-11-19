/**
 * Test: Budget Service Client
 * Purpose: Unit tests for budget and schedule operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { budgetServiceClient } from '@/lib/services/client/budget-service-client';

describe('BudgetServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setBudget', () => {
    it('should set budget', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { ad: { campaign_id: 'campaign-id' } } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await budgetServiceClient.setBudget.execute({
        adId: 'ad-id',
        dailyBudget: 50,
        currency: 'USD'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('validateBudget', () => {
    it('should validate correct budget', async () => {
      const result = await budgetServiceClient.validateBudget.execute({
        amount: 50,
        currency: 'USD'
      });

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    });

    it('should reject budget below minimum', async () => {
      const result = await budgetServiceClient.validateBudget.execute({
        amount: 0.5,
        currency: 'USD'
      });

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
    });
  });

  describe('getRecommendations', () => {
    it('should get budget recommendations', async () => {
      const result = await budgetServiceClient.getRecommendations.execute({
        adId: 'ad-id',
        goal: 'leads'
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedDaily).toBeGreaterThan(0);
    });
  });
});

