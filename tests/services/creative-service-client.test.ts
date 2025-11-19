/**
 * Test: Creative Service Client
 * Purpose: Unit tests for creative/image generation operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { creativeServiceClient } from '@/lib/services/client/creative-service-client';

describe('CreativeServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVariations', () => {
    it('should generate image variations', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { variations: [{ url: 'http://example.com/image.jpg', index: 0, format: 'square', dimensions: { width: 1024, height: 1024 } }] } 
        })
      });

      const result = await creativeServiceClient.generateVariations.execute({
        prompt: 'Test image',
        campaignId: 'campaign-id',
        count: 3
      });

      expect(result.success).toBe(true);
      expect(result.data?.variations).toHaveLength(1);
    });
  });

  describe('editVariation', () => {
    it('should edit single variation', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { imageUrl: 'http://example.com/edited.jpg' } })
      });

      const result = await creativeServiceClient.editVariation.execute({
        imageUrl: 'http://example.com/original.jpg',
        prompt: 'Make it blue',
        variationIndex: 0,
        campaignId: 'campaign-id'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('selectVariation', () => {
    it('should select variation', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      const result = await creativeServiceClient.selectVariation.execute({
        adId: 'ad-id',
        variationIndex: 1
      });

      expect(result.success).toBe(true);
    });
  });
});

