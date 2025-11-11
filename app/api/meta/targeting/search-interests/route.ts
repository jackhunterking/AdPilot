/**
 * Feature: Meta interest targeting search
 * Purpose: Search Meta's interest targeting options programmatically
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getMetaAccessToken } from '@/lib/meta/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    const accessToken = await getMetaAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Meta access token not available' },
        { status: 401 }
      )
    }

    // Search for interests using Meta Marketing API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/search?type=adinterest&q=${encodeURIComponent(query)}&limit=25&access_token=${accessToken}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[Search Interests] Meta API Error:', error)
      return NextResponse.json(
        { error: 'Failed to search interests' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform to our format
    const interests = data.data?.map((interest: { id: string; name: string }) => ({
      id: interest.id,
      name: interest.name,
    })) || []

    return NextResponse.json({ interests })
  } catch (error) {
    console.error('[Search Interests] Error:', error)
    return NextResponse.json(
      { error: 'Failed to search interests' },
      { status: 500 }
    )
  }
}

