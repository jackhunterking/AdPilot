/**
 * Feature: Lovable Integration - Subscription Status Endpoint
 * Purpose: Get user's Lovable subscription status ($9/month plan)
 * References:
 *  - GET /api/v1/lovable/subscription/status
 *  - Table: lovable_subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get subscription status
 * 
 * GET /api/v1/lovable/subscription/status
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     hasActiveSubscription: boolean;
 *     status: string;
 *     planId: string;
 *     trialEndsAt?: string;
 *     nextBillingDate?: string;
 *   };
 *   error?: { code: string; message: string };
 * }
 */
export async function GET(req: NextRequest) {
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

    // 2. Get subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('lovable_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'db_error',
            message: subError.message
          }
        },
        { status: 500 }
      );
    }

    // 3. Return status
    if (!subscription) {
      // No subscription - return defaults
      return NextResponse.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          status: 'none',
          planId: null,
          trialEndsAt: null,
          nextBillingDate: null
        }
      });
    }

    const hasActiveSubscription = ['trialing', 'active'].includes(subscription.status);

    return NextResponse.json({
      success: true,
      data: {
        hasActiveSubscription,
        status: subscription.status,
        planId: subscription.plan_id,
        trialEndsAt: subscription.trial_ends_at,
        nextBillingDate: subscription.next_billing_date
      }
    });
  } catch (error) {
    console.error('[Lovable API] Get subscription status failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'internal_error',
          message: 'Failed to get subscription status'
        }
      },
      { status: 500 }
    );
  }
}

