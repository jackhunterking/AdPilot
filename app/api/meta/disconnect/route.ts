/**
 * Feature: Meta Disconnect (DISABLED)
 * Purpose: This endpoint is disabled to maintain campaign integrity
 * Notes: Meta disconnection is not allowed once connected as it breaks campaign logic
 * References:
 *  - Supabase: https://supabase.com/docs/guides/api
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  // Meta disconnection is disabled to maintain campaign integrity
  // Once Meta is connected, it cannot be disconnected as it would break campaign logic
  return NextResponse.json(
    { 
      error: 'Meta disconnection is not allowed. Once connected, Meta accounts cannot be disconnected to maintain campaign integrity.' 
    }, 
    { status: 403 }
  )
}

