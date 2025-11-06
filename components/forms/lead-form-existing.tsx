"use client"

/**
 * Feature: Lead Form Existing (Left Column)
 * Purpose: Lists Facebook Instant Forms for the selected Page, allows preview and confirmation
 * References:
 *  - Facebook Graph API leadgen_forms: https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 */

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Search, Calendar, Check, Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { metaStorage } from "@/lib/meta/storage"
import { mapGraphAPIFormToMetaForm } from "@/lib/meta/instant-form-mapper"
import type { GraphAPILeadgenForm } from "@/lib/types/meta-instant-form"

interface LeadForm { id: string; name: string; created_time?: string }

interface PreviewData {
  id: string
  name: string
  privacyUrl?: string
  privacyLinkText?: string
  fields: Array<{ id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }>
}

interface LeadFormExistingProps {
  onPreview: (data: PreviewData) => void
  onConfirm: (data: { id: string; name: string }) => void
  onRequestCreate?: () => void
  selectedFormId?: string | null
}

export function LeadFormExisting({ onPreview, onConfirm, onRequestCreate, selectedFormId: selectedFormIdProp }: LeadFormExistingProps) {
  const { campaign } = useCampaignContext()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forms, setForms] = useState<LeadForm[]>([])
  const [pageProfilePicture, setPageProfilePicture] = useState<string | undefined>(undefined)

  useEffect(() => {
    const fetchForms = async () => {
      if (!campaign?.id) {
        console.log('[LeadFormExisting] No campaign ID')
        return
      }

      // Get connection from localStorage for fallback
      const connection = metaStorage.getConnection(campaign.id)

      console.log('[LeadFormExisting] Fetching forms:', {
        campaignId: campaign.id,
        hasConnection: !!connection,
        pageId: connection?.selected_page_id,
        hasPageAccessToken: !!connection?.selected_page_access_token,
        pageAccessTokenLength: connection?.selected_page_access_token?.length,
      })

      setIsLoading(true)
      setError(null)
      try {
        const url = new URL('/api/meta/forms', window.location.origin)
        url.searchParams.set('campaignId', campaign.id)
        if (connection?.selected_page_id) {
          url.searchParams.set('pageId', connection.selected_page_id)
        }
        if (connection?.selected_page_access_token) {
          url.searchParams.set('pageAccessToken', connection.selected_page_access_token)
        }

        console.log('[LeadFormExisting] Request URL (token redacted):', {
          url: url.toString().replace(/pageAccessToken=[^&]+/, 'pageAccessToken=[REDACTED]'),
          hasPageId: url.searchParams.has('pageId'),
          hasPageAccessToken: url.searchParams.has('pageAccessToken'),
        })

        const res = await fetch(url.toString())
        const json: unknown = await res.json()

        console.log('[LeadFormExisting] API response:', {
          status: res.status,
          ok: res.ok,
          response: json,
        })

        if (!res.ok) throw new Error((json as { error?: string }).error || 'Failed to load forms')
        const data = (json as { forms?: LeadForm[] }).forms
        setForms(Array.isArray(data) ? data : [])
        console.log('[LeadFormExisting] Forms loaded:', { count: Array.isArray(data) ? data.length : 0 })
      } catch (e) {
        console.error('[LeadFormExisting] Fetch error:', e)
        setError(e instanceof Error ? e.message : 'Failed to load forms')
        setForms([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchForms()
  }, [campaign?.id])

  // Keep internal selection in sync with parent-provided selection
  useEffect(() => {
    if (typeof selectedFormIdProp !== 'undefined') {
      setSelectedFormId(selectedFormIdProp)
    }
  }, [selectedFormIdProp])

  const filteredForms = useMemo(() => forms.filter((f) => (f.name || '').toLowerCase().includes(searchQuery.toLowerCase())), [forms, searchQuery])

  const requestPreview = async (id: string) => {
    if (!campaign?.id) {
      console.log('[LeadFormExisting] No campaign ID for preview')
      return
    }

    // Get connection from localStorage for fallback
    const connection = metaStorage.getConnection(campaign.id)

    console.log('[LeadFormExisting] Requesting preview:', {
      formId: id,
      campaignId: campaign.id,
      hasConnection: !!connection,
      pageId: connection?.selected_page_id,
      hasPageAccessToken: !!connection?.selected_page_access_token,
    })

    try {
      // Fetch form details
      const url = new URL(`/api/meta/instant-forms/${encodeURIComponent(id)}`, window.location.origin)
      url.searchParams.set('campaignId', campaign.id)
      if (connection?.selected_page_id) {
        url.searchParams.set('pageId', connection.selected_page_id)
      }
      if (connection?.selected_page_access_token) {
        url.searchParams.set('pageAccessToken', connection.selected_page_access_token)
      }

      console.log('[LeadFormExisting] Preview request URL (token redacted):', {
        url: url.toString().replace(/pageAccessToken=[^&]+/, 'pageAccessToken=[REDACTED]'),
        hasPageId: url.searchParams.has('pageId'),
        hasPageAccessToken: url.searchParams.has('pageAccessToken'),
      })

      const res = await fetch(url.toString())
      const json: unknown = await res.json()

      console.log('[LeadFormExisting] Preview response:', {
        status: res.status,
        ok: res.ok,
        response: json,
      })

      if (!res.ok) throw new Error((json as { error?: string }).error || 'Failed to load form detail')
      
      // Fetch page profile picture if we have page data
      let profilePicture: string | undefined = pageProfilePicture
      if (connection?.selected_page_id && !profilePicture) {
        try {
          const pictureUrl = new URL('/api/meta/page-picture', window.location.origin)
          pictureUrl.searchParams.set('campaignId', campaign.id)
          pictureUrl.searchParams.set('pageId', connection.selected_page_id)
          if (connection.selected_page_access_token) {
            pictureUrl.searchParams.set('pageAccessToken', connection.selected_page_access_token)
          }

          const pictureRes = await fetch(pictureUrl.toString())
          const pictureJson: unknown = await pictureRes.json()
          if (
            pictureRes.ok &&
            pictureJson &&
            typeof pictureJson === 'object' &&
            'pictureUrl' in pictureJson &&
            typeof pictureJson.pictureUrl === 'string'
          ) {
            profilePicture = pictureJson.pictureUrl
            setPageProfilePicture(profilePicture)
          }
        } catch (e) {
          console.warn('[LeadFormExisting] Failed to fetch page picture:', e)
        }
      }

      // Use mapper to convert Graph API response to our format
      const metaForm = mapGraphAPIFormToMetaForm(json as GraphAPILeadgenForm, {
        pageId: connection?.selected_page_id,
        pageName: connection?.selected_page_name || undefined,
        pageProfilePicture: profilePicture,
      })

      // Convert to legacy PreviewData format for parent callback
      const fields: PreviewData['fields'] = metaForm.fields.map((f) => ({
        id: f.id,
        type: f.type === 'FULL_NAME' ? 'full_name' : f.type === 'EMAIL' ? 'email' : 'phone',
        label: f.label,
        required: f.required || false,
      }))

      onPreview({
        id: metaForm.id || '',
        name: metaForm.name,
        privacyUrl: metaForm.privacy.url,
        privacyLinkText: metaForm.privacy.linkText,
        fields,
      })
    } catch (e) {
      // noop preview failure
    }
  }

  const showEmpty = !isLoading && filteredForms.length === 0

  return (
    <div className="space-y-4">
      {/* Explanatory header above list/search */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          Select one of your existing forms below to collect lead information.
        </p>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1877F2]" />
        <Input placeholder="Search forms..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : showEmpty ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center space-y-3">
            <FileText className="h-8 w-8 text-[#1877F2] mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">No forms yet</p>
            <p className="text-xs text-muted-foreground mb-4">{searchQuery ? "No results match your search." : "Create your first instant form to capture leads."}</p>
            {!searchQuery && (
              <Button onClick={onRequestCreate} className="h-9 bg-[#1877F2] hover:bg-[#166FE5] text-white">
                Create New
              </Button>
            )}
          </div>
        ) : (
          filteredForms.map((form) => (
            <button
              key={form.id}
              onClick={() => {
                setSelectedFormId(form.id)
                requestPreview(form.id)
              }}
              className={`w-full rounded-lg border p-4 text-left transition-all hover:bg-muted/50 ${selectedFormId === form.id ? "border-[#1877F2] bg-[#1877F2]/5" : "border-border bg-card"}`}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#1877F2]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-[#1877F2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-medium text-foreground">{form.name}</h3>
                    {selectedFormId === form.id && <Check className="h-4 w-4 text-[#1877F2] flex-shrink-0" />}
                  </div>
                  {form.created_time && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(form.created_time).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <Button
        onClick={() => {
          const form = forms.find((f) => f.id === selectedFormId)
        	if (form) onConfirm({ id: form.id, name: form.name })
        }}
        disabled={!selectedFormId}
        className="w-full"
      >
        Use this form
      </Button>
    </div>
  )
}
