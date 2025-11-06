/**
 * Feature: Meta Instant Forms Preview - Final Correct Implementation
 * Purpose: Preview matching user screenshots with navigation outside, no scrolling, proper buttons
 * References:
 *  - User screenshots showing exact layout requirements
 *  - Navigation outside gray container
 *  - Slides toggle with display (not transform)
 */

'use client'

import { useState, useEffect } from 'react'
import { NavigationHeader } from './meta/NavigationHeader'
import { IntroSlide } from './meta/slides/IntroSlide'
import { ContactSlide } from './meta/slides/ContactSlide'
import { PrivacySlide } from './meta/slides/PrivacySlide'
import { ThankYouSlide } from './meta/slides/ThankYouSlide'
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

  // Stage definitions
  const stages = [
    { title: 'Intro' },
    { title: 'Prefill information' },
    { title: 'Privacy review' },
    { title: 'Message for leads' },
  ]

  const currentStage = stages[stage - 1]

  return (
    <div>
      {/* Navigation - OUTSIDE gray container */}
      <NavigationHeader
        title={currentStage?.title || 'Form'}
        currentStep={stage}
        totalSteps={totalStages}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Gray Container - ONLY form content */}
      <div
        style={{
          backgroundColor: '#F0F2F5',
          borderRadius: '12px',
          padding: '28px',
          minHeight: '600px',
          width: '375px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Slide 1: Intro - display toggle, NOT transform */}
        <div
          style={{
            display: stage === 1 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <IntroSlide
            pageProfilePicture={form.pageProfilePicture}
            pageName={form.pageName}
            headline={form.introHeadline || form.name}
            onContinue={handleNext}
          />
        </div>

        {/* Slide 2: Contact Information */}
        <div
          style={{
            display: stage === 2 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <ContactSlide fields={contactFields} onContinue={handleNext} />
        </div>

        {/* Slide 3: Privacy Review */}
        <div
          style={{
            display: stage === 3 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <PrivacySlide
            pageName={form.pageName}
            privacyUrl={form.privacy.url}
            onSubmit={handleNext}
          />
        </div>

        {/* Slide 4: Thank You */}
        <div
          style={{
            display: stage === 4 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <ThankYouSlide
            title={form.thankYou?.title || "Thanks, you're all set."}
            body={
              form.thankYou?.body || 'You can visit our website or exit the form now.'
            }
            ctaText={form.thankYou?.ctaText || 'View website'}
            ctaUrl={form.thankYou?.ctaUrl}
            pageProfilePicture={form.pageProfilePicture}
            pageName={form.pageName}
          />
        </div>
      </div>
    </div>
  )
}
