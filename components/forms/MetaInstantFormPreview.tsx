/**
 * Feature: Meta Instant Forms Preview (Orchestrator)
 * Purpose: Stage orchestrator producing pixel-perfect 3-stage form flow
 * References:
 *  - Meta Instant Forms UI: Multi-stage form flow
 *  - Meta Business Help: https://www.facebook.com/business/help/1611070512241988
 */

'use client'

import { useState, useEffect } from 'react'
import { Frame } from './meta/Frame'
import { Header } from './meta/Header'
import { Progress } from './meta/Progress'
import { Field } from './meta/Field'
import { PrimaryButton } from './meta/PrimaryButton'
import { Privacy } from './meta/Privacy'
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
  const totalStages = 3

  const { spacing } = metaFormTokens

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

  // Stage definitions
  const stages = [
    {
      title: 'Prefill information',
      fields: [emailField, fullNameField].filter(Boolean),
    },
    {
      title: 'Contact information',
      fields: [phoneField].filter(Boolean),
    },
    {
      title: 'Review',
      fields: [],
    },
  ]

  // Thank you screen (stage 4)
  if (showThankYou || stage === 4) {
    return (
      <Frame>
        <ThankYou
          title={form.thankYou?.title || 'Thanks for your interest!'}
          body={form.thankYou?.body}
          ctaText={form.thankYou?.ctaText}
          ctaUrl={form.thankYou?.ctaUrl}
        />
      </Frame>
    )
  }

  const currentStage = stages[stage - 1]

  return (
    <Frame>
      {/* Progress bar */}
      <Progress currentStep={stage} totalSteps={totalStages} />

      {/* Header with navigation */}
      <Header
        title={currentStage?.title || 'Form'}
        currentStep={stage}
        totalSteps={totalStages}
        onPrevious={handlePrev}
        onNext={handleNext}
      />

      {/* Form content */}
      <div
        className="px-4"
        style={{
          paddingTop: spacing['2xl'],
          paddingBottom: spacing['3xl'],
        }}
      >
        {/* Form name as heading */}
        <h1
          className="font-semibold mb-1"
          style={{
            fontSize: metaFormTokens.typography.fontSize.lg,
            color: metaFormTokens.colors.text.primary,
            marginBottom: spacing.md,
          }}
        >
          {form.name}
        </h1>

        {/* Stage-specific content */}
        {stage === 3 ? (
          // Review stage: Show summary
          <div className="space-y-4">
            <p
              style={{
                fontSize: metaFormTokens.typography.fontSize.base,
                color: metaFormTokens.colors.text.secondary,
                lineHeight: metaFormTokens.typography.lineHeight.relaxed,
                marginBottom: spacing.xl,
              }}
            >
              Please review your information before submitting.
            </p>

            {/* Summary of all fields */}
            <div
              className="rounded-lg p-4 space-y-3"
              style={{
                backgroundColor: metaFormTokens.colors.surface,
                border: `1px solid ${metaFormTokens.colors.border.light}`,
                borderRadius: metaFormTokens.radii.card,
              }}
            >
              {form.fields.map((field) => (
                <div key={field.id} className="flex justify-between">
                  <span
                    style={{
                      fontSize: metaFormTokens.typography.fontSize.base,
                      color: metaFormTokens.colors.text.secondary,
                    }}
                  >
                    {field.label}
                  </span>
                  <span
                    style={{
                      fontSize: metaFormTokens.typography.fontSize.base,
                      color: metaFormTokens.colors.text.tertiary,
                    }}
                  >
                    {field.type === 'EMAIL'
                      ? 'user@example.com'
                      : field.type === 'FULL_NAME'
                        ? 'John Doe'
                        : '+1 (555) 123-4567'}
                  </span>
                </div>
              ))}
            </div>

            {/* Submit button */}
            <div style={{ marginTop: spacing['3xl'] }}>
              <PrimaryButton>Submit</PrimaryButton>
            </div>
          </div>
        ) : (
          // Field stages: Show input fields
          <div className="space-y-4">
            {currentStage?.fields.map((field) =>
              field ? (
                <Field key={field.id} type={field.type} label={field.label} />
              ) : null
            )}

            {/* Continue button */}
            {currentStage && currentStage.fields.length > 0 && (
              <div style={{ marginTop: spacing['3xl'] }}>
                <PrimaryButton>Continue</PrimaryButton>
              </div>
            )}
          </div>
        )}

        {/* Privacy text at bottom */}
        <div style={{ marginTop: spacing['3xl'] }}>
          <Privacy
            linkText={form.privacy.linkText}
            url={form.privacy.url}
          />
        </div>
      </div>
    </Frame>
  )
}

