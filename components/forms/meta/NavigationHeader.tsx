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
        padding: '16px 20px',
        marginBottom: '16px',
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#050505', margin: 0 }}>
        {title}
      </h2>
      
      <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
        
        <span style={{ fontSize: '14px', color: '#65676B' }}>
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
      </nav>
    </div>
  )
}

