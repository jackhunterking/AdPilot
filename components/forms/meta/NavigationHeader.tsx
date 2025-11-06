/**
 * Feature: Meta Instant Forms Navigation Header - EXACT Facebook Implementation
 * Purpose: Header navigation matching Facebook's exact HTML with scale: 0.9
 * References:
 *  - Facebook HTML: display: flex; justify-content: space-between; scale: 0.9
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
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        scale: '0.9',  // EXACT from Facebook
        width: '100%',
        padding: '12px 16px',
      }}
    >
      <span style={{ fontSize: '17px', fontWeight: 600, color: '#050505' }}>
        {title}
      </span>
      
      <nav style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onPrev}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Previous"
        >
          <ChevronLeft size={20} color="#1877F2" strokeWidth={2} />
        </button>
        
        <span style={{ fontSize: '11px', color: '#65676B' }}>
          {currentStep} of {totalSteps}
        </span>
        
        <button
          type="button"
          onClick={onNext}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Next"
        >
          <ChevronRight size={20} color="#1877F2" strokeWidth={2} />
        </button>
      </nav>
    </div>
  )
}

