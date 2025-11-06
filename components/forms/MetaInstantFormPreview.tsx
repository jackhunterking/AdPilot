/**
 * Feature: Meta Instant Forms Preview - Lovable Design
 * Purpose: Pixel-perfect preview matching Lovable design with 4-step navigation
 * References:
 *  - Lovable: https://github.com/jackhunterking/preview-palette-builder.git
 *  - Phone mockup with proper styling
 *  - Progress bar and step-based CTA buttons
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, X, Info, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetaInstantForm } from '@/lib/types/meta-instant-form'

interface MetaInstantFormPreviewProps {
  form: MetaInstantForm
  currentStep: number
  onStepChange?: (step: number) => void
}

export function MetaInstantFormPreview({
  form,
  currentStep,
  onStepChange,
}: MetaInstantFormPreviewProps) {
  // Form state management
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Create a stable form key to detect when form structure changes
  // Include form ID, name, field count, field types, and field IDs for reliable change detection
  const formKey = useMemo(() => {
    const fieldSignature = form.fields
      .map(f => `${f.id}:${f.type}:${f.label}`)
      .sort()
      .join('|')
    const formSignature = `${form.id || 'new'}-${form.name || 'unnamed'}-${form.fields.length}-${fieldSignature}`
    return formSignature
  }, [form.id, form.name, form.fields])

  // Reset form state when form structure changes
  useEffect(() => {
    console.log('[MetaInstantFormPreview] Form structure changed, resetting:', {
      formKey,
      formId: form.id,
      formName: form.name,
      fieldsCount: form.fields.length,
    })
    setFieldValues({})
    setFieldErrors({})
    // Reset to step 0 when form structure changes
    onStepChange?.(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey])

  // Get page initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'JH'
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const pageName = form.pageName || 'Jack Hunter X'
  const initials = getInitials(pageName)

  // Handle field value changes
  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
    // Clear error when user starts typing
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate form before proceeding
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    form.fields.forEach((field) => {
      const value = fieldValues[field.id] || ''
      
      if (field.required && !value.trim()) {
        errors[field.id] = 'This field is required'
      } else if (field.type === 'EMAIL' && value.trim() && !validateEmail(value.trim())) {
        errors[field.id] = 'Please enter a valid email address'
      }
    })

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle step navigation with validation
  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate before proceeding to privacy step
      if (!validateForm()) {
        return
      }
    }
    
    if (currentStep === 2) {
      // Final validation before submission
      if (!validateForm()) {
        return
      }
    }

    onStepChange?.(Math.min(currentStep + 1, 3))
  }

  // Get input type based on field type
  const getInputType = (fieldType: string): string => {
    switch (fieldType) {
      case 'EMAIL':
        return 'email'
      case 'PHONE':
        return 'tel'
      default:
        return 'text'
    }
  }

  // Get placeholder based on field type
  const getPlaceholder = (fieldType: string): string => {
    switch (fieldType) {
      case 'EMAIL':
        return 'email@example.com'
      case 'PHONE':
        return '+1 (555) 000-0000'
      default:
        return 'Enter your answer.'
    }
  }

  return (
    <div className="mx-auto w-[375px]">
      <div className="bg-[#E4E6EB] rounded-2xl p-4 shadow-xl">
        {/* Phone Content Area */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden min-h-[600px] flex flex-col">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between p-4 border-b">
            {currentStep > 0 ? (
              <button 
                onClick={() => onStepChange?.(Math.max(currentStep - 1, 0))}
                className="p-1 hover:bg-muted rounded-full transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : (
              <div className="w-8" />
            )}
            <button 
              className="p-1 hover:bg-muted rounded-full transition-colors ml-auto"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Step 0: Intro */}
            {currentStep === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mb-4 overflow-hidden">
                  {form.pageProfilePicture ? (
                    <img
                      src={form.pageProfilePicture}
                      alt={pageName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{pageName}</p>
                <h3 className="text-2xl font-bold text-center">
                  {form.introHeadline || 'Headline text'}
                </h3>
              </div>
            )}

            {/* Step 1: Contact Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="text-lg font-semibold">Contact information</h3>
                  <Info className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-4">
                  {form.fields.map((field) => {
                    const value = fieldValues[field.id] || ''
                    const error = fieldErrors[field.id]
                    const hasError = !!error

                    return (
                      <div key={field.id}>
                        <label className="text-sm text-muted-foreground mb-2 block">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </label>
                        <div className={cn(
                          "border-b pb-2 transition-colors",
                          hasError 
                            ? "border-destructive" 
                            : "border-muted-foreground/20 focus-within:border-primary"
                        )}>
                          <input
                            type={getInputType(field.type)}
                            placeholder={getPlaceholder(field.type)}
                            value={value}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            className={cn(
                              "w-full bg-transparent outline-none placeholder:text-muted-foreground/60 transition-colors",
                              hasError 
                                ? "text-destructive" 
                                : "text-foreground"
                            )}
                          />
                        </div>
                        {hasError && (
                          <p className="text-xs text-destructive mt-1">{error}</p>
                        )}
                      </div>
                    )
                  })}
                  {form.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">No fields configured for this form.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Privacy Policy */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Privacy policy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By clicking Submit, you agree to send your info to {pageName} who agrees
                  to use it according to their privacy policy. Facebook will also use it
                  subject to our Data Policy, including to auto-fill forms for ads.
                </p>
                <a href="#" className="text-sm text-primary hover:underline block">
                  View Facebook Data Policy.
                </a>
                <a
                  href={form.privacy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline block"
                >
                  Visit {pageName}&apos;s {form.privacy.linkText || 'Privacy Policy'}.
                </a>
              </div>
            )}

            {/* Step 3: Thank You */}
            {currentStep === 3 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mb-4 overflow-hidden">
                  {form.pageProfilePicture ? (
                    <img
                      src={form.pageProfilePicture}
                      alt={pageName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{pageName}</p>
                <h3 className="text-xl font-bold mb-3">
                  {form.thankYou?.title || "Thanks, you're all set."}
                </h3>
                <p className="text-sm text-foreground mb-6">
                  {form.thankYou?.body || 'You can visit our website or exit the form now.'}
                </p>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>You successfully submitted your responses.</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="p-6 pt-0 space-y-3">
            {/* Progress Bar (only steps 0-2) */}
            {currentStep < 3 && (
              <div className="flex gap-1">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      idx <= currentStep ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            )}

            {/* CTA Button */}
            {currentStep === 3 && form.thankYou?.ctaUrl ? (
              <Button
                asChild
                className="w-full h-12 text-base font-medium rounded-full"
              >
                <a href={form.thankYou.ctaUrl} target="_blank" rel="noopener noreferrer">
                  {form.thankYou?.ctaText || 'View website'}
                </a>
              </Button>
            ) : (
              <Button
                className="w-full h-12 text-base font-medium rounded-full"
                onClick={handleNextStep}
              >
                {currentStep === 3 ? (
                  form.thankYou?.ctaText || 'View website'
                ) : currentStep === 2 ? (
                  'Submit'
                ) : (
                  <>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
