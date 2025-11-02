/**
 * Feature: Call Goal Configuration
 * Purpose: Form for configuring call tracking setup
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGoal } from "@/lib/context/goal-context"
import { Phone, Check, AlertCircle } from "lucide-react"
import { COUNTRY_CALLING_CODES } from "@/lib/meta/country-codes"
import { normalizePhoneForMeta } from "@/lib/utils/normalize"

export function CallConfiguration() {
  const { setFormData, goalState } = useGoal()
  const [phoneNumber, setPhoneNumber] = useState(goalState.formData?.phoneNumber || "")
  const [countryCode, setCountryCode] = useState(goalState.formData?.countryCode || "+1")
  const [error, setError] = useState("")

  const normalized = useMemo(() => normalizePhoneForMeta(phoneNumber, countryCode), [phoneNumber, countryCode])
  const fullPhone = normalized.e164

  const handleSave = () => {
    if (!normalized.valid) {
      setError("Enter a valid phone in international format (e.g., +15551234567)")
      return
    }

    setError("")
    setFormData({
      phoneNumber: fullPhone,
      countryCode,
    })
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <Phone className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold">Set up calls</h3>
        <p className="text-muted-foreground">Which number should people call?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="countryCode">Country code</Label>
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger id="countryCode">
              <SelectValue placeholder="Select country code" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CALLING_CODES.map(({ code, label }) => (
                <SelectItem key={code} value={code}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="(555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Enter your local number; we’ll format it internationally.</p>
          {phoneNumber && (
            <p className="text-xs text-muted-foreground">Formatted: <span className="font-mono">{fullPhone}</span></p>
          )}
        </div>

        {/* Minimal requirements only: country code and phone number */}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={!phoneNumber}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Check className="h-4 w-4 mr-2" />
        Use this number
      </Button>
    </div>
  )
}

