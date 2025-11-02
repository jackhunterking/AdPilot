"use client"

/**
 * Feature: Lead Form Create (Left Column)
 * Purpose: Accordion inputs for form name, privacy policy, fields, and thank you; confirms creation
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { Info } from "lucide-react"
import { metaStorage } from "@/lib/meta/storage"

interface FieldDef { id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }

interface LeadFormCreateProps {
  formName: string
  onFormNameChange: (v: string) => void
  privacyUrl: string
  onPrivacyUrlChange: (v: string) => void
  privacyLinkText: string
  onPrivacyLinkTextChange: (v: string) => void
  fields: FieldDef[]
  onFieldsChange: (v: FieldDef[]) => void
  onConfirm: (data: { id: string; name: string }) => void
  // Controlled Thank You fields (lifted to parent so they persist across tabs)
  thankYouTitle: string
  onThankYouTitleChange: (v: string) => void
  thankYouMessage: string
  onThankYouMessageChange: (v: string) => void
  thankYouButtonText: string
  onThankYouButtonTextChange: (v: string) => void
  thankYouButtonUrl: string
  onThankYouButtonUrlChange: (v: string) => void
}

export function LeadFormCreate({
  formName,
  onFormNameChange,
  privacyUrl,
  onPrivacyUrlChange,
  privacyLinkText,
  onPrivacyLinkTextChange,
  fields,
  onFieldsChange,
  onConfirm,
  thankYouTitle,
  onThankYouTitleChange,
  thankYouMessage,
  onThankYouMessageChange,
  thankYouButtonText,
  onThankYouButtonTextChange,
  thankYouButtonUrl,
  onThankYouButtonUrlChange,
}: LeadFormCreateProps) {
  const { campaign } = useCampaignContext()

  // Submit UX
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Privacy policy defaulting
  const defaultPrivacyUrl = "https://adpilot.studio/general-privacy-policy"
  const [useDefaultPrivacy, setUseDefaultPrivacy] = useState<boolean>(true)

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!formName || formName.trim().length < 3) e.formName = "Form name must be at least 3 characters"
    if (!privacyUrl) e.privacyUrl = "Privacy policy URL is required"
    else if (!privacyUrl.startsWith("https://")) e.privacyUrl = "Privacy policy URL must start with https://"
    if (!privacyLinkText || privacyLinkText.trim().length < 3) e.privacyLinkText = "Link text must be at least 3 characters"
    if (!thankYouButtonText || thankYouButtonText.trim().length < 2) e.thankYouButtonText = "Button label is required"
    else if (thankYouButtonText.length > 60) e.thankYouButtonText = "Button label must be 60 characters or fewer"
    if (!thankYouButtonUrl) e.thankYouButtonUrl = "Website link URL is required"
    else if (!thankYouButtonUrl.startsWith("https://")) e.thankYouButtonUrl = "Website link URL must start with https://"
    return e
  }, [formName, privacyUrl, privacyLinkText, thankYouButtonText, thankYouButtonUrl])

  const toggleRequired = (id: string) => {
    onFieldsChange(fields.map(f => f.id === id ? { ...f, required: !f.required } : f))
  }

  const createForm = async () => {
    if (!campaign?.id) {
      console.error('[LeadFormCreate] No campaign ID')
      return
    }
    if (Object.keys(errors).length > 0) {
      console.error('[LeadFormCreate] Validation errors:', errors)
      return
    }

    // Get connection from localStorage for fallback
    const connection = metaStorage.getConnection(campaign.id)

    console.log('[LeadFormCreate] Starting form creation:', {
      campaignId: campaign.id,
      hasConnection: !!connection,
      connectionKeys: connection ? Object.keys(connection) : [],
      pageId: connection?.selected_page_id,
      hasPageAccessToken: !!connection?.selected_page_access_token,
      pageAccessTokenLength: connection?.selected_page_access_token?.length,
    })

    // Log the full connection object (with token redacted)
    if (connection) {
      const redactedConnection = { ...connection }
      if (redactedConnection.selected_page_access_token) {
        const token = redactedConnection.selected_page_access_token
        redactedConnection.selected_page_access_token =
          token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : '[SHORT_TOKEN]'
      }
      if (redactedConnection.long_lived_user_token) {
        const token = redactedConnection.long_lived_user_token
        redactedConnection.long_lived_user_token =
          token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : '[SHORT_TOKEN]'
      }
      console.log('[LeadFormCreate] Connection details:', redactedConnection)
    } else {
      console.error('[LeadFormCreate] No connection found in localStorage for campaign:', campaign.id)
    }

    setIsSubmitting(true)
    setServerError(null)

    const requestBody = {
      campaignId: campaign.id,
      pageId: connection?.selected_page_id,
      pageAccessToken: connection?.selected_page_access_token,
      name: formName,
      privacyPolicy: { url: privacyUrl, link_text: privacyLinkText },
      questions: [{ type: "FULL_NAME" }, { type: "EMAIL" }, { type: "PHONE" }],
      thankYouPage: {
        title: thankYouTitle,
        body: thankYouMessage,
        button_text: thankYouButtonText,
        button_type: "VIEW_WEBSITE",
        button_url: thankYouButtonUrl,
      },
    }

    console.log('[LeadFormCreate] Request body (tokens redacted):', {
      ...requestBody,
      pageAccessToken: requestBody.pageAccessToken
        ? `${requestBody.pageAccessToken.slice(0, 6)}...${requestBody.pageAccessToken.slice(-4)}`
        : undefined,
    })
    const res = await fetch(`/api/meta/forms?campaignId=${encodeURIComponent(campaign.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
    const json: unknown = await res.json()

    console.log('[LeadFormCreate] API response:', {
      status: res.status,
      ok: res.ok,
      response: json,
    })

    if (!res.ok) {
      const apiMsg = (json as { error?: string })?.error || "Failed to create form"
      console.error('[LeadFormCreate] API error:', {
        status: res.status,
        error: apiMsg,
        fullResponse: json,
      })
      setServerError(apiMsg)
      setIsSubmitting(false)
      return
    }
    const id = (json as { id?: string }).id
    if (!id) {
      console.error('[LeadFormCreate] No ID returned:', json)
      setServerError("Form was created but no ID returned. Please try again.")
      setIsSubmitting(false)
      return
    }
    console.log('[LeadFormCreate] Form created successfully:', { id, name: formName })
    onConfirm({ id, name: formName })
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-4">
      {/* Explanatory header above accordions */}
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-foreground">
            Create a Facebook Instant Form to capture contact info and complete the sections below.
          </p>
        </div>
      </div>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="name">
          <AccordionTrigger>Form name</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Label>Form name</Label>
              <Input value={formName} onChange={(e) => onFormNameChange(e.target.value)} placeholder="Lead Form" />
              {errors.formName && <p className="text-xs text-amber-600">{errors.formName}</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fields">
          <AccordionTrigger>Fields</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.type === "full_name" || f.type === "email" ? "Required by Meta" : "Required"}
                    </p>
                  </div>
                  <Switch checked={f.required} onCheckedChange={() => toggleRequired(f.id)} disabled />
                </div>
              ))}
              <div className="flex items-start gap-2 p-3 rounded-md border bg-muted/30">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-muted-foreground">Customization coming soon</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>Privacy policy</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Use default privacy policy</Label>
                <Switch
                  checked={useDefaultPrivacy}
                  onCheckedChange={(v) => {
                    setUseDefaultPrivacy(v)
                    if (v) onPrivacyUrlChange(defaultPrivacyUrl)
                  }}
                />
              </div>
              <Label>Privacy link text</Label>
              <Input value={privacyLinkText} onChange={(e) => onPrivacyLinkTextChange(e.target.value)} placeholder="Privacy Policy" />
              {errors.privacyLinkText && <p className="text-xs text-amber-600">{errors.privacyLinkText}</p>}
              <Label className="mt-3">Privacy URL</Label>
              <Input value={privacyUrl} onChange={(e) => onPrivacyUrlChange(e.target.value)} placeholder="https://..." disabled={useDefaultPrivacy} />
              {errors.privacyUrl && <p className="text-xs text-amber-600">{errors.privacyUrl}</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="thankyou">
          <AccordionTrigger>Thank you</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={thankYouTitle} onChange={(e) => onThankYouTitleChange(e.target.value)} />
              <Label className="mt-2">Message</Label>
              <Input value={thankYouMessage} onChange={(e) => onThankYouMessageChange(e.target.value)} />
              <Label className="mt-2">Button Text</Label>
              <Input value={thankYouButtonText} onChange={(e) => onThankYouButtonTextChange(e.target.value)} placeholder="View website" />
              {errors.thankYouButtonText && <p className="text-xs text-amber-600">{errors.thankYouButtonText}</p>}
              <Label className="mt-2">Website Link URL</Label>
              <Input value={thankYouButtonUrl} onChange={(e) => onThankYouButtonUrlChange(e.target.value)} placeholder="https://yourdomain.com" />
              {errors.thankYouButtonUrl && <p className="text-xs text-amber-600">{errors.thankYouButtonUrl}</p>}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {serverError && (
        <p className="text-sm text-red-600 py-1">{serverError}</p>
      )}
      <Button onClick={createForm} disabled={Object.keys(errors).length > 0 || isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create and select form"}
      </Button>
    </div>
  )
}
