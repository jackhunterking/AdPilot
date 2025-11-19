/**
 * Feature: Destination Service Client (Full Implementation)
 * Purpose: Client-side destination configuration operations
 * Microservices: Client service layer calling API routes
 * References:
 *  - Contract: lib/services/contracts/destination-service.interface.ts
 */

"use client";

import type { 
  DestinationService,
  SetupDestinationInput,
  DestinationConfiguration,
  GetMetaFormsInput,
  MetaForm,
  LeadFormConfiguration,
} from '../contracts/destination-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';
import { normalizePhoneForMeta } from '@/lib/utils/normalize';

/**
 * Destination Service Client (Full Implementation)
 * 
 * Client-side implementation that calls API v1 endpoints for destination setup.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/ads/[id]/save and /api/v1/meta/forms endpoints
 * - Validates URLs and phone numbers
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class DestinationServiceClient implements DestinationService {
  setupDestination = {
    async execute(input: SetupDestinationInput): Promise<ServiceResult<void>> {
      try {
        const response = await fetch(`/api/v1/ads/${input.adId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            destination: input.configuration,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to setup destination',
          },
        };
      }
    }
  };

  getDestination = {
    async execute(adId: string): Promise<ServiceResult<DestinationConfiguration | null>> {
      try {
        const response = await fetch(`/api/v1/ads/${adId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { 
          success: true; 
          data: { ad: { setup_snapshot?: { destination?: DestinationConfiguration } } } 
        };
        const destination = successResult.data.ad.setup_snapshot?.destination || null;
        
        return {
          success: true,
          data: destination,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get destination',
          },
        };
      }
    }
  };

  listMetaForms = {
    async execute(input: GetMetaFormsInput): Promise<ServiceResult<MetaForm[]>> {
      try {
        const pageIdParam = input.pageId ? `&pageId=${input.pageId}` : '';
        const response = await fetch(`/api/v1/meta/forms?campaignId=${input.campaignId}${pageIdParam}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { forms: MetaForm[] } };
        return {
          success: true,
          data: successResult.data.forms,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to list Meta forms',
          },
        };
      }
    }
  };

  getMetaForm = {
    async execute(input: { formId: string; campaignId: string }): Promise<ServiceResult<MetaForm>> {
      try {
        const response = await fetch(`/api/v1/meta/forms/${input.formId}?campaignId=${input.campaignId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { form: MetaForm } };
        return {
          success: true,
          data: successResult.data.form,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get Meta form',
          },
        };
      }
    }
  };

  validateWebsiteUrl = {
    async execute(url: string): Promise<ServiceResult<{ valid: boolean; error?: string }>> {
      try {
        // Validate URL format
        const urlObj = new URL(url);
        
        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return {
            success: true,
            data: {
              valid: false,
              error: 'URL must use http:// or https:// protocol',
            },
          };
        }
        
        // Check hostname exists
        if (!urlObj.hostname) {
          return {
            success: true,
            data: {
              valid: false,
              error: 'URL must have a valid hostname',
            },
          };
        }
        
        return {
          success: true,
          data: { valid: true },
        };
      } catch (error) {
        return {
          success: true,
          data: {
            valid: false,
            error: 'Invalid URL format',
          },
        };
      }
    }
  };

  validatePhoneNumber = {
    async execute(input: { phoneNumber: string; countryCode: string }): Promise<ServiceResult<{ valid: boolean; formatted?: string; error?: string }>> {
      try {
        // Normalize phone number
        const normalizeResult = normalizePhoneForMeta(input.phoneNumber, input.countryCode);
        
        if (!normalizeResult.valid) {
          return {
            success: true,
            data: {
              valid: false,
              error: normalizeResult.reason || 'Invalid phone number format',
            },
          };
        }
        
        return {
          success: true,
          data: {
            valid: true,
            formatted: normalizeResult.e164,
          },
        };
      } catch (error) {
        return {
          success: true,
          data: {
            valid: false,
            error: 'Failed to validate phone number',
          },
        };
      }
    }
  };

  createMetaForm = {
    async execute(input: { campaignId: string; pageId: string; configuration: LeadFormConfiguration }): Promise<ServiceResult<{ formId: string }>> {
      try {
        // This would typically create a form via Meta API
        // For now, return a placeholder - actual implementation needs Meta API endpoint
        const response = await fetch('/api/v1/meta/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            campaignId: input.campaignId,
            pageId: input.pageId,
            configuration: input.configuration,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { formId: string } };
        return {
          success: true,
          data: { formId: successResult.data.formId },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to create Meta form',
          },
        };
      }
    }
  };
}

export const destinationServiceClient = new DestinationServiceClient();
