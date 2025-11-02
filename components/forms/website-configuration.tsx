/**
 * Feature: Website Visits Goal Configuration
 * Purpose: Form for configuring website destination URL
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGoal } from "@/lib/context/goal-context"
import { Globe, Check, AlertCircle, Link } from "lucide-react"
import { normalizeUrlForMeta } from "@/lib/utils/normalize"

export function WebsiteConfiguration() {
  const { setFormData, goalState } = useGoal()
  const [websiteUrl, setWebsiteUrl] = useState(goalState.formData?.websiteUrl || "")
  const [displayLink, setDisplayLink] = useState(goalState.formData?.displayLink || "")
  const [error, setError] = useState("")

  const norm = useMemo(() => normalizeUrlForMeta(websiteUrl), [websiteUrl])
  const finalUrl = norm.normalized

  const handleSave = () => {
    if (!websiteUrl) {
      setError("Website URL is required")
      return
    }

    if (!norm.valid) {
      setError("Please enter a valid website address")
      return
    }

    setError("")
    setFormData({
      websiteUrl: finalUrl,
      displayLink: displayLink || undefined,
    })
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <Globe className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold">Website visits</h3>
        <p className="text-muted-foreground">Where should people go when they click?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website address</Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://www.example.com"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value)
              setError("")
            }}
          />
          <p className="text-xs text-muted-foreground">Full destination URL where clicks will land. If you enter just a domain, we’ll use https.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayLink">Display Link (optional)</Label>
          <Input
            id="displayLink"
            type="text"
            placeholder="example.com"
            value={displayLink}
            onChange={(e) => setDisplayLink(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Shown under your ad, e.g. example.com</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link className="h-3.5 w-3.5" />
            <span className="truncate">Final URL: <span className="font-mono">{finalUrl}</span></span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {finalUrl && norm.valid && !error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-600">Valid URL format</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={!norm.valid}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Check className="h-4 w-4 mr-2" />
        Use this website
      </Button>
    </div>
  )
}

