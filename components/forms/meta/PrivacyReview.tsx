/**
 * Feature: Meta Instant Forms Privacy Review - PIXEL PERFECT
 * Purpose: Privacy review slide - NO white card, EXACT Facebook layout
 * References:
 *  - Facebook HTML: margin-top 100px, no white card wrapper, progress at 100%
 */

'use client'

import { metaFormTokens } from './tokens'
import { PrimaryButton } from './PrimaryButton'
import { ProgressBar } from './ProgressBar'

interface PrivacyReviewProps {
  pageName?: string
  privacyUrl: string
  onSubmit?: () => void
}

export function PrivacyReview({
  pageName,
  privacyUrl,
  onSubmit,
}: PrivacyReviewProps) {
  const { dimensions, slider, spacing, colors, typography } = metaFormTokens

  return (
    <div
      style={{
        height: `${dimensions.slideHeights.privacy}px`,  // EXACT: 480px
        position: 'relative',
        padding: `0 ${slider.cardMargin}px`,
      }}
    >
      {/* Content - EXACT margin-top: 100px */}
      <div style={{ marginTop: `${spacing.contentBelowProfile}px` }}>
        {/* Heading */}
        <h2
          style={{
            fontSize: `${typography.fontSize.lg}px`,  // EXACT: 18px
            fontWeight: typography.fontWeight.semibold,  // EXACT: 600
            color: colors.text.primary,
            marginBottom: '16px',
          }}
        >
          Privacy policy
        </h2>

        {/* Privacy text */}
        <p
          style={{
            fontSize: `${typography.fontSize.base}px`,  // EXACT: 14px
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.normal,
            marginBottom: '16px',
          }}
        >
          By clicking Submit, you agree to send your info to {pageName || 'this page'} who agrees to
          use it according to their privacy policy. Facebook will also use it subject to our
          Data Policy, including to auto-fill forms for ads.
        </p>

        {/* Links */}
        <div style={{ marginBottom: '20px' }}>
          <a
            href="https://www.facebook.com/privacy/policy/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: `${typography.fontSize.base}px`,
              color: colors.link,
              textDecoration: 'none',
              display: 'block',
              marginBottom: '12px',
            }}
          >
            View Facebook Data Policy.
          </a>

          <a
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: `${typography.fontSize.base}px`,
              color: colors.link,
              textDecoration: 'none',
              display: 'block',
            }}
          >
            Visit {pageName || 'this page'}&apos;s Privacy Policy.
          </a>
        </div>
      </div>

      {/* Progress bar - 100% */}
      <div style={{ marginTop: '20px' }}>
        <ProgressBar progress={100} />
      </div>

      {/* Submit button */}
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
        <PrimaryButton onClick={onSubmit}>Submit</PrimaryButton>
      </div>
    </div>
  )
}
