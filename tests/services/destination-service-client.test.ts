/**
 * Test: Destination Service Client
 * Purpose: Unit tests for destination configuration operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { destinationServiceClient } from '@/lib/services/client/destination-service-client';

describe('DestinationServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupDestination', () => {
    it('should setup destination', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await destinationServiceClient.setupDestination.execute({
        adId: 'ad-id',
        configuration: {
          type: 'website_url',
          data: { websiteUrl: 'https://example.com' }
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('validateWebsiteUrl', () => {
    it('should validate correct URL', async () => {
      const result = await destinationServiceClient.validateWebsiteUrl.execute('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    });

    it('should reject invalid URL', async () => {
      const result = await destinationServiceClient.validateWebsiteUrl.execute('not-a-url');

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate phone number', async () => {
      const result = await destinationServiceClient.validatePhoneNumber.execute({
        phoneNumber: '+1234567890',
        countryCode: 'US'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('listMetaForms', () => {
    it('should list Meta forms', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { forms: [] } })
      });

      const result = await destinationServiceClient.listMetaForms.execute({ campaignId: 'campaign-id' });

      expect(result.success).toBe(true);
    });
  });
});

