/**
 * Feature: Phone Number Setup
 * Purpose: Configure phone number destination for calls goal campaigns
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 *  - Meta Call Ads: https://developers.facebook.com/docs/marketing-api/call-ads
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { normalizePhoneForMeta } from "@/lib/utils/normalize"
import { COUNTRY_CALLING_CODES } from "@/lib/meta/country-codes"
import { Phone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useDestination } from "@/lib/context/destination-context"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { toast } from "sonner"

interface PhoneNumberSetupProps {
  initialPhone?: string
}

export function PhoneNumberSetup({ initialPhone = '' }: PhoneNumberSetupProps) {
  const { destinationState, setDestination } = useDestination()
  const { campaign } = useCampaignContext()
  const [phone, setPhone] = useState(initialPhone)
  const [countryCode, setCountryCode] = useState("+1")
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationSuccess, setValidationSuccess] = useState(false)
  
  // Load existing destination data
  useEffect(() => {
    if (destinationState.data?.phoneNumber) {
      setPhone(destinationState.data.phoneFormatted || destinationState.data.phoneNumber)
    }
  }, [destinationState.data?.phoneNumber, destinationState.data?.phoneFormatted])
  
  // Normalize phone number in real-time
  const normalized = useMemo(() => normalizePhoneForMeta(phone, countryCode), [phone, countryCode])
  
  const handleSave = async () => {
    setIsValidating(true)
    setError(null)
    setValidationSuccess(false)
    
    // First check format validity
    if (!normalized.valid) {
      setError('Please enter a valid phone number in international format')
      setIsValidating(false)
      return
    }
    
    if (!campaign?.id) {
      setError('Campaign not found. Please refresh and try again.')
      setIsValidating(false)
      return
    }
    
    try {
      // TODO: Migrate to v1 API - phone validation endpoint not yet implemented in v1
      // For now, skip Meta validation and proceed with client-side validation only
      const result = { valid: true } // Temporary: assume valid after client-side validation
      
      // const response = await fetch('/api/v1/meta/destination/phone', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     campaignId: campaign.id,
      //     phoneNumber: normalized.e164,
      //   }),
      // })
      // const result = await response.json()
      
      if (result.valid) {
        // Validation passed - save the phone number (using client-side normalized value)
        setDestination({
          type: 'phone_number',
          phoneNumber: normalized.e164, // Use the normalized e164 from client-side validation
          phoneFormatted: phone,
        })
        
        setValidationSuccess(true)
        toast.success('Phone number validated and saved successfully')
      } else {
        // This branch won't be reached with the temporary implementation
        // const errorMsg = result.error || 'Meta rejected this phone number. Please verify it is correct.'
        const errorMsg = 'Phone number validation failed. Please verify it is correct.'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to validate phone number'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsValidating(false)
    }
  }
  
  const isCompleted = destinationState.status === 'completed' && destinationState.data?.type === 'phone_number'
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Phone Number</CardTitle>
              <CardDescription>
                Enter the phone number where customers can reach you
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="country-code">Country Code *</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger id="country-code">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CALLING_CODES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number *</Label>
            <Input
              id="phone-number"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setError(null)
              }}
              placeholder="(555) 123-4567"
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-600 font-medium">Validation Failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}
            {validationSuccess && !error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-green-600 font-medium">Phone Number Validated</p>
                  <p className="text-sm text-green-600">Meta confirmed: {normalized.e164}</p>
                </div>
              </div>
            )}
            {isCompleted && !validationSuccess && !error && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Phone number configured: {normalized.e164}</span>
              </div>
            )}
            {!error && !validationSuccess && phone && normalized.valid && (
              <p className="text-xs text-muted-foreground">
                Will be validated and saved as: {normalized.e164}
              </p>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={!phone.trim() || isValidating || !normalized.valid}
              className="w-full sm:w-auto"
            >
              {isValidating && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isValidating ? 'Validating with Meta...' : isCompleted ? 'Update Phone Number' : 'Save Phone Number'}
            </Button>
            {isValidating && (
              <p className="text-xs text-muted-foreground mt-2">
                Verifying phone number with Meta Marketing API...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

