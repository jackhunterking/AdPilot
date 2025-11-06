/**
 * Feature: Meta Instant Forms Progress Bar
 * Purpose: Progress indicator shown at bottom of stages 2-3
 * References:
 *  - Meta Instant Forms UI: Progress bar styling
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
        height: progressBar.height,
        backgroundColor: progressBar.trackColor,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          backgroundColor: progressBar.fillColor,
          transform: `translateX(-${100 - progress}%)`,
          transition: 'transform 300ms ease-in-out',
        }}
      />
    </div>
  )
}

