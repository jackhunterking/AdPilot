/**
 * Feature: Meta Instant Forms Outer Container - EXACT Facebook Implementation
 * Purpose: Outer wrapper matching Facebook's exact HTML structure
 * References:
 *  - Facebook HTML: grid-area: auto; overflow-y: scroll; height: 700px
 */

interface OuterContainerProps {
  children: React.ReactNode
}

export function OuterContainer({ children }: OuterContainerProps) {
  return (
    <div
      style={{
        gridArea: 'auto',
        overflowY: 'scroll',
        height: '700px',
        backgroundColor: '#F0F2F5',
      }}
    >
      {children}
    </div>
  )
}

