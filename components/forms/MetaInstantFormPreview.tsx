/**
 * Feature: Meta Instant Forms Preview - PIXEL PERFECT
 * Purpose: Horizontal slider carousel matching Facebook's EXACT implementation
 * References:
 *  - Meta Instant Forms UI: Exact HTML/CSS from Facebook
 *  - Facebook CSS files: ._8duj, ._81-n, exact dimensions and styling
 */

'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { SimpleContainer } from './meta/SimpleContainer'
import { Intro } from './meta/Intro'
import { ContactSlide } from './meta/ContactSlide'
import { PrivacyReview } from './meta/PrivacyReview'
import { ThankYou } from './meta/ThankYou'
import { metaFormTokens } from './meta/tokens'
import type { MetaInstantForm } from '@/lib/types/meta-instant-form'

interface MetaInstantFormPreviewProps {
  form: MetaInstantForm
  showThankYou?: boolean
}

export function MetaInstantFormPreview({
  form,
  showThankYou = false,
}: MetaInstantFormPreviewProps) {
  const [stage, setStage] = useState(1)
  const totalStages = 4

  const { slider, colors, typography } = metaFormTokens

  // Reset stage when form changes or showThankYou changes
  useEffect(() => {
    if (showThankYou) {
      setStage(4) // Thank you is stage 4
    } else {
      setStage(1)
    }
  }, [form.id, showThankYou])

  const handlePrev = () => {
    setStage((prev) => (prev > 1 ? prev - 1 : totalStages))
  }

  const handleNext = () => {
    setStage((prev) => (prev < totalStages ? prev + 1 : 1))
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Find all contact fields
  const emailField = form.fields.find((f) => f.type === 'EMAIL')
  const fullNameField = form.fields.find((f) => f.type === 'FULL_NAME')
  const phoneField = form.fields.find((f) => f.type === 'PHONE')
  const contactFields = [emailField, fullNameField, phoneField].filter(Boolean) as typeof form.fields

  // Stage definitions
  const stages = [
    { title: 'Intro' },
    { title: 'Prefill information' },
    { title: 'Privacy review' },
    { title: 'Message for leads' },
  ]

  const currentStage = stages[stage - 1]

  return (
    <SimpleContainer>
      {/* Header - OUTSIDE slider */}
      <div style={{ padding: '16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color={colors.button.primary} strokeWidth={2.5} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: `${typography.fontSize.lg - 1}px`,  // 17px
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
              }}
            >
              {currentStage?.title || 'Form'}
            </div>
            <div
              style={{
                fontSize: `${typography.fontSize.xs}px`,  // 11px
                color: colors.text.secondary,
                marginTop: '2px',
              }}
            >
              {stage} of {totalStages}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={20} color={colors.button.primary} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Slider container */}
      <div
        style={{
          overflow: 'hidden',
          position: 'relative',
          width: `${slider.slideWidth}px`,  // EXACT: 324px
        }}
      >
        {/* Close X button - in gray area, absolute positioned */}
        <button
          type="button"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            background: 'transparent',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
          }}
        >
          <X size={20} color={colors.text.secondary} strokeWidth={2} />
        </button>

        {/* Slides wrapper */}
        <div
          style={{
            display: 'flex',
            transform: `translateX(-${(stage - 1) * slider.slideWidth}px)`,  // EXACT: 0, -324px, -648px, -972px
            transition: `transform ${slider.transitionDuration} ease-in-out`,
          }}
        >
          {/* Slide 1: Intro - NO white card */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <Intro
              pageProfilePicture={form.pageProfilePicture}
              pageName={form.pageName}
              headline={form.introHeadline || form.name}
              onContinue={handleNext}
            />
          </div>

          {/* Slide 2: Contact Information - WITH white card */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <ContactSlide
              fields={contactFields}
              onContinue={handleNext}
            />
          </div>

          {/* Slide 3: Privacy Review - NO white card */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <PrivacyReview
              pageName={form.pageName}
              privacyUrl={form.privacy.url}
              onSubmit={handleNext}
            />
          </div>

          {/* Slide 4: Thank You - NO white card */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <ThankYou
              title={form.thankYou?.title || 'Thanks, you\'re all set.'}
              body={form.thankYou?.body || 'You can visit our website or exit the form now.'}
              ctaText={form.thankYou?.ctaText || 'View website'}
              ctaUrl={form.thankYou?.ctaUrl}
              pageProfilePicture={form.pageProfilePicture}
              pageName={form.pageName}
            />
          </div>
        </div>
      </div>
    </SimpleContainer>
  )
}
