"use client"

/**
 * Feature: Lead Form Create (Left Column)
 * Purpose: Accordion inputs for form name, privacy policy, fields, and thank you; confirms creation
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { useMemo, useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { Info, ChevronDown } from "lucide-react"
import { metaStorage } from "@/lib/meta/storage"
import { cn } from "@/lib/utils"

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

  // Collapsible section states
  const [formNameOpen, setFormNameOpen] = useState<boolean>(true)
  const [fieldsOpen, setFieldsOpen] = useState<boolean>(true)
  const [privacyOpen, setPrivacyOpen] = useState<boolean>(false)
  const [thankYouOpen, setThankYouOpen] = useState<boolean>(false)

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
        website_url: thankYouButtonUrl,
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
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          Create a Facebook Instant Form to capture contact info and complete the sections below.
        </p>
      </Card>

      <div className="space-y-3">
        {/* Form Name Section */}
        <Collapsible open={formNameOpen} onOpenChange={setFormNameOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <span className="font-semibold">Form name</span>
              <ChevronDown className={cn("h-5 w-5 transition-transform", formNameOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-4 space-y-3 border-t">
                <div>
                  <Label className="mb-2 block">Form name</Label>
                  <Input value={formName} onChange={(e) => onFormNameChange(e.target.value)} placeholder="Lead Form" className="h-10" />
                  {errors.formName && <p className="text-xs text-amber-600 mt-1">{errors.formName}</p>}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Fields Section */}
        <Collapsible open={fieldsOpen} onOpenChange={setFieldsOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <span className="font-semibold">Fields</span>
              <ChevronDown className={cn("h-5 w-5 transition-transform", fieldsOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-4 space-y-4 border-t">
                {fields.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{f.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.type === "full_name" || f.type === "email" ? "Required by Meta" : "Required"}
                      </div>
                    </div>
                    <Switch checked={f.required} onCheckedChange={() => toggleRequired(f.id)} />
                  </div>
                ))}
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-900">Customization coming soon</p>
                  </div>
                </Card>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Privacy Policy Section */}
        <Collapsible open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <span className="font-semibold">Privacy policy</span>
              <ChevronDown className={cn("h-5 w-5 transition-transform", privacyOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-4 space-y-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Use default privacy policy</Label>
                  <Switch
                    checked={useDefaultPrivacy}
                    onCheckedChange={(v) => {
                      setUseDefaultPrivacy(v)
                      if (v) onPrivacyUrlChange(defaultPrivacyUrl)
                    }}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Privacy link text</Label>
                  <Input value={privacyLinkText} onChange={(e) => onPrivacyLinkTextChange(e.target.value)} placeholder="Privacy Policy" className="h-10" />
                  {errors.privacyLinkText && <p className="text-xs text-amber-600 mt-1">{errors.privacyLinkText}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Privacy URL</Label>
                  <Input value={privacyUrl} onChange={(e) => onPrivacyUrlChange(e.target.value)} placeholder="https://..." disabled={useDefaultPrivacy} className="h-10" />
                  {errors.privacyUrl && <p className="text-xs text-amber-600 mt-1">{errors.privacyUrl}</p>}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Thank You Section */}
        <Collapsible open={thankYouOpen} onOpenChange={setThankYouOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <span className="font-semibold">Thank you</span>
              <ChevronDown className={cn("h-5 w-5 transition-transform", thankYouOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-4 space-y-4 border-t">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Title</Label>
                  <Input value={thankYouTitle} onChange={(e) => onThankYouTitleChange(e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Message</Label>
                  <Input value={thankYouMessage} onChange={(e) => onThankYouMessageChange(e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Button Text</Label>
                  <Input value={thankYouButtonText} onChange={(e) => onThankYouButtonTextChange(e.target.value)} placeholder="View website" className="h-10" />
                  {errors.thankYouButtonText && <p className="text-xs text-amber-600 mt-1">{errors.thankYouButtonText}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Website Link URL</Label>
                  <Input value={thankYouButtonUrl} onChange={(e) => onThankYouButtonUrlChange(e.target.value)} placeholder="https://yourdomain.com" className="h-10" />
                  {errors.thankYouButtonUrl && <p className="text-xs text-amber-600 mt-1">{errors.thankYouButtonUrl}</p>}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {serverError && (
        <p className="text-sm text-red-600 py-1">{serverError}</p>
      )}
      <Button onClick={createForm} disabled={Object.keys(errors).length > 0 || isSubmitting} className="w-full h-12 text-base font-medium">
        {isSubmitting ? "Creating..." : "Create and Select Form"}
      </Button>
    </div>
  )
}
