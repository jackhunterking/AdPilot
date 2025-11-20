/**
 * Feature: Lovable Integration - Conversion Tracking Types
 * Purpose: Type definitions for tracking signups and conversions from Lovable projects
 * References:
 *  - Webhook endpoint: /api/v1/webhooks/lovable/[projectId]/signup
 *  - Edge Function integration: User's Lovable project calls our webhook
 */

/**
 * Conversion record stored in AdPilot database
 */
export interface LovableConversion {
  id: string;
  campaignId: string;
  userId: string;
  conversionType: ConversionType;
  conversionData: ConversionData;
  source: ConversionSource;
  timestamp: string;
  createdAt: string;
}

/**
 * Types of conversions we track
 */
export type ConversionType = 'signup' | 'purchase' | 'call' | 'form_submit' | 'custom';

/**
 * Source of the conversion
 */
export type ConversionSource = 
  | 'lovable_webhook' 
  | 'lovable_edge_function' 
  | 'meta_pixel' 
  | 'custom_webhook';

/**
 * Conversion data payload (flexible schema)
 */
export interface ConversionData {
  email?: string;
  name?: string;
  phone?: string;
  [key: string]: unknown;
}

/**
 * Input for recording a conversion (from webhook)
 */
export interface ConversionInput {
  lovableProjectId: string;
  conversionType: ConversionType;
  conversionData: ConversionData;
  source: ConversionSource;
  timestamp: string;
}

/**
 * Webhook payload from Lovable Edge Function
 */
export interface WebhookConversionData {
  event: 'signup' | 'conversion';
  email?: string;
  name?: string;
  phone?: string;
  customData?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Conversion query options
 */
export interface ConversionQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  conversionType?: ConversionType;
  source?: ConversionSource;
}

/**
 * Conversion rate calculation
 */
export interface ConversionRate {
  totalClicks: number;
  totalConversions: number;
  rate: number; // percentage (0-100)
  period: DateRange;
}

/**
 * Date range for queries
 */
export interface DateRange {
  startDate: string; // ISO date
  endDate: string;   // ISO date
}

/**
 * Edge Function template data
 * Generated for user to copy-paste into their Lovable project
 */
export interface EdgeFunctionTemplate {
  functionName: string;
  webhookUrl: string;
  code: string; // Full Edge Function code
  instructions: string[]; // Step-by-step setup
}

/**
 * Conversion summary for analytics
 */
export interface ConversionSummary {
  campaignId: string;
  totalConversions: number;
  conversionsByType: Record<ConversionType, number>;
  conversionsBySource: Record<ConversionSource, number>;
  conversionRate: number;
  lastConversionAt: string | null;
  dateRange: DateRange;
}

