/**
 * Feature: Meta Instant Forms Preview - EXACT Facebook Implementation
 * Purpose: Complete orchestrator matching Facebook's exact HTML structure
 * References:
 *  - Facebook HTML files with exact DOM structure
 *  - All spacing, sizing, and positioning matches Facebook exactly
 */

'use client'

import { useState, useEffect } from 'react'
import { OuterContainer } from './meta/OuterContainer'
import { NavigationHeader } from './meta/NavigationHeader'
import { IntroSlide } from './meta/slides/IntroSlide'
import { ContactSlide } from './meta/slides/ContactSlide'
import { PrivacySlide } from './meta/slides/PrivacySlide'
import { ThankYouSlide } from './meta/slides/ThankYouSlide'
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

  const { slider } = metaFormTokens

  // Reset stage when form changes or showThankYou changes
  useEffect(() => {
    if (showThankYou) {
      setStage(4)
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

  // Stage definitions - EXACT from Facebook
  const stages = [
    { title: 'Intro' },
    { title: 'Prefill information' },
    { title: 'Privacy review' },
    { title: 'Message for leads' },
  ]

  const currentStage = stages[stage - 1]

  return (
    <OuterContainer>
      {/* Navigation Header - OUTSIDE slider */}
      <NavigationHeader
        title={currentStage?.title || 'Form'}
        currentStep={stage}
        totalSteps={totalStages}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Horizontal Slider Container */}
      <div style={{ position: 'relative' }}>
        {/* Slides wrapper - EXACT display: flex with transform */}
        <div
          style={{
            display: 'flex',
            transform: `translateX(-${slider.slidePositions[stage - 1]}px)`,  // EXACT: 0, -324, -648, -972
            transition: `transform ${slider.transitionDuration} ease-in-out`,
          }}
        >
          {/* Slide 1: Intro - NO white card */}
          <IntroSlide
            pageProfilePicture={form.pageProfilePicture}
            pageName={form.pageName}
            headline={form.introHeadline || form.name}
            onContinue={handleNext}
          />

          {/* Slide 2: Contact Information - WITH white card */}
          <ContactSlide
            fields={contactFields}
            onContinue={handleNext}
          />

          {/* Slide 3: Privacy Review - NO white card */}
          <PrivacySlide
            pageName={form.pageName}
            privacyUrl={form.privacy.url}
            onSubmit={handleNext}
          />

          {/* Slide 4: Thank You - NO white card */}
          <ThankYouSlide
            title={form.thankYou?.title || 'Thanks, you\'re all set.'}
            body={form.thankYou?.body || 'You can visit our website or exit the form now.'}
            ctaText={form.thankYou?.ctaText || 'View website'}
            ctaUrl={form.thankYou?.ctaUrl}
            pageProfilePicture={form.pageProfilePicture}
            pageName={form.pageName}
          />
        </div>
      </div>
    </OuterContainer>
  )
}
