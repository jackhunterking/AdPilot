"use client"

/**
 * Feature: Lead Form Two-Column Builder
 * Purpose: Orchestrates Create New vs Select Existing flows with left controls and right live mockup
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Supabase (server auth, not used directly here): https://supabase.com/docs/guides/auth/server/nextjs
 */

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MetaInstantFormPreview } from "@/components/forms/MetaInstantFormPreview"
import { LeadFormCreate } from "@/components/forms/lead-form-create"
import { LeadFormExisting } from "@/components/forms/lead-form-existing"
import { cn } from "@/lib/utils"
import { useGoal } from "@/lib/context/goal-context"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { metaStorage } from "@/lib/meta/storage"
import { mapBuilderStateToMetaForm } from "@/lib/meta/instant-form-mapper"

interface SelectedFormData {
  id: string
  name: string
}

interface LeadFormSetupProps {
  onFormSelected: (form: SelectedFormData) => void
  onChangeGoal: () => void
}

export function LeadFormSetup({ onFormSelected, onChangeGoal }: LeadFormSetupProps) {
  const { goalState } = useGoal()
  const { campaign } = useCampaignContext()
  const hasSavedForm = !!goalState.formData?.id
  const [tab, setTab] = useState<"create" | "existing">(hasSavedForm ? "existing" : "create")
  const [selectedFormId, setSelectedFormId] = useState<string | null>(goalState.formData?.id ?? null)

  // Shared preview state for Create tab
  const [formName, setFormName] = useState<string>("Lead Form")
  const [privacyUrl, setPrivacyUrl] = useState<string>("https://adpilot.studio/general-privacy-policy")
  const [privacyLinkText, setPrivacyLinkText] = useState<string>("Privacy Policy")
  const [fields, setFields] = useState<Array<{ id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }>>([
    { id: "full", type: "full_name", label: "Full Name", required: true },
    { id: "email", type: "email", label: "Email Address", required: true },
    { id: "phone", type: "phone", label: "Phone Number", required: true },
  ])

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
    return mapBuilderStateToMetaForm(
      {
        formName,
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
  }, [
    formName,
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
  ])

  const tabs = [
    { id: "create", label: "Create New" },
    { id: "existing", label: "Select Existing" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Format Tabs - matching creative/copy style */}
      <div className="flex justify-center pb-4">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          {tabs.map((tabItem) => {
            const isActive = tab === tabItem.id
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id as "create" | "existing")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tabItem.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-4">
          {tab === "create" && (
            <LeadFormCreate
              formName={formName}
              onFormNameChange={setFormName}
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
          )}
          {tab === "existing" && (
            <LeadFormExisting
              onPreview={(preview) => {
                setFormName(preview.name)
                setPrivacyUrl(preview.privacyUrl || "")
                setPrivacyLinkText(preview.privacyLinkText || "Privacy Policy")
                setFields(preview.fields)
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
            />
          )}
        </div>

        {/* Right column - Live mockup */}
        <div className="flex items-start justify-center">
          <MetaInstantFormPreview form={previewForm} />
        </div>
      </div>

      {/* Change Goal button at bottom */}
      <div className="flex justify-center pt-6 border-t border-border">
        <Button variant="outline" size="lg" onClick={onChangeGoal}>
          Change Goal
        </Button>
      </div>
    </div>
  )
}
