/**
 * Feature: API v1 Type Definitions
 * Purpose: Complete type safety for v1 API
 * References:
 *  - TypeScript: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
 *  - API v1: MASTER_API_DOCUMENTATION.mdc
 */

import type { Database } from '@/lib/supabase/database.types';

// Standard responses (from MASTER_API_DOCUMENTATION)
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Campaign types
export type Campaign = Database['public']['Tables']['campaigns']['Row'];

export interface CreateCampaignRequest {
  name?: string;
  tempPromptId?: string;
  prompt?: string;
  goalType?: string;
}

// Ad types
export type Ad = Database['public']['Tables']['ads']['Row'];

export interface CreateAdRequest {
  name: string;
  campaignId: string;
  status?: 'draft' | 'active';
  creative_data?: unknown;
  copy_data?: unknown;
}

// Location types
export interface Location {
  id: string;
  name: string;
  coordinates: [number, number];
  type: 'city' | 'region' | 'country' | 'radius';
  mode: 'include' | 'exclude';
  radius?: number;
  bbox?: [number, number, number, number];
  geometry?: {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  key?: string;
  country_code?: string;
}

export interface AddLocationsRequest {
  locations: Array<Omit<Location, 'id'>>;
}

export interface AddLocationsResponse {
  success: true;
  count: number;
  locations: Location[];
}

// Type guards
export function isCreateCampaignRequest(body: unknown): body is CreateCampaignRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  // At least one of these must be present
  return (
    ('name' in b && typeof b.name === 'string') ||
    ('tempPromptId' in b && typeof b.tempPromptId === 'string') ||
    ('prompt' in b && typeof b.prompt === 'string')
  );
}

export function isCreateAdRequest(body: unknown): body is CreateAdRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    'name' in b && typeof b.name === 'string' &&
    'campaignId' in b && typeof b.campaignId === 'string'
  );
}

export function isAddLocationsRequest(body: unknown): body is AddLocationsRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    'locations' in b &&
    Array.isArray(b.locations) &&
    b.locations.every((loc: unknown) => {
      if (typeof loc !== 'object' || loc === null) return false;
      const l = loc as Record<string, unknown>;
      return (
        'name' in l &&
        'mode' in l &&
        (l.mode === 'include' || l.mode === 'exclude')
      );
    })
  );
}

