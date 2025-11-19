/**
 * Feature: Snapshot Loading Integration Tests
 * Purpose: Verify snapshot building and loading from normalized tables
 * References:
 *  - adDataService: lib/services/ad-data-service.ts
 *  - API v1: app/api/v1/ads/[id]/save/route.ts
 */

import { describe, it, expect } from 'vitest';
import { adDataService } from '@/lib/services/ad-data-service';
import type { CompleteAdData } from '@/lib/services/ad-data-service';

describe('Snapshot Loading Integration', () => {
  it('should build snapshot from normalized tables with all sections', () => {
    // Mock complete ad data
    const mockAdData: CompleteAdData = {
      ad: {
        id: 'test-ad',
        campaign_id: 'test-campaign',
        name: 'Test Ad',
        status: 'draft',
        selected_creative_id: '1',
        selected_copy_id: '1',
        destination_type: 'website',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'test-user',
        creative_data: null,
        copy_data: null,
        setup_snapshot: null,
        meta_ad_id: null,
        meta_campaign_id: null,
        meta_adset_id: null,
      },
      creatives: [
        {
          id: '1',
          ad_id: 'test-ad',
          image_url: 'http://example.com/1.jpg',
          is_base_image: true,
          creative_format: 'feed',
          creative_style: null,
          variation_label: 'Variation 1',
          sort_order: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          ad_id: 'test-ad',
          image_url: 'http://example.com/2.jpg',
          is_base_image: false,
          creative_format: 'feed',
          creative_style: null,
          variation_label: 'Variation 2',
          sort_order: 1,
          created_at: new Date().toISOString(),
        },
      ],
      copyVariations: [
        {
          id: '1',
          ad_id: 'test-ad',
          headline: 'Test Headline',
          primary_text: 'Test primary text',
          description: 'Test description',
          cta_text: 'Learn More',
          is_selected: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
        },
      ],
      locations: [
        {
          id: 'loc-1',
          ad_id: 'test-ad',
          location_name: 'Toronto, Ontario, Canada',
          location_type: 'city',
          inclusion_mode: 'include',
          coordinates: [-79.383935, 43.653482],
          radius_miles: null,
          meta_location_key: '2490299',
          country_code: 'CA',
          bbox: null,
          geometry: null,
          created_at: new Date().toISOString(),
        },
      ],
      destination: {
        id: 'dest-1',
        ad_id: 'test-ad',
        destination_type: 'website_url',
        website_url: 'https://example.com',
        display_link: 'example.com',
        phone_number: null,
        phone_formatted: null,
        instant_form_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      budget: {
        id: 'budget-1',
        ad_id: 'test-ad',
        daily_budget_cents: 2000,
        currency_code: 'USD',
        start_time: null,
        end_time: null,
        timezone: 'America/New_York',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const snapshot = adDataService.buildSnapshot(mockAdData);

    // Verify creative section
    expect(snapshot.creative).toBeDefined();
    expect(snapshot.creative.imageVariations).toHaveLength(2);
    expect(snapshot.creative.imageVariations).toContain('http://example.com/1.jpg');
    expect(snapshot.creative.imageVariations).toContain('http://example.com/2.jpg');
    expect(snapshot.creative.selectedImageIndex).toBe(0); // First creative is selected

    // Verify copy section
    expect(snapshot.copy).toBeDefined();
    expect(snapshot.copy.variations).toHaveLength(1);
    expect(snapshot.copy.variations[0].headline).toBe('Test Headline');
    expect(snapshot.copy.selectedCopyIndex).toBe(0);

    // Verify location section
    expect(snapshot.location).toBeDefined();
    expect(snapshot.location.locations).toHaveLength(1);
    expect(snapshot.location.locations[0].name).toBe('Toronto, Ontario, Canada');
    expect(snapshot.location.locations[0].mode).toBe('include');

    // Verify destination section
    expect(snapshot.destination).toBeDefined();
    expect(snapshot.destination?.type).toBe('website');
    expect(snapshot.destination?.url).toBe('https://example.com');

    // Verify budget section
    expect(snapshot.budget).toBeDefined();
    expect(snapshot.budget?.dailyBudget).toBe(20); // 2000 cents = $20
    expect(snapshot.budget?.currency).toBe('USD');
  });

  it('should handle empty sections gracefully', () => {
    const mockAdData: CompleteAdData = {
      ad: {
        id: 'test-ad',
        campaign_id: 'test-campaign',
        name: 'Test Ad',
        status: 'draft',
        selected_creative_id: null,
        selected_copy_id: null,
        destination_type: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'test-user',
        creative_data: null,
        copy_data: null,
        setup_snapshot: null,
        meta_ad_id: null,
        meta_campaign_id: null,
        meta_adset_id: null,
      },
      creatives: [],
      copyVariations: [],
      locations: [],
      destination: null,
      budget: null,
    };

    const snapshot = adDataService.buildSnapshot(mockAdData);

    // Should not throw, just return empty sections
    expect(snapshot.creative.imageVariations).toEqual([]);
    expect(snapshot.copy.variations).toEqual([]);
    expect(snapshot.location.locations).toEqual([]);
    expect(snapshot.destination).toBeNull();
    expect(snapshot.budget).toBeNull();
  });

  it('should calculate completed steps correctly', () => {
    // Helper function to calculate completed steps
    function calculateCompletedSteps(snapshot: unknown): string[] {
      const steps: string[] = [];
      const s = snapshot as Record<string, unknown>;

      const creative = s.creative as Record<string, unknown> | undefined;
      if (
        creative?.imageVariations &&
        Array.isArray(creative.imageVariations) &&
        creative.imageVariations.length > 0 &&
        typeof creative.selectedImageIndex === 'number'
      ) {
        steps.push('ads');
      }

      const copy = s.copy as Record<string, unknown> | undefined;
      if (
        copy?.variations &&
        Array.isArray(copy.variations) &&
        copy.variations.length > 0 &&
        typeof copy.selectedCopyIndex === 'number'
      ) {
        steps.push('copy');
      }

      const destination = s.destination as Record<string, unknown> | undefined | null;
      if (destination?.type) {
        steps.push('destination');
      }

      const location = s.location as Record<string, unknown> | undefined;
      if (
        location?.locations &&
        Array.isArray(location.locations) &&
        location.locations.length > 0
      ) {
        steps.push('location');
      }

      return steps;
    }

    const snapshot = {
      creative: { imageVariations: ['url'], selectedImageIndex: 0 },
      copy: { variations: [{}], selectedCopyIndex: 0 },
      destination: { type: 'website' },
      location: { locations: [] }, // Empty
    };

    const steps = calculateCompletedSteps(snapshot);

    expect(steps).toContain('ads');
    expect(steps).toContain('copy');
    expect(steps).toContain('destination');
    expect(steps).not.toContain('location'); // Empty locations
  });

  it('should not mark steps complete if selection is missing', () => {
    function calculateCompletedSteps(snapshot: unknown): string[] {
      const steps: string[] = [];
      const s = snapshot as Record<string, unknown>;

      const creative = s.creative as Record<string, unknown> | undefined;
      if (
        creative?.imageVariations &&
        Array.isArray(creative.imageVariations) &&
        creative.imageVariations.length > 0 &&
        typeof creative.selectedImageIndex === 'number'
      ) {
        steps.push('ads');
      }

      const copy = s.copy as Record<string, unknown> | undefined;
      if (
        copy?.variations &&
        Array.isArray(copy.variations) &&
        copy.variations.length > 0 &&
        typeof copy.selectedCopyIndex === 'number'
      ) {
        steps.push('copy');
      }

      return steps;
    }

    const snapshot = {
      creative: { imageVariations: ['url'], selectedImageIndex: null }, // No selection
      copy: { variations: [{}], selectedCopyIndex: null }, // No selection
    };

    const steps = calculateCompletedSteps(snapshot);

    expect(steps).not.toContain('ads'); // Should not be complete
    expect(steps).not.toContain('copy'); // Should not be complete
  });
});

