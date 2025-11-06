/**
 * Feature: Meta Instant Forms Card Container
 * Purpose: Reusable centered card component for floating card layout
 * References:
 *  - Meta Instant Forms UI: Centered card pattern
 */

import { X, ChevronLeft } from 'lucide-react'
import { metaFormTokens } from './tokens'

interface CardProps {
  children: React.ReactNode
  showBack?: boolean
  showClose?: boolean
  onBack?: () => void
  onClose?: () => void
}

export function Card({
  children,
  showBack = false,
  showClose = true,
  onBack,
  onClose,
}: CardProps) {
  const { card, colors, spacing } = metaFormTokens

  return (
    <div className="flex items-center justify-center px-4 py-6 min-h-[500px]">
      <div
        className="relative w-full bg-white"
        style={{
          maxWidth: card.maxWidth,
          padding: card.padding,
          borderRadius: card.borderRadius,
          boxShadow: card.shadow,
        }}
      >
        {/* Back button */}
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-4 top-4 flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              width: 32,
              height: 32,
              color: colors.text.secondary,
            }}
            aria-label="Back"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
        )}

        {/* Close button */}
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              width: 32,
              height: 32,
              color: colors.text.secondary,
            }}
            aria-label="Close"
          >
            <X size={24} strokeWidth={2} />
          </button>
        )}

        {/* Card content */}
        <div style={{ paddingTop: spacing.xl }}>
          {children}
        </div>
      </div>
    </div>
  )
}

