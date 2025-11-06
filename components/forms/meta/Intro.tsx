/**
 * Feature: Meta Instant Forms Intro Screen
 * Purpose: First stage showing page profile, name, and form headline
 * References:
 *  - Meta Instant Forms UI: Intro/welcome screen
 *  - Meta Graph API Page Picture: https://developers.facebook.com/docs/graph-api/reference/profile-picture-source/
 */

'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { metaFormTokens } from './tokens'
import { PrimaryButton } from './PrimaryButton'
import { CloseButton } from './CloseButton'

interface IntroProps {
  pageProfilePicture?: string
  pageName?: string
  headline: string
  onContinue?: () => void
  onClose?: () => void
}

export function Intro({
  pageProfilePicture,
  pageName,
  headline,
  onContinue,
  onClose,
}: IntroProps) {
  const { intro, colors, typography, spacing } = metaFormTokens
  const [imageError, setImageError] = useState(false)

  // Reset image error state when picture URL changes
  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div className="relative flex flex-col items-center text-center px-6 py-8" style={{ height: '480px' }}>
      <CloseButton onClick={onClose} />
      
      {/* Profile Picture */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center mb-4"
        style={{
          width: intro.profilePictureSize,
          height: intro.profilePictureSize,
          border: `${intro.profilePictureBorder}px solid ${colors.border.light}`,
          backgroundColor: showFallback ? colors.background : 'transparent',
          marginTop: '70px',
        }}
      >
        {showFallback ? (
          <User
            size={40}
            style={{ color: colors.text.tertiary }}
            strokeWidth={1.5}
          />
        ) : (
          <img
            src={pageProfilePicture}
            alt={pageName || 'Page profile'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Page Name */}
      {pageName && (
        <p
          className="font-normal mb-6"
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          {pageName}
        </p>
      )}

      {/* Headline */}
      <h2
        className="font-semibold mb-8"
        style={{
          fontSize: typography.fontSize.xl,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.tight,
        }}
      >
        {headline}
      </h2>

      {/* Continue Button */}
      <div className="w-full max-w-xs" style={{ marginTop: 'auto' }}>
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  )
}

