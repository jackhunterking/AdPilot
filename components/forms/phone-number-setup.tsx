/**
 * Feature: Phone Number Setup
 * Purpose: Configure phone number destination for calls goal campaigns
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
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
import { Phone, CheckCircle2, AlertCircle } from "lucide-react"
import { useDestination } from "@/lib/context/destination-context"

interface PhoneNumberSetupProps {
  initialPhone?: string
}

export function PhoneNumberSetup({ initialPhone = '' }: PhoneNumberSetupProps) {
  const { destinationState, setDestination } = useDestination()
  const [phone, setPhone] = useState(initialPhone)
  const [countryCode, setCountryCode] = useState("+1")
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  
  // Load existing destination data
  useEffect(() => {
    if (destinationState.data?.phoneNumber) {
      setPhone(destinationState.data.phoneFormatted || destinationState.data.phoneNumber)
    }
  }, [destinationState.data?.phoneNumber, destinationState.data?.phoneFormatted])
  
  // Normalize phone number in real-time
  const normalized = useMemo(() => normalizePhoneForMeta(phone, countryCode), [phone, countryCode])
  
  const handleSave = () => {
    setIsValidating(true)
    setError(null)
    
    if (!normalized.valid) {
      setError('Please enter a valid phone number in international format')
      setIsValidating(false)
      return
    }
    
    setDestination({
      type: 'phone_number',
      phoneNumber: normalized.e164,
      phoneFormatted: phone,
    })
    
    setIsValidating(false)
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
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            {isCompleted && !error && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Phone number configured: {normalized.e164}</span>
              </div>
            )}
            {!error && phone && normalized.valid && (
              <p className="text-xs text-muted-foreground">
                Will be saved as: {normalized.e164}
              </p>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={!phone.trim() || isValidating || !normalized.valid}
              className="w-full sm:w-auto"
            >
              {isValidating ? 'Validating...' : isCompleted ? 'Update Phone Number' : 'Save Phone Number'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

