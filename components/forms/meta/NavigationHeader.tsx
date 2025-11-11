/**
 * Feature: Meta Instant Forms Navigation Header - Vertical Layout
 * Purpose: Stacked navigation with title on top, arrows below
 * References:
 *  - User screenshots: Title and navigation stacked vertically, not side-by-side
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NavigationHeaderProps {
  title: string
  currentStep: number
  totalSteps: number
  onPrev: () => void
  onNext: () => void
}

export function NavigationHeader({
  title,
  currentStep,
  totalSteps,
  onPrev,
  onNext,
}: NavigationHeaderProps) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: '20px' }}>
      <h2
        style={{
          fontSize: '22px',
          fontWeight: 600,
          color: '#050505',
          margin: 0,
          marginBottom: '16px',
        }}
      >
        {title}
      </h2>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Previous"
        >
          <ChevronLeft size={24} color="#1877F2" strokeWidth={2} />
        </button>

        <span
          style={{
            fontSize: '14px',
            color: '#65676B',
            minWidth: '60px',
            textAlign: 'center',
          }}
        >
          {currentStep} of {totalSteps}
        </span>

        <button
          type="button"
          onClick={onNext}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Next"
        >
          <ChevronRight size={24} color="#1877F2" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
