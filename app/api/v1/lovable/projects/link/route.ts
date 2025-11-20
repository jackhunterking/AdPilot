/**
 * Feature: Lovable Integration - Link Project Endpoint
 * Purpose: Link a Lovable project to an AdPilot user account
 * References:
 *  - POST /api/v1/lovable/projects/link
 *  - Service: LovableProjectService
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LovableProjectService } from '@/lib/services/lovable';

/**
 * Link Lovable project to user account
 * 
 * POST /api/v1/lovable/projects/link
 * 
 * Body:
 * {
 *   lovableProjectId: string;
 *   supabaseUrl?: string;
 *   metadata?: Record<string, unknown>;
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: { link: LovableProjectLink };
 *   error?: { code: string; message: string };
 * }
 */
export async function POST(req: NextRequest) {
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

    // 2. Parse request body
    const body = await req.json();
    const { lovableProjectId, supabaseUrl, metadata } = body;

    if (!lovableProjectId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'missing_project_id',
            message: 'Lovable project ID is required'
          }
        },
        { status: 400 }
      );
    }

    // 3. Delegate to service
    const projectService = new LovableProjectService(supabase);
    const result = await projectService.createProjectLink({
      userId: user.id,
      lovableProjectId,
      supabaseUrl,
      metadata
    });

    // 4. Return response
    if (!result.success) {
      const status = result.error?.code === 'already_linked' ? 409 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({
      success: true,
      data: { link: result.data }
    });
  } catch (error) {
    console.error('[Lovable API] Link project failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'internal_error',
          message: 'Failed to link project'
        }
      },
      { status: 500 }
    );
  }
}

