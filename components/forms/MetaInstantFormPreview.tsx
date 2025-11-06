/**
 * Feature: Meta Instant Forms Preview (Orchestrator)
 * Purpose: Horizontal slider carousel with 4-stage form flow matching Facebook's actual implementation
 * References:
 *  - Meta Instant Forms UI: Horizontal slider with translateX animation
 *  - Meta Business Help: https://www.facebook.com/business/help/1611070512241988
 */

'use client'

import { useState, useEffect } from 'react'
import { Frame } from './meta/Frame'
import { Header } from './meta/Header'
import { Intro } from './meta/Intro'
import { Field } from './meta/Field'
import { PrimaryButton } from './meta/PrimaryButton'
import { PrivacyReview } from './meta/PrivacyReview'
import { ThankYou } from './meta/ThankYou'
import { CloseButton } from './meta/CloseButton'
import { ProgressBar } from './meta/ProgressBar'
import { metaFormTokens } from './meta/tokens'
import { Info } from 'lucide-react'
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

  const { slider, spacing, colors, typography } = metaFormTokens

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

  // Find fields by type
  const emailField = form.fields.find((f) => f.type === 'EMAIL')
  const fullNameField = form.fields.find((f) => f.type === 'FULL_NAME')
  const phoneField = form.fields.find((f) => f.type === 'PHONE')

  // Combine all contact fields for stage 2
  const contactFields = [emailField, fullNameField, phoneField].filter(Boolean)

  // Stage definitions
  const stages = [
    {
      title: 'Intro',
    },
    {
      title: 'Prefill information',
    },
    {
      title: 'Privacy review',
    },
    {
      title: 'Message for leads',
    },
  ]

  const currentStage = stages[stage - 1]

  return (
    <Frame>
      {/* Header with navigation - shown on all stages */}
      <Header
        title={currentStage?.title || 'Form'}
        currentStep={stage}
        totalSteps={totalStages}
        onPrevious={handlePrev}
        onNext={handleNext}
      />

      {/* Horizontal slider container */}
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            transform: `translateX(-${(stage - 1) * slider.slideWidth}px)`,
            transition: `transform ${slider.transitionDuration} ease-in-out`,
          }}
        >
          {/* Slide 1: Intro */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <Intro
              pageProfilePicture={form.pageProfilePicture}
              pageName={form.pageName}
              headline={form.introHeadline || form.name}
              onContinue={handleNext}
            />
          </div>

          {/* Slide 2: Contact Information (Email + Full Name + Phone) */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <div className="relative flex flex-col" style={{ height: '480px' }}>
              <CloseButton />
              
              <div className="flex-1 px-6 py-8" style={{ marginTop: '70px' }}>
                {/* Heading with info icon */}
                <div className="flex items-center gap-2 mb-6">
                  <h2
                    className="font-semibold"
                    style={{
                      fontSize: typography.fontSize.lg,
                      color: colors.text.primary,
                      lineHeight: typography.lineHeight.tight,
                    }}
                  >
                    Contact information
                  </h2>
                  <Info
                    size={16}
                    style={{ color: colors.text.secondary }}
                  />
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  {contactFields.map((field) =>
                    field ? (
                      <Field key={field.id} type={field.type} label={field.label} />
                    ) : null
                  )}
                </div>
              </div>

              {/* Bottom section with progress and button */}
              <div className="mt-auto">
                <div className="px-6 mb-4">
                  <ProgressBar progress={50} />
                </div>
                <div className="px-6 pb-6">
                  <PrimaryButton onClick={handleNext}>Continue</PrimaryButton>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: Privacy Review */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <PrivacyReview
              pageName={form.pageName}
              privacyUrl={form.privacy.url}
              onSubmit={handleNext}
            />
          </div>

          {/* Slide 4: Thank You */}
          <div style={{ width: `${slider.slideWidth}px`, flexShrink: 0 }}>
            <ThankYou
              title={form.thankYou?.title || 'Thanks, you\'re all set.'}
              body={
                form.thankYou?.body ||
                'You can visit our website or exit the form now.'
              }
              ctaText={form.thankYou?.ctaText || 'View website'}
              ctaUrl={form.thankYou?.ctaUrl}
              pageProfilePicture={form.pageProfilePicture}
              pageName={form.pageName}
            />
          </div>
        </div>
      </div>
    </Frame>
  )
}
