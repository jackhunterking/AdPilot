/**
 * Feature: Meta Instant Forms Privacy Link
 * Purpose: Privacy policy link text (centered, small)
 * References:
 *  - Meta Instant Forms UI: Privacy text at bottom of form
 */

import { Info } from 'lucide-react'
import { metaFormTokens } from './tokens'

interface PrivacyProps {
  linkText: string
  url?: string
}

export function Privacy({ linkText, url }: PrivacyProps) {
  const { colors, typography } = metaFormTokens

  return (
    <div className="flex items-center justify-center gap-1 text-center">
      <Info size={12} style={{ color: colors.text.secondary, flexShrink: 0 }} />
      <span
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          lineHeight: typography.lineHeight.normal,
        }}
      >
        {url ? (
          <>
            By continuing, you agree to the{' '}
            <span style={{ color: colors.link }}>
              {linkText}
            </span>
          </>
        ) : (
          <>By continuing, you agree to the {linkText}</>
        )}
      </span>
    </div>
  )
}

