/**
 * Feature: Meta Instant Forms Progress Bar - PIXEL PERFECT
 * Purpose: Progress indicator with EXACT Facebook dimensions
 * References:
 *  - Facebook CSS: 4px height (NOT 3px)
 */

import { metaFormTokens } from './tokens'

interface ProgressBarProps {
  progress: number // 0-100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const { progressBar } = metaFormTokens

  return (
    <div
      style={{
        width: '100%',
        height: `${progressBar.height}px`,  // EXACT: 4px from Facebook
        backgroundColor: progressBar.trackColor,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: progressBar.fillColor,
          transform: `translateX(-${100 - progress}%)`,
          transition: 'transform 300ms ease-in-out',
        }}
      />
    </div>
  )
}
