/**
 * Feature: Meta Instant Forms Contact Slide - PIXEL PERFECT
 * Purpose: Contact information slide with white card wrapper - EXACT Facebook layout
 * References:
 *  - Facebook CSS ._8duj: white card with exact dimensions and shadow
 *  - Facebook HTML: margin-top 100px for card, progress bar outside
 */

import { Info } from 'lucide-react'
import { metaFormTokens } from './tokens'
import { Field } from './Field'
import { ProgressBar } from './ProgressBar'
import { PrimaryButton } from './PrimaryButton'
import type { MetaInstantFormField } from '@/lib/types/meta-instant-form'

interface ContactSlideProps {
  fields: MetaInstantFormField[]
  onContinue?: () => void
}

export function ContactSlide({ fields, onContinue }: ContactSlideProps) {
  const { dimensions, slider, spacing, colors, typography, radii, shadows } = metaFormTokens

  return (
    <div
      style={{
        height: `${dimensions.slideHeights.contact}px`,  // EXACT: 480px
        position: 'relative',
      }}
    >
      {/* White card wrapper - EXACT margin-top: 100px */}
      <div
        style={{
          marginTop: `${spacing.contentBelowProfile}px`,  // EXACT: 100px
          marginLeft: `${slider.cardMargin}px`,  // EXACT: 12px
          marginRight: `${slider.cardMargin}px`,  // EXACT: 12px
          backgroundColor: colors.surface,  // EXACT: #FFFFFF
          borderRadius: `${radii.card}px`,  // EXACT: 12px
          boxShadow: shadows.card,  // EXACT: 0 1px 2px rgba(0,0,0,0.3)
          border: `0.5px solid ${colors.border.default}`,  // EXACT: 0.5px solid rgba(0,0,0,0.1)
          padding: `${spacing.cardPadding}px`,  // EXACT: 20px
        }}
      >
        {/* Heading with info icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              fontSize: `${typography.fontSize.lg}px`,  // EXACT: 18px
              fontWeight: typography.fontWeight.semibold,  // EXACT: 600
              color: colors.text.primary,
            }}
          >
            Contact information
          </h2>
          <Info size={16} style={{ color: colors.text.secondary }} />
        </div>

        {/* Fields */}
        <div>
          {fields.map((field) => (
            <Field key={field.id} type={field.type} label={field.label} />
          ))}
        </div>
      </div>

      {/* Progress bar - OUTSIDE white card */}
      <div style={{ marginTop: '20px', padding: `0 ${slider.cardMargin}px` }}>
        <ProgressBar progress={50} />
      </div>

      {/* Continue button - OUTSIDE white card */}
      <div
        style={{
          position: 'absolute',
          bottom: `${spacing.buttonBottom}px`,
          left: `${slider.cardMargin}px`,
          right: `${slider.cardMargin}px`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  )
}

