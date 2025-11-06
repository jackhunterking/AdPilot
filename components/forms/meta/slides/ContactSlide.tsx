/**
 * Feature: Meta Instant Forms Contact Slide - EXACT Facebook Implementation
 * Purpose: Contact slide with WHITE CARD wrapper - exact Facebook structure
 * References:
 *  - Facebook HTML: white card at margin-top: 100px, padding: 0 20px on fields
 *  - Progress bar and button OUTSIDE white card
 */

import { Info } from 'lucide-react'
import { Icon } from '../Icon'
import { metaFormTokens } from '../tokens'
import type { MetaInstantFormField } from '@/lib/types/meta-instant-form'

interface ContactSlideProps {
  fields: MetaInstantFormField[]
  onContinue?: () => void
}

export function ContactSlide({ fields, onContinue }: ContactSlideProps) {
  const { slideHeights, spacing, typography, colors, card, button, progressBar } = metaFormTokens

  return (
    <div style={{ transform: 'translateX(0px)', left: '324px', width: '324px', flexShrink: 0 }}>
      <div>
        {/* Close button top-right */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <Icon type="close" />
        </div>
        
        {/* White card - EXACT margin-top: 100px */}
        <div
          style={{
            marginTop: `${spacing.contentBelowProfile}px`,  // EXACT: 100px
            margin: `${spacing.contentBelowProfile}px ${spacing.slideMargin}px 0`,
            backgroundColor: card.backgroundColor,
            borderRadius: `${card.borderRadius}px`,
            boxShadow: card.boxShadow,
            padding: `${card.padding}px`,
          }}
        >
          {/* Heading with info icon */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{
              fontSize: `${typography.fontSize.lg}px`,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}>
              Contact information
            </div>
            <div style={{ marginLeft: '8px' }}>
              <Icon type="info" color={colors.text.secondary} />
            </div>
          </div>
          
          {/* Fields - EXACT padding: 0 20px (padding/horiz-20) */}
          <div style={{ padding: `0 ${spacing.horizontalPadding}px` }}>
            {fields.map((field, index) => (
              <div key={field.id} style={{ marginBottom: index < fields.length - 1 ? '16px' : '0' }}>
                <div style={{
                  fontSize: `${typography.fontSize.base}px`,
                  color: colors.text.primary,
                  marginBottom: '4px',
                }}>
                  {field.label}
                </div>
                <div style={{
                  borderBottom: `1px solid ${colors.border.divider}`,
                  paddingBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{
                    color: colors.text.tertiary,
                    fontSize: `${typography.fontSize.base}px`,
                  }}>
                    Enter your answer.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Progress bar - OUTSIDE white card */}
      <div role="none" style={{ marginTop: '16px', padding: `0 ${spacing.slideMargin}px` }}>
        <div
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={50}
        >
          <div style={{
            height: `${progressBar.height}px`,
            backgroundColor: progressBar.trackColor,
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: progressBar.fillColor,
              transform: 'translateX(-50%)',  // EXACT: -50% for 50%
              transition: 'transform 300ms ease-in-out',
            }} />
          </div>
        </div>
        
        {/* Continue button - OUTSIDE white card */}
        <div
          onClick={onContinue}
          style={{
            marginTop: '12px',
            backgroundColor: button.backgroundColor,
            borderRadius: `${button.borderRadius}px`,
            padding: '10px 24px',
            height: `${button.height}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{
            color: button.color,
            fontSize: `${typography.fontSize.base}px`,
            fontWeight: typography.fontWeight.semibold,
          }}>
            Continue
          </div>
        </div>
      </div>
    </div>
  )
}

