/**
 * Feature: Meta Instant Forms Simple Container
 * Purpose: Light gray background container - NO phone frame mockup
 * References:
 *  - Meta Instant Forms UI: Simple container with gray background
 */

import { metaFormTokens } from './tokens'

interface SimpleContainerProps {
  children: React.ReactNode
}

export function SimpleContainer({ children }: SimpleContainerProps) {
  const { colors, dimensions } = metaFormTokens

  return (
    <div
      style={{
        backgroundColor: colors.background,
        width: `${dimensions.container.width}px`,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}

