/**
 * Feature: Meta Instant Forms Thank You Screen
 * Purpose: Completion screen with title, body, and optional CTA
 * References:
 *  - Meta Instant Forms UI: Thank you page after submission
 */

import { Check } from 'lucide-react'
import { metaFormTokens } from './tokens'
import { PrimaryButton } from './PrimaryButton'

interface ThankYouProps {
  title: string
  body?: string
  ctaText?: string
  ctaUrl?: string
}

export function ThankYou({ title, body, ctaText, ctaUrl }: ThankYouProps) {
  const { colors, typography, spacing } = metaFormTokens

  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      {/* Success checkmark */}
      <div
        className="rounded-full flex items-center justify-center mb-6"
        style={{
          width: 80,
          height: 80,
          backgroundColor: colors.button.primary,
        }}
      >
        <Check size={48} style={{ color: colors.text.inverse }} strokeWidth={3} />
      </div>

      {/* Title */}
      <h2
        className="font-semibold mb-3"
        style={{
          fontSize: typography.fontSize.xl,
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
            marginBottom: spacing['3xl'],
          }}
        >
          {body}
        </p>
      )}

      {/* CTA button */}
      {ctaText && (
        <div className="w-full max-w-xs">
          <PrimaryButton onClick={() => ctaUrl && window.open(ctaUrl, '_blank')}>
            {ctaText}
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}

