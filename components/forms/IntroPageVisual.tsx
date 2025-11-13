/**
 * Feature: Meta Instant Forms Intro Visual
 * Purpose: Pixel-perfect intro page matching Meta's native form intro layout (Facebook/Instagram)
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Meta Design: Native Facebook/Instagram lead form intro pages
 */

'use client'

import { cn } from '@/lib/utils'

interface IntroPageVisualProps {
  logoUrl?: string
  businessName?: string
  headline?: string
  description?: string
  initials?: string
}

export function IntroPageVisual({
  logoUrl,
  businessName = 'RenoAssist',
  headline,
  description,
  initials = 'RA',
}: IntroPageVisualProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      {/* Visual Identity Section */}
      <div className="relative mb-8">
        {/* Business Page Name - Above everything */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-full">
          <p
            className="text-xs font-semibold uppercase tracking-wide text-center"
            style={{ color: '#A1A1A1' }}
          >
            {businessName}
          </p>
        </div>

        {/* Overlapping Circle with Logo */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-[40px] w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden z-10"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
              <span className="text-white text-xl font-bold">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* White Rectangle Box with Text Inside */}
        <div
          className="relative w-[280px] min-h-[140px] rounded-md bg-white shadow-sm flex flex-col items-center justify-center px-6 py-8 pt-12"
        >
          {/* Intro Headline */}
          <h3
            className="text-xl font-bold leading-tight text-center mb-2"
            style={{ color: headline ? '#050505' : '#9CA3AF' }}
          >
            {headline || 'Enter headline'}
          </h3>

          {/* Intro Description */}
          <p
            className="text-sm leading-relaxed text-center"
            style={{ color: description ? '#65676B' : '#D1D5DB' }}
          >
            {description || 'Enter description'}
          </p>
        </div>
      </div>
    </div>
  )
}

