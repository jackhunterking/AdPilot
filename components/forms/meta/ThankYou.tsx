/**
 * Feature: Meta Instant Forms Thank You Screen - PIXEL PERFECT
 * Purpose: Completion screen - NO white card, EXACT Facebook layout
 * References:
 *  - Facebook HTML: profile at 70px, content at 100px, height 488px
 */

import { User } from 'lucide-react'
import { metaFormTokens } from './tokens'
import { PrimaryButton } from './PrimaryButton'
import { useState, useEffect } from 'react'

interface ThankYouProps {
  title: string
  body?: string
  ctaText?: string
  ctaUrl?: string
  pageProfilePicture?: string
  pageName?: string
}

export function ThankYou({ 
  title, 
  body, 
  ctaText, 
  ctaUrl,
  pageProfilePicture,
  pageName,
}: ThankYouProps) {
  const { dimensions, spacing, colors, typography, intro, slider } = metaFormTokens
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div
      style={{
        height: `${dimensions.slideHeights.thankYou}px`,  // EXACT: 488px
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: `0 ${slider.cardMargin}px`,
      }}
    >
      {/* Profile Picture - EXACT margin-top: 70px */}
      <div style={{ marginTop: `${spacing.profileTop}px` }}>
        <div
          style={{
            width: `${intro.profilePictureSize}px`,
            height: `${intro.profilePictureSize}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: showFallback ? colors.background : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {showFallback ? (
            <User size={40} style={{ color: colors.text.tertiary }} strokeWidth={1.5} />
          ) : (
            <img
              src={pageProfilePicture}
              alt={pageName || 'Page profile'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>

      {/* Content - EXACT margin-top: 100px from profile */}
      <div style={{ marginTop: `${spacing.contentBelowProfile}px` }}>
        {/* Page Name */}
        {pageName && (
          <p
            style={{
              fontSize: `${typography.fontSize.base}px`,
              color: colors.text.secondary,
              marginBottom: '8px',
              fontWeight: typography.fontWeight.normal,
            }}
          >
            {pageName}
          </p>
        )}

        {/* Title */}
        <h2
          style={{
            fontSize: `${typography.fontSize.lg}px`,  // EXACT: 18px
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: '12px',
          }}
        >
          {title}
        </h2>

        {/* Body text */}
        {body && (
          <p
            style={{
              fontSize: `${typography.fontSize.base}px`,
              color: colors.text.secondary,
              marginBottom: '12px',
              lineHeight: typography.lineHeight.normal,
            }}
          >
            {body}
          </p>
        )}

        {/* Success message */}
        <p
          style={{
            fontSize: `${typography.fontSize.xs}px`,  // EXACT: 11px
            color: colors.text.tertiary,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          ℹ️ You successfully submitted your responses.
        </p>
      </div>

      {/* View website button at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: `${spacing.buttonBottom}px`,
          left: `${slider.cardMargin}px`,
          right: `${slider.cardMargin}px`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <PrimaryButton onClick={() => ctaUrl && window.open(ctaUrl, '_blank')}>
          {ctaText || 'View website'}
        </PrimaryButton>
      </div>
    </div>
  )
}
