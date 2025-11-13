"use client"

/**
 * Feature: Lead Form Two-Column Builder
 * Purpose: Orchestrates Create New vs Select Existing flows with left controls and right live mockup
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Supabase (server auth, not used directly here): https://supabase.com/docs/guides/auth/server/nextjs
 */

import { useMemo, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetaInstantFormPreview } from "@/components/forms/MetaInstantFormPreview"
import { LeadFormCreate } from "@/components/forms/lead-form-create"
import { LeadFormExisting } from "@/components/forms/lead-form-existing"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useGoal } from "@/lib/context/goal-context"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useDestination } from "@/lib/context/destination-context"
import { metaStorage } from "@/lib/meta/storage"
import { mapBuilderStateToMetaForm } from "@/lib/meta/instant-form-mapper"
import { DestinationSelectionCanvas } from "@/components/destination-selection-canvas"
import { MetaConnectionCheckDialog } from "@/components/meta/meta-connection-check-dialog"

interface SelectedFormData {
  id: string
  name: string
}

interface LeadFormSetupProps {
  onFormSelected: (form: SelectedFormData) => void
}

// Preview steps for navigation
const PREVIEW_STEPS = [
  { title: "Intro" },
  { title: "Prefill information" },
  { title: "Privacy review" },
  { title: "Message for leads" },
]

export function LeadFormSetup({ onFormSelected }: LeadFormSetupProps) {
  const { goalState } = useGoal()
  const { campaign } = useCampaignContext()
  const { destinationState, setDestinationType } = useDestination()
  const hasSavedForm = !!goalState.formData?.id
  const [tab, setTab] = useState<"create" | "existing">(hasSavedForm ? "existing" : "create")
  const [selectedFormId, setSelectedFormId] = useState<string | null>(goalState.formData?.id ?? null)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [showMetaConnectionDialog, setShowMetaConnectionDialog] = useState(false)
  const [hasSelectedDestination, setHasSelectedDestination] = useState(false)

  // Check if destination was already selected (restoring state)
  useEffect(() => {
    if (destinationState.data?.type === 'instant_form' || destinationState.status === 'in_progress' || destinationState.status === 'completed') {
      setHasSelectedDestination(true)
    }
  }, [destinationState])

  // Shared preview state for Create tab
  const [formName, setFormName] = useState<string>("Lead Form")
  const [privacyUrl, setPrivacyUrl] = useState<string>("https://adpilot.studio/general-privacy-policy")
  const [privacyLinkText, setPrivacyLinkText] = useState<string>("Privacy Policy")
  const [fields, setFields] = useState<Array<{ id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }>>([
    { id: "full", type: "full_name", label: "Full Name", required: true },
    { id: "email", type: "email", label: "Email Address", required: true },
    { id: "phone", type: "phone", label: "Phone Number", required: true },
  ])

  // Intro page state
  const [introHeadline, setIntroHeadline] = useState<string>("")
  const [introDescription, setIntroDescription] = useState<string>("")

  // Thank you page state is lifted here so it persists when switching tabs
  const [thankYouTitle, setThankYouTitle] = useState<string>("Thanks for your interest!")
  const [thankYouMessage, setThankYouMessage] = useState<string>("We'll contact you within 24 hours")
  const [thankYouButtonText, setThankYouButtonText] = useState<string>("View website")
  const [thankYouButtonUrl, setThankYouButtonUrl] = useState<string>("")

  // Page data for preview
  const [pageProfilePicture, setPageProfilePicture] = useState<string | undefined>(undefined)
  const [pageData, setPageData] = useState<{
    pageId?: string
    pageName?: string
  }>({})

  const mockFields = useMemo(() => fields.map(f => ({ ...f })), [fields])

  // Fetch page data on mount
  useEffect(() => {
    if (!campaign?.id) return

    const connection = metaStorage.getConnection(campaign.id)
    if (!connection) return

    setPageData({
      pageId: connection.selected_page_id || undefined,
      pageName: connection.selected_page_name || undefined,
    })

    // Fetch page profile picture
    const fetchPagePicture = async () => {
      if (!connection.selected_page_id) return

      try {
        const url = new URL('/api/meta/page-picture', window.location.origin)
        url.searchParams.set('campaignId', campaign.id)
        url.searchParams.set('pageId', connection.selected_page_id)
        if (connection.selected_page_access_token) {
          url.searchParams.set('pageAccessToken', connection.selected_page_access_token)
        }

        const res = await fetch(url.toString())
        const json: unknown = await res.json()
        if (
          res.ok &&
          json &&
          typeof json === 'object' &&
          'pictureUrl' in json &&
          typeof json.pictureUrl === 'string'
        ) {
          setPageProfilePicture(json.pictureUrl)
        }
      } catch (e) {
        console.warn('[LeadFormSetup] Failed to fetch page picture:', e)
      }
    }

    fetchPagePicture()
  }, [campaign?.id])

  // Convert builder state to MetaInstantForm for preview
  const previewForm = useMemo(() => {
    const form = mapBuilderStateToMetaForm(
      {
        formName,
        introHeadline,
        introDescription,
        privacyUrl,
        privacyLinkText,
        fields,
        thankYouTitle,
        thankYouMessage,
        thankYouButtonText,
        thankYouButtonUrl,
      },
      {
        pageId: pageData.pageId,
        pageName: pageData.pageName,
        pageProfilePicture,
      }
    )
    // Include form ID if we have a selected form
    if (selectedFormId) {
      form.id = selectedFormId
    }
    return form
  }, [
    formName,
    introHeadline,
    introDescription,
    privacyUrl,
    privacyLinkText,
    fields,
    thankYouTitle,
    thankYouMessage,
    thankYouButtonText,
    thankYouButtonUrl,
    pageData.pageId,
    pageData.pageName,
    pageProfilePicture,
    selectedFormId,
  ])

  // Handle destination type selection
  const handleInstantFormsSelected = useCallback(() => {
    console.log('[LeadFormSetup] Instant Forms selected, proceeding to form builder')
    setDestinationType('instant_form')
    setHasSelectedDestination(true)
    setShowMetaConnectionDialog(false)
  }, [setDestinationType])

  const handleMetaConnectionRequired = useCallback(() => {
    console.log('[LeadFormSetup] Meta connection required, showing dialog')
    setShowMetaConnectionDialog(true)
  }, [])

  const handleMetaConnectionSuccess = useCallback(() => {
    console.log('[LeadFormSetup] Meta connection successful, proceeding to form builder')
    setDestinationType('instant_form')
    setHasSelectedDestination(true)
    setShowMetaConnectionDialog(false)
  }, [setDestinationType])

  // If destination type not selected yet, show destination selection
  if (!hasSelectedDestination) {
    return (
      <>
        <DestinationSelectionCanvas
          onInstantFormsSelected={handleInstantFormsSelected}
          onMetaConnectionRequired={handleMetaConnectionRequired}
        />
        <MetaConnectionCheckDialog
          open={showMetaConnectionDialog}
          onOpenChange={setShowMetaConnectionDialog}
          onSuccess={handleMetaConnectionSuccess}
        />
      </>
    )
  }

  // Show form builder after destination is selected
  return (
    <div className="w-full px-4 py-6">
      <div className="grid lg:grid-cols-2 gap-8 w-full">
          {/* Left Panel - Form Selection/Creation */}
          <div className="space-y-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "existing")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="existing" className="text-base">Select Existing</TabsTrigger>
                <TabsTrigger value="create" className="text-base">Create New</TabsTrigger>
              </TabsList>
              <TabsContent value="existing" className="space-y-4 mt-6">
                <LeadFormExisting
                  onPreview={(preview) => {
                    console.log('[LeadFormSetup] Preview callback received:', {
                      id: preview.id,
                      name: preview.name,
                      fieldsCount: preview.fields.length,
                      hasThankYou: !!preview.thankYouTitle,
                    })
                    // Update all form state to trigger preview recalculation
                    setFormName(preview.name)
                    setPrivacyUrl(preview.privacyUrl || "")
                    setPrivacyLinkText(preview.privacyLinkText || "Privacy Policy")
                    setFields(preview.fields)
                    // Update thank you page data if provided
                    if (preview.thankYouTitle) setThankYouTitle(preview.thankYouTitle)
                    if (preview.thankYouMessage !== undefined) setThankYouMessage(preview.thankYouMessage)
                    if (preview.thankYouButtonText) setThankYouButtonText(preview.thankYouButtonText)
                    if (preview.thankYouButtonUrl) setThankYouButtonUrl(preview.thankYouButtonUrl)
                    // Update selectedFormId to ensure previewForm includes the ID
                    setSelectedFormId(preview.id)
                  }}
                  onConfirm={(existing) => {
                    setSelectedFormId(existing.id)
                    onFormSelected(existing)
                    // Signal stepper to advance once state completes
                    setTimeout(() => {
                      try { window.dispatchEvent(new Event('autoAdvanceStep')) } catch {}
                    }, 0)
                  }}
                  onRequestCreate={() => setTab("create")}
                  selectedFormId={selectedFormId}
                  onPreviewError={(error) => {
                    setPreviewError(error)
                  }}
                />
              </TabsContent>
              <TabsContent value="create" className="space-y-6 mt-6">
                <LeadFormCreate
                  formName={formName}
                  onFormNameChange={setFormName}
                  introHeadline={introHeadline}
                  onIntroHeadlineChange={setIntroHeadline}
                  introDescription={introDescription}
                  onIntroDescriptionChange={setIntroDescription}
                  privacyUrl={privacyUrl}
                  onPrivacyUrlChange={setPrivacyUrl}
                  privacyLinkText={privacyLinkText}
                  onPrivacyLinkTextChange={setPrivacyLinkText}
                  fields={fields}
                  onFieldsChange={setFields}
                  thankYouTitle={thankYouTitle}
                  onThankYouTitleChange={setThankYouTitle}
                  thankYouMessage={thankYouMessage}
                  onThankYouMessageChange={setThankYouMessage}
                  thankYouButtonText={thankYouButtonText}
                  onThankYouButtonTextChange={setThankYouButtonText}
                  thankYouButtonUrl={thankYouButtonUrl}
                  onThankYouButtonUrlChange={setThankYouButtonUrl}
                  onConfirm={(created) => {
                    // Auto-select newly created form: switch to Existing and highlight
                    setSelectedFormId(created.id)
                    setTab("existing")
                    onFormSelected(created)
                    // Signal stepper to advance once state completes
                    setTimeout(() => {
                      try { window.dispatchEvent(new Event('autoAdvanceStep')) } catch {}
                    }, 0)
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <div className="p-8 bg-muted/30 rounded-lg border border-border">
              {/* Step Title Outside Phone */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{PREVIEW_STEPS[currentStep]?.title || 'Preview'}</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                      className="h-10 w-10"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-medium min-w-[60px] text-center">
                      {currentStep + 1} of {PREVIEW_STEPS.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentStep(Math.min(PREVIEW_STEPS.length - 1, currentStep + 1))}
                      disabled={currentStep === PREVIEW_STEPS.length - 1}
                      className="h-10 w-10"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {previewError && (
                <div className="mb-4 p-4 rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive">
                  <p className="font-medium mb-1">Preview Error</p>
                  <p>{previewError}</p>
                </div>
              )}

              {/* Phone Mockup */}
              <MetaInstantFormPreview
                form={previewForm}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
              />
            </div>
          </div>
        </div>
    </div>
  )
}
