/**
 * Feature: Meta Instant Forms Preview (Orchestrator)
 * Purpose: Stage orchestrator producing pixel-perfect 5-stage form flow
 * References:
 *  - Meta Instant Forms UI: Multi-stage form flow with centered cards
 *  - Meta Business Help: https://www.facebook.com/business/help/1611070512241988
 */

'use client'

import { useState, useEffect } from 'react'
import { Frame } from './meta/Frame'
import { Header } from './meta/Header'
import { Card } from './meta/Card'
import { Intro } from './meta/Intro'
import { Field } from './meta/Field'
import { PrimaryButton } from './meta/PrimaryButton'
import { Privacy } from './meta/Privacy'
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
  const totalStages = 5

  const { spacing } = metaFormTokens

  // Reset stage when form changes or showThankYou changes
  useEffect(() => {
    if (showThankYou) {
      setStage(5) // Thank you is stage 5
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

  // Stage definitions
  const stages = [
    {
      title: 'Intro',
      fields: [],
    },
    {
      title: 'Prefill information',
      fields: [emailField, fullNameField].filter(Boolean),
    },
    {
      title: 'Contact information',
      fields: [phoneField].filter(Boolean),
    },
    {
      title: 'Privacy review',
      fields: [],
    },
    {
      title: 'Message for leads',
      fields: [],
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

      {/* Stage-specific content */}
      {stage === 1 ? (
        // Stage 1: Intro
        <Card showBack={false} showClose={true}>
          <Intro
            pageProfilePicture={form.pageProfilePicture}
            pageName={form.pageName}
            headline={form.introHeadline || form.name}
            onContinue={handleNext}
          />
        </Card>
      ) : stage === 2 || stage === 3 ? (
        // Stage 2: Prefill information (Email + Full Name)
        // Stage 3: Contact information (Phone)
        <Card showBack={true} showClose={true} onBack={handlePrev}>
          <div className="px-6 py-8">
            {/* Form name as heading */}
            <h1
              className="font-semibold mb-6"
              style={{
                fontSize: metaFormTokens.typography.fontSize.lg,
                color: metaFormTokens.colors.text.primary,
              }}
            >
              {form.name}
            </h1>

            {/* Fields */}
            <div className="space-y-4">
              {currentStage?.fields.map((field) =>
                field ? (
                  <Field key={field.id} type={field.type} label={field.label} />
                ) : null
              )}
            </div>

            {/* Continue button */}
            {currentStage && currentStage.fields.length > 0 && (
              <div style={{ marginTop: spacing['3xl'] }}>
                <PrimaryButton onClick={handleNext}>Continue</PrimaryButton>
              </div>
            )}

            {/* Privacy text at bottom */}
            <div style={{ marginTop: spacing['3xl'] }}>
              <Privacy linkText={form.privacy.linkText} url={form.privacy.url} />
            </div>
          </div>
        </Card>
      ) : stage === 4 ? (
        // Stage 4: Privacy Review
        <Card showBack={true} showClose={true} onBack={handlePrev}>
          <PrivacyReview
            pageName={form.pageName}
            privacyUrl={form.privacy.url}
            onSubmit={handleNext}
          />
        </Card>
      ) : (
        // Stage 5: Thank You
        <Card showBack={false} showClose={true}>
          <ThankYou
            title={form.thankYou?.title || 'Thanks, you\'re all set.'}
            body={
              form.thankYou?.body ||
              'You can visit our website or exit the form now.'
            }
            ctaText={form.thankYou?.ctaText || 'View website'}
            ctaUrl={form.thankYou?.ctaUrl}
          />
        </Card>
      )}
    </Frame>
  )
}

