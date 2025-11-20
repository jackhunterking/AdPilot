/**
 * Feature: Destination Service Server Implementation
 * Purpose: Server-side destination configuration (lead forms, URLs, phone)
 * References:
 *  - Destination Service Contract: lib/services/contracts/destination-service.interface.ts
 *  - Meta Forms API: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form
 */

import { supabaseServer, createServerClient } from '@/lib/supabase/server';
import { getConnectionWithToken, fetchPagesWithTokens, getGraphVersion } from '@/lib/meta/service';
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
        // Enhanced phone validation with formatting
        let phone = input.phoneNumber.trim();
        
        // Remove common separators
        phone = phone.replace(/[\s\-\(\)\.]/g, '');
        
        // Add country code if missing
        if (!phone.startsWith('+')) {
          phone = `+${input.countryCode}${phone}`;
        }
        
        // E.164 format validation (international standard)
        // Format: +[country code][number] (max 15 digits)
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        const valid = e164Regex.test(phone);
        
        // Additional check: minimum 7 digits (country code + area + number)
        const digitCount = phone.replace(/\D/g, '').length;
        const hasMinimumDigits = digitCount >= 7;
        
        const isValid = valid && hasMinimumDigits;

        return {
          success: true,
          data: {
            valid: isValid,
            formatted: isValid ? phone : undefined,
            error: isValid ? undefined : 'Invalid phone number. Must be 7-15 digits with country code.',
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
    async execute(input: GetMetaFormsInput): Promise<ServiceResult<MetaForm[]>> {
      try {
        // Get Meta connection for campaign
        const conn = await getConnectionWithToken({ campaignId: input.campaignId });
        
        if (!conn?.selected_page_id || !conn?.long_lived_user_token) {
          return {
            success: false,
            error: {
              code: 'no_connection',
              message: 'No Meta connection found. Please connect Meta first.',
            },
          };
        }

        const pageId = input.pageId || conn.selected_page_id;
        let pageAccessToken = conn.selected_page_access_token || '';

        // If no stored page access token, derive it
        if (!pageAccessToken) {
          const pages = await fetchPagesWithTokens({ token: conn.long_lived_user_token });
          const match = pages.find(p => p.id === pageId);
          pageAccessToken = match?.access_token || '';
        }

        if (!pageAccessToken) {
          return {
            success: false,
            error: {
              code: 'token_missing',
              message: 'Page access token not available',
            },
          };
        }

        // Fetch lead gen forms from Meta Graph API
        const gv = getGraphVersion();
        const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(pageId)}/leadgen_forms?fields=id,name,created_time`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          const error = await res.json();
          return {
            success: false,
            error: {
              code: 'meta_api_error',
              message: error.error?.message || 'Failed to fetch forms from Meta',
            },
          };
        }

        const json = await res.json();
        const forms = (json.data || []) as Array<{ id: string; name?: string; created_time?: string }>;

        return {
          success: true,
          data: forms.map(f => ({
            id: f.id,
            name: f.name,
            createdTime: f.created_time,
          })),
        };
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
    async execute(input: { formId: string; campaignId: string }): Promise<ServiceResult<MetaForm>> {
      try {
        // Get Meta connection for campaign
        const conn = await getConnectionWithToken({ campaignId: input.campaignId });
        
        if (!conn?.selected_page_id || !conn?.long_lived_user_token) {
          return {
            success: false,
            error: {
              code: 'no_connection',
              message: 'No Meta connection found',
            },
          };
        }

        const pageId = conn.selected_page_id;
        let pageAccessToken = conn.selected_page_access_token || '';

        // If no stored page access token, derive it
        if (!pageAccessToken) {
          const pages = await fetchPagesWithTokens({ token: conn.long_lived_user_token });
          const match = pages.find(p => p.id === pageId);
          pageAccessToken = match?.access_token || '';
        }

        if (!pageAccessToken) {
          return {
            success: false,
            error: {
              code: 'token_missing',
              message: 'Page access token not available',
            },
          };
        }

        // Fetch form details from Meta Graph API
        const gv = getGraphVersion();
        const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(input.formId)}?fields=id,name,questions{type,key,label},thank_you_page{title,body,button_text,website_url}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${pageAccessToken}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          const error = await res.json();
          return {
            success: false,
            error: {
              code: 'meta_api_error',
              message: error.error?.message || 'Failed to fetch form details',
            },
          };
        }

        const form = await res.json();

        return {
          success: true,
          data: {
            id: form.id,
            name: form.name,
            questions: form.questions?.data || [],
            thankYouPage: form.thank_you_page,
          },
        };
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
    async execute(input: { campaignId: string; pageId: string; configuration: LeadFormConfiguration }): Promise<ServiceResult<{ formId: string }>> {
      try {
        const supabase = await createServerClient();
        
        // Get user and verify ownership
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            error: { code: 'unauthorized', message: 'Not authenticated' }
          };
        }

        // Get page access token from campaign_meta_connections
        const { data: connection } = await supabase
          .from('campaign_meta_connections')
          .select('selected_page_access_token, selected_page_id')
          .eq('campaign_id', input.campaignId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!connection?.selected_page_access_token) {
          return {
            success: false,
            error: { code: 'no_token', message: 'Page access token not found. Please reconnect Meta account.' }
          };
        }

        const pageId = input.pageId || connection.selected_page_id;
        if (!pageId) {
          return {
            success: false,
            error: { code: 'no_page', message: 'Page ID not found' }
          };
        }

        // Build Meta lead gen form payload
        const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0';
        const formUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/leadgen_forms`;

        // Transform configuration to Meta API format
        const questions = input.configuration.fields.map(field => ({
          type: field.type.toUpperCase(), // EMAIL, PHONE, FULL_NAME, etc.
          label: field.label,
          key: field.key || field.type,
        }));

        const payload = {
          name: input.configuration.name,
          privacy_policy_url: input.configuration.privacyPolicyUrl,
          ...(input.configuration.introHeadline && { 
            intro_headline: input.configuration.introHeadline 
          }),
          ...(input.configuration.introDescription && { 
            intro_description: input.configuration.introDescription 
          }),
          ...(input.configuration.thankYouTitle && { 
            thank_you_title: input.configuration.thankYouTitle 
          }),
          ...(input.configuration.thankYouMessage && { 
            thank_you_message: input.configuration.thankYouMessage 
          }),
          questions,
          access_token: connection.selected_page_access_token,
        };

        const response = await fetch(formUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: {
              code: 'meta_api_error',
              message: error.error?.message || 'Failed to create form on Meta',
            }
          };
        }

        const result = await response.json();
        
        // Save form to local database for tracking
        await supabase
          .from('instant_forms')
          .insert({
            campaign_id: input.campaignId,
            user_id: user.id,
            meta_form_id: result.id,
            name: input.configuration.name,
            intro_headline: input.configuration.introHeadline || '',
            intro_description: input.configuration.introDescription || '',
            privacy_policy_url: input.configuration.privacyPolicyUrl,
            thank_you_title: input.configuration.thankYouTitle || 'Thank You!',
            thank_you_message: input.configuration.thankYouMessage || 'We\'ll be in touch soon.',
          });

        return {
          success: true,
          data: {
            formId: result.id,
          },
        };
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

