/**
 * Feature: Meta Instant Forms Input Field - PIXEL PERFECT
 * Purpose: Input field with bottom border only - EXACT Facebook styling
 * References:
 *  - Facebook HTML: Bottom border only, exact spacing
 */

import { Mail, User, Phone } from 'lucide-react'
import { metaFormTokens } from './tokens'
import type { MetaInstantFormFieldType } from '@/lib/types/meta-instant-form'

interface FieldProps {
  type: MetaInstantFormFieldType
  label: string
  placeholder?: string
}

const FIELD_ICONS = {
  FULL_NAME: User,
  EMAIL: Mail,
  PHONE: Phone,
} as const

const FIELD_PLACEHOLDERS = {
  FULL_NAME: 'Enter your answer.',
  EMAIL: 'Enter your answer.',
  PHONE: 'Enter your answer.',
} as const

export function Field({ type, label, placeholder }: FieldProps) {
  const { colors, typography, spacing } = metaFormTokens
  const Icon = FIELD_ICONS[type]
  const placeholderText = placeholder || FIELD_PLACEHOLDERS[type]

  return (
    <div style={{ marginBottom: `${spacing.fieldMargin}px` }}>
      {/* Label */}
      <label
        style={{
          display: 'block',
          fontSize: `${typography.fontSize.base}px`,
          color: colors.text.primary,
          marginBottom: '8px',
          fontWeight: typography.fontWeight.normal,
        }}
      >
        {label}
      </label>

      {/* Input field with bottom border only */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: '8px',
          borderBottom: `1px solid ${colors.border.divider}`,  // Bottom border only
        }}
      >
        {/* Icon */}
        <Icon
          size={20}
          style={{
            color: colors.text.tertiary,
            marginRight: '8px',
            flexShrink: 0,
          }}
        />

        {/* Placeholder text */}
        <span
          style={{
            fontSize: `${typography.fontSize.base}px`,
            color: colors.text.tertiary,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          {placeholderText}
        </span>
      </div>
    </div>
  )
}
