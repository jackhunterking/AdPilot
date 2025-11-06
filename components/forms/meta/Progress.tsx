/**
 * Feature: Meta Instant Forms Progress Bar
 * Purpose: Slim progress indicator showing current step in form flow
 * References:
 *  - Meta Instant Forms UI: Progress indicator at top of form
 */

import { metaFormTokens } from './tokens'

interface ProgressProps {
  currentStep: number
  totalSteps: number
}

export function Progress({ currentStep, totalSteps }: ProgressProps) {
  const { dimensions, colors, radii } = metaFormTokens
  const progress = (currentStep / totalSteps) * 100

  return (
    <div
      className="w-full"
      style={{
        height: dimensions.progress.height,
        backgroundColor: colors.progress.track,
        borderRadius: radii.progress,
        overflow: 'hidden',
      }}
    >
      <div
        className="h-full transition-all duration-300"
        style={{
          width: `${progress}%`,
          backgroundColor: colors.progress.fill,
          borderRadius: radii.progress,
        }}
      />
    </div>
  )
}

