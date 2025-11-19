/**
 * Test: Copy Service Client
 * Purpose: Unit tests for copy generation and editing operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyServiceClient } from '@/lib/services/client/copy-service-client';

describe('CopyServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCopyVariations', () => {
    it('should generate copy variations', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            copyVariations: [
              { headline: 'Test Headline', primaryText: 'Test primary text', cta: 'Learn More' }
            ] 
          } 
        })
      });

      const result = await copyServiceClient.generateCopyVariations.execute({
        prompt: 'Generate copy',
        goal: 'leads',
        campaignId: 'campaign-id',
        count: 3
      });

      expect(result.success).toBe(true);
      expect(result.data?.variations).toHaveLength(1);
    });
  });

  describe('validateCopy', () => {
    it('should validate copy correctly', async () => {
      const result = await copyServiceClient.validateCopy.execute({
        headline: 'Valid Headline',
        primaryText: 'Valid primary text',
        cta: 'Learn More'
      });

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    });

    it('should reject copy exceeding character limits', async () => {
      const result = await copyServiceClient.validateCopy.execute({
        headline: 'A'.repeat(50), // Exceeds 40 char limit
        primaryText: 'Valid text',
        cta: 'Learn More'
      });

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
      expect(result.data?.errors).toContain(expect.stringContaining('Headline too long'));
    });
  });
});

