/**
 * Feature: Lovable Integration - Get Project Campaigns
 * Purpose: Get all campaigns for a Lovable project
 * References:
 *  - GET /api/v1/lovable/projects/[projectId]/campaigns
 *  - Service: LovableSyncService
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LovableSyncService } from '@/lib/services/lovable';

/**
 * Get campaigns for Lovable project
 * 
 * GET /api/v1/lovable/projects/[projectId]/campaigns
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     campaigns: Campaign[];
 *     ads: Ad[];
 *     creatives: Creative[];
 *     imageStatus: Record<string, boolean>;
 *   };
 *   error?: { code: string; message: string };
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }

    // 2. Get project ID from params
    const { projectId } = params;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'missing_project_id',
            message: 'Project ID is required'
          }
        },
        { status: 400 }
      );
    }

    // 3. Delegate to sync service (loads from AdPilot DB - source of truth)
    const syncService = new LovableSyncService(supabase);
    const result = await syncService.loadCampaignData(projectId, user.id);

    // 4. Return response
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[Lovable API] Get campaigns failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'internal_error',
          message: 'Failed to load campaigns'
        }
      },
      { status: 500 }
    );
  }
}

