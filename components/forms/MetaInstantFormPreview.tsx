/**
 * Feature: Meta Instant Forms Preview - Lovable Design
 * Purpose: Pixel-perfect preview matching Lovable design with 4-step navigation
 * References:
 *  - Lovable: https://github.com/jackhunterking/preview-palette-builder.git
 *  - Phone mockup with proper styling
 *  - Progress bar and step-based CTA buttons
 */

'use client'

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

  return (
    <div className="mx-auto max-w-md">
      <div className="bg-[#E4E6EB] rounded-2xl p-4 shadow-xl">
        {/* Phone Content Area */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden min-h-[600px] flex flex-col">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between p-4 border-b">
            {currentStep > 0 && (
              <button className="p-1 hover:bg-muted rounded-full transition-colors">
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {currentStep === 0 && <div className="w-8" />}
            <button className="p-1 hover:bg-muted rounded-full transition-colors ml-auto">
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
                  {form.fields.find((f) => f.type === 'EMAIL') && (
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Email
                      </label>
                      <div className="border-b border-muted-foreground/20 pb-2">
                        <input
                          type="text"
                          placeholder="Enter your answer."
                          className="w-full bg-transparent text-muted-foreground outline-none placeholder:text-muted-foreground/60"
                          disabled
                        />
                      </div>
                    </div>
                  )}
                  {form.fields.find((f) => f.type === 'FULL_NAME') && (
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Full name
                      </label>
                      <div className="border-b border-muted-foreground/20 pb-2">
                        <input
                          type="text"
                          placeholder="Enter your answer."
                          className="w-full bg-transparent text-muted-foreground outline-none placeholder:text-muted-foreground/60"
                          disabled
                        />
                      </div>
                    </div>
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
            <Button
              className="w-full h-12 text-base font-medium rounded-full"
              onClick={() => onStepChange?.(Math.min(currentStep + 1, 3))}
            >
              {currentStep === 3 ? (
                'View website'
              ) : currentStep === 2 ? (
                'Submit'
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
