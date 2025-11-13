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
  headline = 'Welcome to Your Ad Setup',
  description,
  initials = 'RA',
}: IntroPageVisualProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      {/* Visual Identity Section */}
      <div className="relative mb-8">
        {/* Rectangle Base */}
        <div
          className="relative w-[280px] h-[70px] rounded-xl"
          style={{ backgroundColor: '#F0F2F5' }}
        />

        {/* Overlapping Circle with Logo */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-[48px] w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
              <span className="text-white text-2xl font-bold">
                {initials}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Text Section */}
      <div className="text-center space-y-2 max-w-[280px]">
        {/* Business Page Name */}
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: '#A1A1A1' }}
        >
          {businessName}
        </p>

        {/* Intro Headline */}
        <h3
          className="text-2xl font-bold leading-tight"
          style={{ color: '#050505' }}
        >
          {headline}
        </h3>

        {/* Intro Description */}
        {description && (
          <p
            className="text-sm leading-relaxed pt-1"
            style={{ color: '#65676B' }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

