/**
 * Feature: Meta Instant Forms Header
 * Purpose: Header with back button, centered title, and step indicator
 * References:
 *  - Meta Instant Forms UI: Navigation header component
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { metaFormTokens } from './tokens'

interface HeaderProps {
  title: string
  currentStep: number
  totalSteps: number
  onPrevious?: () => void
  onNext?: () => void
}

export function Header({
  title,
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
}: HeaderProps) {
  const { dimensions, colors, typography } = metaFormTokens

  return (
    <div
      className="flex items-center justify-between px-4"
      style={{
        height: dimensions.header.height,
      }}
    >
      {/* Back/Previous button */}
      <button
        type="button"
        onClick={onPrevious}
        className="flex items-center justify-center transition-opacity hover:opacity-70"
        style={{
          width: 40,
          height: 40,
          color: colors.button.primary,
        }}
        aria-label="Previous"
      >
        <ChevronLeft size={dimensions.header.iconSize} strokeWidth={2.5} />
      </button>

      {/* Center: Title and step indicator */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <span
          className="font-semibold"
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.primary,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {title}
        </span>
        <span
          className="font-normal"
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.secondary,
            marginTop: 2,
          }}
        >
          {currentStep} of {totalSteps}
        </span>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={onNext}
        className="flex items-center justify-center transition-opacity hover:opacity-70"
        style={{
          width: 40,
          height: 40,
          color: colors.button.primary,
        }}
        aria-label="Next"
      >
        <ChevronRight size={dimensions.header.iconSize} strokeWidth={2.5} />
      </button>
    </div>
  )
}

