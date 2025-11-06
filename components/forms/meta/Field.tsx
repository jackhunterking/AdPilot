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
  const { dimensions, colors, radii, typography } = metaFormTokens
  const Icon = FIELD_ICONS[type]
  const placeholderText = placeholder || FIELD_PLACEHOLDERS[type]

  return (
    <div className="w-full">
      {/* Label */}
      <label
        className="block font-normal mb-2"
        style={{
          fontSize: typography.fontSize.base,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.normal,
        }}
      >
        {label}
      </label>

      {/* Input field */}
      <div
        className="relative flex items-center"
        style={{
          height: dimensions.input.height,
          backgroundColor: colors.surface,
          borderRadius: radii.input,
          border: `1px solid ${colors.border.default}`,
          paddingLeft: dimensions.input.paddingX,
          paddingRight: dimensions.input.paddingX,
        }}
      >
        {/* Icon */}
        <Icon
          size={18}
          style={{
            color: colors.text.tertiary,
            marginRight: 12,
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

