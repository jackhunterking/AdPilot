/**
 * Feature: Meta Instant Forms Input Field
 * Purpose: Pixel-perfect input field replica (disabled for preview)
 * References:
 *  - Meta Instant Forms UI: Input field styling
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
  FULL_NAME: 'Enter your answer',
  EMAIL: 'Enter your answer',
  PHONE: 'Enter your answer',
} as const

export function Field({ type, label, placeholder }: FieldProps) {
  const { colors, typography, spacing } = metaFormTokens
  const Icon = FIELD_ICONS[type]
  const placeholderText = placeholder || FIELD_PLACEHOLDERS[type]

  return (
    <div className="w-full" style={{ marginBottom: spacing['2xl'] }}>
      {/* Label */}
      <label
        className="block font-normal"
        style={{
          fontSize: typography.fontSize.base,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.normal,
          marginBottom: spacing.md,
        }}
      >
        {label}
      </label>

      {/* Input field with bottom border only */}
      <div
        className="relative flex items-center"
        style={{
          paddingBottom: spacing.md,
          borderBottom: `1px solid ${colors.border.default}`,
        }}
      >
        {/* Icon */}
        <Icon
          size={20}
          style={{
            color: colors.text.tertiary,
            marginRight: spacing.md,
            flexShrink: 0,
          }}
        />

        {/* Placeholder text */}
        <span
          className="flex-1"
          style={{
            fontSize: typography.fontSize.base,
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

