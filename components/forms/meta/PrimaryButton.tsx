/**
 * Feature: Meta Instant Forms Primary Button
 * Purpose: Blue CTA button matching Meta's exact styling
 * References:
 *  - Meta Instant Forms UI: Continue/Submit button styling
 */

import { metaFormTokens } from './tokens'

interface PrimaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
}

export function PrimaryButton({ children, onClick }: PrimaryButtonProps) {
  const { dimensions, colors, radii, typography } = metaFormTokens

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full transition-colors active:scale-[0.98]"
      style={{
        height: dimensions.button.height,
        backgroundColor: colors.button.primary,
        borderRadius: radii.button,
        paddingLeft: dimensions.button.paddingX,
        paddingRight: dimensions.button.paddingX,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.inverse,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

