/**
 * Feature: Meta Instant Forms Icon Component - EXACT Facebook Implementation
 * Purpose: Reusable icon component matching Facebook's sprite system
 * References:
 *  - Facebook uses sprite images with background-position
 *  - We use Lucide icons as equivalent
 */

import { X, ArrowRight, Info } from 'lucide-react'

type IconType = 'close' | 'arrow' | 'info'

interface IconProps {
  type: IconType
  color?: string
}

export function Icon({ type, color = '#65676B' }: IconProps) {
  const iconMap = {
    close: X,
    arrow: ArrowRight,
    info: Info,
  }

  const IconComponent = iconMap[type]

  return (
    <i
      style={{
        display: 'inline-block',
        width: '16px',
        height: '16px',
        lineHeight: 0,
      }}
    >
      <IconComponent size={16} color={color} strokeWidth={2} />
    </i>
  )
}

