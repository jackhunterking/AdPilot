/**
 * Feature: Prepare Campaign for Publishing
 * Purpose: Generate and validate publish_data from campaign state before publishing
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Supabase Server Auth: https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseServer } from '@/lib/supabase/server';
import { createPayloadGenerator } from '@/lib/meta/payload-generator';
import { createPreflightValidator, type PreflightParams } from '@/lib/meta/validation/preflight-validator';
import { getConnectionWithToken } from '@/lib/meta/service';
import type { Json } from '@/lib/supabase/database.types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    // ====================================================================
    // STEP 1: AUTHENTICATE USER
    // ====================================================================
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ====================================================================
    // STEP 2: VERIFY CAMPAIGN OWNERSHIP AND LOAD DATA
    // ====================================================================
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('*, ads(id, ad_copy_variations(*))')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (campaignError || !campaign) {
      console.error('[PreparePublish] Campaign lookup failed:', campaignError);
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // ====================================================================
    // STEP 3: LOAD META CONNECTION
    // ====================================================================
    const connection = await getConnectionWithToken({ campaignId });

    if (!connection) {
      return NextResponse.json({
        error: 'Meta connection not found',
        canPublish: false,
        validationResults: {
          isValid: false,
          canPublish: false,
          errors: [{
            code: 'NO_META_CONNECTION',
            message: 'Facebook account not connected',
            severity: 'CRITICAL',
            suggestedFix: 'Connect your Facebook account'
          }],
          warnings: [],
          checkedAt: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // ====================================================================
    // STEP 4: RUN PREFLIGHT VALIDATION
    // ====================================================================
    const preflightValidator = createPreflightValidator();

    // Extract data for validation from normalized structure
    const metadata = campaign.metadata as {
      formData?: {
        id?: string;
        websiteUrl?: string;
        phoneNumber?: string;
      };
    } | null;

    const selectedGoal = campaign.initial_goal;

    // Get first ad copy from normalized tables
    const ads = campaign.ads as Array<{ ad_copy_variations: Array<{
      primary_text?: string;
      headline?: string;
      description?: string;
    }> }> | undefined;
    
    const firstCopy = ads?.[0]?.ad_copy_variations?.[0];

    // Extract destination URL from metadata
    const destinationUrl = metadata?.formData?.websiteUrl || undefined;

    const preflightParams: PreflightParams = {
      token: connection.long_lived_user_token,
      pageId: connection.selected_page_id,
      adAccountId: connection.selected_ad_account_id,
      instagramActorId: connection.selected_ig_user_id,
      tokenExpiresAt: connection.user_app_token_expires_at,
      hasPaymentConnected: connection.ad_account_payment_connected ?? false,
      campaignStates: null, // Legacy field, no longer used
      primaryText: firstCopy?.primary_text,
      headline: firstCopy?.headline,
      description: firstCopy?.description,
      destinationUrl
    };

    const validationResults = await preflightValidator.runAll(preflightParams);

    // ====================================================================
    // STEP 5: GENERATE PUBLISH_DATA (if validation passes)
    // ====================================================================
    if (validationResults.canPublish) {
      try {
        // Determine destination type and config from goal data
        const goal = selectedGoal;
        let destinationType: 'website' | 'form' | 'call' = 'website';
        let destinationConfig: {
          websiteUrl?: string;
          leadFormId?: string;
          phoneNumber?: string;
        } = {};

        if (goal === 'leads') {
          if (metadata?.formData?.id) {
            destinationType = 'form';
            destinationConfig.leadFormId = metadata.formData.id;
            destinationConfig.websiteUrl = metadata.formData.websiteUrl; // Fallback URL
          } else {
            destinationType = 'website';
            destinationConfig.websiteUrl = metadata?.formData?.websiteUrl || 'https://example.com';
          }
        } else if (goal === 'calls') {
          destinationType = 'call';
          destinationConfig.phoneNumber = metadata?.formData?.phoneNumber;
        } else {
          destinationType = 'website';
          destinationConfig.websiteUrl = metadata?.formData?.websiteUrl || 'https://example.com';
        }

        const payloadGenerator = createPayloadGenerator();

        const result = await payloadGenerator.generate(
          campaign.name,
          {
            goal_data: null, // Legacy field - goal is now in campaign.initial_goal
            location_data: null, // Legacy field - locations are now in ad_target_locations table
            budget_data: null, // Legacy field - budget is now in campaign.campaign_budget_cents
            ad_copy_data: null, // Legacy field - copy is now in ad_copy_variations table
            ad_preview_data: null // Legacy field - preview data is in ads.setup_snapshot
          },
          {
            selected_page_id: connection.selected_page_id,
            selected_ig_user_id: connection.selected_ig_user_id,
            selected_ad_account_id: connection.selected_ad_account_id,
            ad_account_currency_code: null // Currency will be fetched if needed
          },
          destinationType,
          destinationConfig
        );

        // Save publish_data to campaign metadata
        const currentMetadata = (campaign.metadata as Record<string, unknown>) || {};
        const { error: saveError } = await supabaseServer
          .from('campaigns')
          .update({
            metadata: {
              ...currentMetadata,
              publish_data: result.publishData as unknown as Json,
            } as unknown as Json,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);

        if (saveError) {
          console.error('[PreparePublish] Failed to save publish_data:', saveError);
          return NextResponse.json({
            error: 'Failed to save publish data',
            canPublish: false
          }, { status: 500 });
        }

        // Return success with preview
        return NextResponse.json({
          success: true,
          canPublish: true,
          validationResults,
          publishPreview: {
            campaignName: result.publishData.campaign.name,
            objective: result.publishData.campaign.objective,
            dailyBudget: result.publishData.adset.daily_budget 
              ? `$${(result.publishData.adset.daily_budget / 100).toFixed(2)}`
              : 'Not set',
            targeting: buildTargetingDescription(result.publishData.adset.targeting),
            adCount: result.publishData.ads.length
          },
          warnings: result.warnings
        });

      } catch (error) {
        console.error('[PreparePublish] Payload generation failed:', error);
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Failed to generate publish payload',
          canPublish: false
        }, { status: 500 });
      }
    }

    // ====================================================================
    // STEP 6: RETURN VALIDATION RESULTS (if cannot publish)
    // ====================================================================
    return NextResponse.json({
      success: false,
      canPublish: false,
      validationResults,
      errors: validationResults.errors,
      warnings: validationResults.warnings
    }, { status: 400 });

  } catch (error) {
    console.error('[PreparePublish] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
      canPublish: false
    }, { status: 500 });
  }
}

/**
 * Helper to build targeting description
 */
function buildTargetingDescription(targeting: {
  geo_locations: {
    countries?: string[];
    regions?: unknown[];
    cities?: unknown[];
  };
}): string {
  const parts: string[] = [];

  if (targeting.geo_locations.countries?.length) {
    parts.push(`${targeting.geo_locations.countries.length} ${targeting.geo_locations.countries.length === 1 ? 'country' : 'countries'}`);
  }

  if (targeting.geo_locations.regions?.length) {
    parts.push(`${targeting.geo_locations.regions.length} ${targeting.geo_locations.regions.length === 1 ? 'region' : 'regions'}`);
  }

  if (targeting.geo_locations.cities?.length) {
    parts.push(`${targeting.geo_locations.cities.length} ${targeting.geo_locations.cities.length === 1 ? 'city' : 'cities'}`);
  }

  return parts.join(', ') || 'No targeting';
}

