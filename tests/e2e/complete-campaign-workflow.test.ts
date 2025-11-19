/**
 * Feature: E2E Campaign Creation Workflow Test
 * Purpose: Test complete campaign creation flow from start to finish
 * References:
 *  - Vitest: https://vitest.dev/
 *  - API v1: app/api/v1/
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * E2E Test: Complete Campaign Creation Workflow
 * 
 * Tests the full campaign creation flow:
 * 1. Create campaign
 * 2. Create ad
 * 3. Add creative (location, copy, etc.)
 * 4. Validate data persists
 * 
 * NOTE: This test requires:
 * - Supabase connection
 * - Valid auth token
 * - Proper database setup
 * 
 * For no-code developer:
 * These tests verify the complete flow works end-to-end.
 * If tests fail, it indicates an issue in the API layer or database.
 */

describe('E2E: Complete Campaign Workflow', () => {
  let authToken: string;
  let campaignId: string;
  let adId: string;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // TODO: Setup test user and get auth token
    // For now, skip if no auth token provided
    authToken = process.env.TEST_AUTH_TOKEN || '';
    
    if (!authToken) {
      console.warn('⚠️  E2E tests skipped - TEST_AUTH_TOKEN not provided');
      console.warn('   Set TEST_AUTH_TOKEN environment variable to run E2E tests');
    }
  });

  afterAll(async () => {
    // TODO: Cleanup test data (delete campaign)
    if (campaignId && authToken) {
      try {
        await fetch(`${baseUrl}/api/v1/campaigns/${campaignId}`, {
          method: 'DELETE',
          headers: {
            Cookie: `sb-auth-token=${authToken}`,
          },
        });
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }
  });

  it('should create a campaign successfully', async () => {
    if (!authToken) {
      console.log('⏭️  Skipping: No auth token');
      return;
    }

    const response = await fetch(`${baseUrl}/api/v1/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-auth-token=${authToken}`,
      },
      body: JSON.stringify({
        name: 'E2E Test Campaign',
        goalType: 'leads',
      }),
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.campaign).toBeDefined();
    expect(result.data.campaign.name).toBe('E2E Test Campaign');
    
    campaignId = result.data.campaign.id;
  });

  it('should create an ad for the campaign', async () => {
    if (!authToken || !campaignId) {
      console.log('⏭️  Skipping: No auth or campaign');
      return;
    }

    const response = await fetch(`${baseUrl}/api/v1/ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-auth-token=${authToken}`,
      },
      body: JSON.stringify({
        campaignId,
        name: 'Test Ad',
        status: 'draft',
      }),
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.ad).toBeDefined();
    expect(result.data.ad.name).toBe('Test Ad');
    
    adId = result.data.ad.id;
  });

  it('should add locations to the ad', async () => {
    if (!authToken || !adId) {
      console.log('⏭️  Skipping: No auth or ad');
      return;
    }

    const response = await fetch(`${baseUrl}/api/v1/ads/${adId}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-auth-token=${authToken}`,
      },
      body: JSON.stringify({
        locations: [
          {
            name: 'Toronto, Ontario, Canada',
            type: 'city',
            coordinates: [-79.383935, 43.653482],
            mode: 'include',
          },
        ],
      }),
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.count).toBe(1);
  });

  it('should retrieve the ad with all data', async () => {
    if (!authToken || !adId) {
      console.log('⏭️  Skipping: No auth or ad');
      return;
    }

    const response = await fetch(`${baseUrl}/api/v1/ads/${adId}`, {
      headers: {
        Cookie: `sb-auth-token=${authToken}`,
      },
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.ad).toBeDefined();
    expect(result.data.ad.id).toBe(adId);
  });

  it('should handle unauthorized requests properly', async () => {
    const response = await fetch(`${baseUrl}/api/v1/campaigns`);
    
    expect(response.status).toBe(401);
    
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe('unauthorized');
  });

  it('should handle invalid data properly', async () => {
    if (!authToken) {
      console.log('⏭️  Skipping: No auth token');
      return;
    }

    const response = await fetch(`${baseUrl}/api/v1/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-auth-token=${authToken}`,
      },
      body: JSON.stringify({
        // Missing required fields on purpose
        invalidField: 'test',
      }),
    });

    // Should handle gracefully and create with defaults
    // OR return validation error
    expect([200, 201, 400]).toContain(response.status);
  });
});

/**
 * Setup Instructions for No-Code Developer:
 * 
 * 1. Get a test auth token from Supabase:
 *    - Login to your app
 *    - Open browser DevTools → Application → Cookies
 *    - Copy the Supabase auth token value
 *    - Set as environment variable: TEST_AUTH_TOKEN=your-token
 * 
 * 2. Run tests:
 *    npm test tests/e2e/complete-campaign-workflow.test.ts
 * 
 * 3. Expected Results:
 *    - All tests pass if API is working correctly
 *    - Tests skip if no auth token provided
 *    - Failures indicate API layer issues
 * 
 * 4. Troubleshooting:
 *    - Check Supabase is running
 *    - Verify RLS policies are correct
 *    - Check API routes are accessible
 *    - Review console logs for errors
 */

