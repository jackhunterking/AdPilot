/**
 * Feature: Meta Instant Forms Intro Screen - PIXEL PERFECT
 * Purpose: First stage with profile picture and headline - EXACT Facebook layout
 * References:
 *  - Facebook HTML: margin-top 70px for profile, 100px for content
 */

'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { metaFormTokens } from './tokens'
import { PrimaryButton } from './PrimaryButton'

interface IntroProps {
  pageProfilePicture?: string
  pageName?: string
  headline: string
  onContinue?: () => void
}

export function Intro({
  pageProfilePicture,
  pageName,
  headline,
  onContinue,
}: IntroProps) {
  const { dimensions, spacing, colors, typography, intro } = metaFormTokens
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div
      style={{
        height: `${dimensions.slideHeights.intro}px`,  // EXACT: 480px
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Profile Picture - EXACT margin-top: 70px */}
      <div style={{ marginTop: `${spacing.profileTop}px`, display: 'flex', justifyContent: 'center' }}>
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
      <div style={{ marginTop: `${spacing.contentBelowProfile}px`, padding: '0 24px' }}>
        {/* Page Name */}
        {pageName && (
          <p
            style={{
              fontSize: `${typography.fontSize.base}px`,
              color: colors.text.secondary,
              marginBottom: '16px',
              fontWeight: typography.fontWeight.normal,
            }}
          >
            {pageName}
          </p>
        )}

        {/* Headline */}
        <h2
          style={{
            fontSize: `${typography.fontSize.xl}px`,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {headline}
        </h2>
      </div>

      {/* Continue button at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: `${spacing.buttonBottom}px`,
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <PrimaryButton onClick={onContinue} showArrow={true}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  )
}
