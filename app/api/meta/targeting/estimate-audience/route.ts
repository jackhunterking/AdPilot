/**
 * Feature: Meta audience size estimation
 * Purpose: Estimate potential reach for given targeting parameters
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/audiences/reference/reach-estimate
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getMetaAccessToken } from '@/lib/meta/auth'
import { getMetaAdAccountId } from '@/lib/meta/auth'

export async function POST(request: NextRequest) {
  try {
    const { demographics, detailedTargeting, geoLocations } = await request.json()

    const accessToken = await getMetaAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Meta access token not available' },
        { status: 401 }
      )
    }

    const adAccountId = await getMetaAdAccountId()
    if (!adAccountId) {
      return NextResponse.json(
        { error: 'Meta ad account not available' },
        { status: 401 }
      )
    }

    // Build targeting spec for Meta API
    const targetingSpec: Record<string, unknown> = {
      geo_locations: geoLocations || { countries: ['US'] }, // Default to US if not provided
      age_min: demographics?.ageMin || 18,
      age_max: demographics?.ageMax || 65,
    }

    if (demographics?.gender && demographics.gender !== 'all') {
      targetingSpec.genders = [demographics.gender === 'male' ? 1 : 2]
    }

    // Add detailed targeting (interests, behaviors)
    if (detailedTargeting?.interests?.length > 0 || detailedTargeting?.behaviors?.length > 0) {
      const flexibleSpec = []
      
      if (detailedTargeting.interests?.length > 0) {
        flexibleSpec.push({
          interests: detailedTargeting.interests.map((i: { id: string }) => ({ id: i.id })),
        })
      }
      
      if (detailedTargeting.behaviors?.length > 0) {
        flexibleSpec.push({
          behaviors: detailedTargeting.behaviors.map((b: { id: string }) => ({ id: b.id })),
        })
      }
      
      if (flexibleSpec.length > 0) {
        targetingSpec.flexible_spec = flexibleSpec
      }
    }

    // Call Meta Reach Estimate API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/act_${adAccountId}/reachestimate?targeting_spec=${encodeURIComponent(JSON.stringify(targetingSpec))}&access_token=${accessToken}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[Estimate Audience] Meta API Error:', error)
      return NextResponse.json(
        { error: 'Failed to estimate audience size' },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      estimate: {
        min: data.users_lower_bound || 0,
        max: data.users_upper_bound || 0,
        midpoint: Math.floor(((data.users_lower_bound || 0) + (data.users_upper_bound || 0)) / 2),
      },
    })
  } catch (error) {
    console.error('[Estimate Audience] Error:', error)
    return NextResponse.json(
      { error: 'Failed to estimate audience size' },
      { status: 500 }
    )
  }
}

