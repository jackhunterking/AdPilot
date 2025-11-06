/**
 * Feature: Meta Instant Forms Thank You Screen
 * Purpose: Completion screen with title, body, and optional CTA
 * References:
 *  - Meta Instant Forms UI: Thank you page after submission
 */

import { User } from 'lucide-react'
import { metaFormTokens } from './tokens'
import { PrimaryButton } from './PrimaryButton'
import { CloseButton } from './CloseButton'
import { useState, useEffect } from 'react'

interface ThankYouProps {
  title: string
  body?: string
  ctaText?: string
  ctaUrl?: string
  pageProfilePicture?: string
  pageName?: string
  onClose?: () => void
}

export function ThankYou({ 
  title, 
  body, 
  ctaText, 
  ctaUrl,
  pageProfilePicture,
  pageName,
  onClose
}: ThankYouProps) {
  const { colors, typography, spacing, intro } = metaFormTokens
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div className="relative flex flex-col items-center text-center px-6 py-8" style={{ height: '488px' }}>
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
          className="font-normal mb-4"
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          {pageName}
        </p>
      )}

      {/* Title */}
      <h2
        className="font-semibold mb-3"
        style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.tight,
        }}
      >
        {title}
      </h2>

      {/* Body text */}
      {body && (
        <p
          className="mb-6"
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          {body}
        </p>
      )}

      {/* Success message */}
      <p
        className="text-xs mb-8"
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.tertiary,
          lineHeight: typography.lineHeight.normal,
        }}
      >
        ℹ️ You successfully submitted your responses.
      </p>

      {/* CTA button */}
      <div className="w-full max-w-xs mt-auto">
        <PrimaryButton onClick={() => ctaUrl && window.open(ctaUrl, '_blank')}>
          {ctaText || 'View website'}
        </PrimaryButton>
      </div>
    </div>
  )
}

