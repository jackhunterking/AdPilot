/**
 * Feature: Lovable Integration - Signup Webhook Endpoint
 * Purpose: Receive signup events from user's Lovable Edge Functions
 * References:
 *  - POST /api/v1/webhooks/lovable/[projectId]/signup
 *  - Service: LovableConversionService
 *  - Called by user's Lovable Edge Function when signup occurs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LovableConversionService } from '@/lib/services/lovable';

/**
 * Record signup conversion from Lovable project
 * 
 * POST /api/v1/webhooks/lovable/[projectId]/signup
 * 
 * Body:
 * {
 *   event: 'signup';
 *   email?: string;
 *   name?: string;
 *   phone?: string;
 *   customData?: Record<string, unknown>;
 *   timestamp?: string;
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: { conversion: Conversion };
 *   error?: { code: string; message: string };
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // 1. Get project ID from params
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

    // 2. Parse webhook payload
    const body = await req.json();
    const { event, email, name, phone, customData, timestamp } = body;

    if (event !== 'signup') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'invalid_event',
            message: 'Event must be "signup"'
          }
        },
        { status: 400 }
      );
    }

    // 3. Use service role client (webhook doesn't have user auth)
    const supabase = await createClient();

    // 4. Delegate to conversion service
    const conversionService = new LovableConversionService(supabase);
    const result = await conversionService.recordConversion({
      lovableProjectId: projectId,
      conversionType: 'signup',
      conversionData: {
        email,
        name,
        phone,
        ...customData
      },
      source: 'lovable_webhook',
      timestamp: timestamp || new Date().toISOString()
    });

    // 5. Return response
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { conversion: result.data }
    });
  } catch (error) {
    console.error('[Lovable Webhook] Signup tracking failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'internal_error',
          message: 'Failed to record signup'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint active',
    projectId: params.projectId
  });
}

