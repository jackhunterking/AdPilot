/**
 * Feature: Meta Instant Forms Privacy Review Screen
 * Purpose: Dedicated stage showing privacy policy information before submission
 * References:
 *  - Meta Instant Forms UI: Privacy review screen
 *  - Meta Business Help: https://www.facebook.com/business/help/1611070512241988
 */

'use client'

import { Info } from 'lucide-react'
import { metaFormTokens } from './tokens'
import { PrimaryButton } from './PrimaryButton'
import { CloseButton } from './CloseButton'
import { ProgressBar } from './ProgressBar'

interface PrivacyReviewProps {
  pageName?: string
  privacyUrl: string
  onSubmit?: () => void
  onClose?: () => void
}

export function PrivacyReview({
  pageName,
  privacyUrl,
  onSubmit,
  onClose,
}: PrivacyReviewProps) {
  const { colors, typography, spacing } = metaFormTokens

  return (
    <div className="relative flex flex-col" style={{ height: '480px' }}>
      <CloseButton onClick={onClose} />
      
      <div className="flex-1 px-6 py-8" style={{ marginTop: '70px' }}>
        {/* Heading */}
        <h2
          className="font-semibold mb-4"
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.primary,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          Privacy policy
        </h2>

        {/* Privacy text */}
        <p
          className="mb-6"
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          By clicking Submit, you agree to send your info to {pageName || 'this page'} who agrees to
          use it according to their privacy policy. Facebook will also use it subject to our
          Data Policy, including to auto-fill forms for ads.
        </p>

        {/* Links */}
        <div className="space-y-3 mb-8">
          <a
            href="https://www.facebook.com/privacy/policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 transition-opacity hover:opacity-70"
            style={{
              fontSize: typography.fontSize.base,
              color: colors.link,
              textDecoration: 'none',
            }}
          >
            <span>View Facebook Data Policy.</span>
          </a>

          <a
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 transition-opacity hover:opacity-70"
            style={{
              fontSize: typography.fontSize.base,
              color: colors.link,
              textDecoration: 'none',
            }}
          >
            <span>Visit {pageName || 'this page'}&apos;s Privacy Policy.</span>
          </a>
        </div>
      </div>

      {/* Bottom section with progress and button */}
      <div className="mt-auto">
        <div className="px-6 mb-4">
          <ProgressBar progress={100} />
        </div>
        <div className="px-6 pb-6">
          <PrimaryButton onClick={onSubmit}>Submit</PrimaryButton>
        </div>
      </div>
    </div>
  )
}

