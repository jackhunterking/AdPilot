/**
 * Feature: Destination Service Server Implementation
 * Purpose: Server-side destination configuration (lead forms, URLs, phone)
 * References:
 *  - Destination Service Contract: lib/services/contracts/destination-service.interface.ts
 *  - Meta Forms API: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form
 */

import { supabaseServer } from '@/lib/supabase/server';
import type {
  DestinationService,
  SetupDestinationInput,
  DestinationConfiguration,
  GetMetaFormsInput,
  MetaForm,
  LeadFormConfiguration,
} from '../contracts/destination-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Destination Service Server Implementation
 * Handles destination setup and Meta forms integration
 */
class DestinationServiceServer implements DestinationService {
  setupDestination = {
    async execute(input: SetupDestinationInput): Promise<ServiceResult<void>> {
      try {
        // Update ads table with destination type only
        // NOTE: destination_data column no longer exists, use ad_destinations table
        const { error } = await supabaseServer
          .from('ads')
          .update({
            destination_type: input.configuration.type,
          })
          .eq('id', input.adId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  getDestination = {
    async execute(adId: string): Promise<ServiceResult<DestinationConfiguration | null>> {
      try {
        // Get destination type from ads table
        const { data: adData, error: adError } = await supabaseServer
          .from('ads')
          .select('destination_type')
          .eq('id', adId)
          .single();

        if (adError || !adData) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: 'Ad not found',
            },
          };
        }

        if (!adData.destination_type) {
          return {
            success: true,
            data: null,
          };
        }

        // Get destination details from ad_destinations table
        const { data: destData } = await supabaseServer
          .from('ad_destinations')
          .select('*')
          .eq('ad_id', adId)
          .single();

        return {
          success: true,
          data: {
            type: adData.destination_type as DestinationConfiguration['type'],
            data: (destData || {}) as DestinationConfiguration['data'],
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  validateWebsiteUrl = {
    async execute(url: string): Promise<ServiceResult<{ valid: boolean; error?: string }>> {
      try {
        // Basic URL validation
        try {
          new URL(url);
          
          // Check protocol
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return {
              success: true,
              data: { valid: false, error: 'URL must start with http:// or https://' },
            };
          }

          return {
            success: true,
            data: { valid: true },
          };
        } catch {
          return {
            success: true,
            data: { valid: false, error: 'Invalid URL format' },
          };
        }
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'validation_failed',
            message: error instanceof Error ? error.message : 'URL validation failed',
          },
        };
      }
    },
  };

  validatePhoneNumber = {
    async execute(input: { phoneNumber: string; countryCode: string }): Promise<ServiceResult<{ valid: boolean; formatted?: string; error?: string }>> {
      try {
        // TODO: Implement proper phone number validation using libphonenumber or similar
        // For now, basic validation
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        const valid = phoneRegex.test(input.phoneNumber);

        return {
          success: true,
          data: {
            valid,
            formatted: valid ? input.phoneNumber : undefined,
            error: valid ? undefined : 'Invalid phone number format',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'validation_failed',
            message: error instanceof Error ? error.message : 'Phone validation failed',
          },
        };
      }
    },
  };

  listMetaForms = {
    async execute(_input: GetMetaFormsInput): Promise<ServiceResult<MetaForm[]>> {
      try {
        // TODO: Implement Meta Forms API fetching
        // Would query Meta Graph API for page's lead gen forms
        
        throw new Error('Not implemented - Meta Forms listing requires Meta API integration');
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Failed to list forms',
          },
        };
      }
    },
  };

  getMetaForm = {
    async execute(_input: { formId: string; campaignId: string }): Promise<ServiceResult<MetaForm>> {
      try {
        // TODO: Implement Meta Form details fetching
        throw new Error('Not implemented - Meta Form details requires Meta API integration');
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Failed to get form',
          },
        };
      }
    },
  };

  createMetaForm = {
    async execute(_input: { campaignId: string; pageId: string; configuration: LeadFormConfiguration }): Promise<ServiceResult<{ formId: string }>> {
      try {
        // TODO: Implement Meta Form creation
        // Would call Meta Graph API to create instant form
        
        throw new Error('Not implemented - Meta Form creation requires Meta API integration');
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'creation_failed',
            message: error instanceof Error ? error.message : 'Failed to create form',
          },
        };
      }
    },
  };
}

// Export singleton instance
export const destinationServiceServer = new DestinationServiceServer();

