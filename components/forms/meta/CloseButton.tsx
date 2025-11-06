/**
 * Feature: Meta Instant Forms Close Button
 * Purpose: Reusable X close button for top-right of each slide
 * References:
 *  - Meta Instant Forms UI: Close button pattern
 */

import { X } from 'lucide-react'
import { metaFormTokens } from './tokens'

interface CloseButtonProps {
  onClick?: () => void
}

export function CloseButton({ onClick }: CloseButtonProps) {
  const { colors } = metaFormTokens

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-4 right-4 flex items-center justify-center transition-opacity hover:opacity-70"
      style={{
        width: 32,
        height: 32,
        color: colors.text.secondary,
      }}
      aria-label="Close"
    >
      <X size={24} strokeWidth={2} />
    </button>
  )
}

