/**
 * Feature: Campaign Service Tests
 * Purpose: Unit tests for campaign service
 * References:
 *  - Service: lib/services/campaign-service-impl.ts
 *  - Vitest: Testing framework
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { campaignService } from '@/lib/services/campaign-service-impl';
import type { CreateCampaignInput } from '@/lib/services/contracts/campaign-service.interface';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-campaign-id',
              name: 'Test Campaign',
              status: 'draft',
              user_id: 'test-user-id',
            },
            error: null,
          }),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-campaign-id',
              name: 'Test Campaign',
            },
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-campaign-id', name: 'Updated' },
              error: null,
            }),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  })),
}));

describe('CampaignService', () => {
  describe('createCampaign', () => {
    it('should create campaign successfully', async () => {
      const input: CreateCampaignInput = {
        name: 'Test Campaign',
        goalType: 'leads',
      };

      const result = await campaignService.createCampaign.execute(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Test Campaign');
    });

    it('should handle missing name with default', async () => {
      const input: CreateCampaignInput = {};

      const result = await campaignService.createCampaign.execute(input);

      expect(result.success).toBe(true);
    });
  });

  describe('getCampaign', () => {
    it('should get campaign by ID', async () => {
      const result = await campaignService.getCampaign.execute('test-campaign-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign', async () => {
      const result = await campaignService.updateCampaign.execute({
        id: 'test-campaign-id',
        name: 'Updated Campaign',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated');
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign', async () => {
      const result = await campaignService.deleteCampaign.execute('test-campaign-id');

      expect(result.success).toBe(true);
    });
  });
});

