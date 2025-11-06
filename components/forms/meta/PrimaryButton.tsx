/**
 * Feature: Meta Instant Forms Primary Button - PIXEL PERFECT
 * Purpose: CTA button with EXACT Facebook dimensions and styling
 * References:
 *  - Facebook CSS ._81-n: height 34px, width 300px, border-radius 12px
 */

import { metaFormTokens } from './tokens'
import { ArrowRight } from 'lucide-react'

interface PrimaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  showArrow?: boolean
}

export function PrimaryButton({ children, onClick, showArrow = false }: PrimaryButtonProps) {
  const { dimensions, radii, shadows, colors, typography } = metaFormTokens

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: `${dimensions.button.width}px`,  // EXACT: 300px from Facebook
        height: `${dimensions.button.height}px`,  // EXACT: 34px from Facebook (NOT 48px)
        borderRadius: `${radii.button}px`,  // EXACT: 12px from Facebook (NOT 10px)
        boxShadow: shadows.button,  // EXACT: 0 1px 3px rgba(0,0,0,0.3)
        backgroundColor: colors.button.primary,
        color: '#FFFFFF',
        border: 'none',
        fontSize: `${typography.fontSize.base}px`,
        fontWeight: typography.fontWeight.semibold,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        transition: 'background-color 150ms ease-in-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.button.primaryHover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.button.primary
      }}
    >
      <span>{children}</span>
      {showArrow && <ArrowRight size={16} strokeWidth={2.5} />}
    </button>
  )
}
