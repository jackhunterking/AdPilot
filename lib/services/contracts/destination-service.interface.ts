/**
 * Feature: Destination Service Contract
 * Purpose: Interface for lead form, website URL, and phone destination management
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - Meta Instant Forms API
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Destination Types
// ============================================================================

export type DestinationType = 'instant_form' | 'website_url' | 'phone';

export interface LeadFormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'dropdown' | 'checkbox';
  required: boolean;
  options?: string[]; // For dropdown
}

export interface LeadFormConfiguration {
  formId?: string; // For existing forms
  formType: 'instant_form' | 'existing_form';
  fields: LeadFormField[];
  privacyPolicyUrl?: string;
  thankYouMessage?: string;
}

export interface WebsiteConfiguration {
  websiteUrl: string;
  displayLink?: string;
  utmParameters?: Record<string, string>;
}

export interface PhoneConfiguration {
  phoneNumber: string;
  countryCode: string;
  displayNumber?: string;
}

export interface DestinationConfiguration {
  type: DestinationType;
  data: LeadFormConfiguration | WebsiteConfiguration | PhoneConfiguration;
}

export interface SetupDestinationInput {
  adId: string;
  configuration: DestinationConfiguration;
}

export interface GetMetaFormsInput {
  campaignId: string;
  pageId?: string;
}

export interface MetaForm {
  id: string;
  name: string;
  status: string;
  leadgen_tos_acceptance_time?: string;
  questions: Array<{
    key: string;
    label: string;
    type: string;
  }>;
}

// ============================================================================
// Destination Service Interface
// ============================================================================

export interface DestinationService {
  /**
   * Setup destination configuration for ad
   */
  setupDestination: ServiceContract<SetupDestinationInput, ServiceResult<void>>;

  /**
   * Get current destination configuration
   */
  getDestination: ServiceContract<string, ServiceResult<DestinationConfiguration | null>>;

  /**
   * Validate website URL
   */
  validateWebsiteUrl: ServiceContract<
    string,
    ServiceResult<{ valid: boolean; error?: string }>
  >;

  /**
   * Validate phone number
   */
  validatePhoneNumber: ServiceContract<
    { phoneNumber: string; countryCode: string },
    ServiceResult<{ valid: boolean; formatted?: string; error?: string }>
  >;

  /**
   * List Meta instant forms
   */
  listMetaForms: ServiceContract<GetMetaFormsInput, ServiceResult<MetaForm[]>>;

  /**
   * Get Meta form details
   */
  getMetaForm: ServiceContract<
    { formId: string; campaignId: string },
    ServiceResult<MetaForm>
  >;

  /**
   * Create Meta instant form
   */
  createMetaForm: ServiceContract<
    { campaignId: string; pageId: string; configuration: LeadFormConfiguration },
    ServiceResult<{ formId: string }>
  >;
}

