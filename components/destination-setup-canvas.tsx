/**
 * Feature: Destination Setup Canvas
 * Purpose: Main destination configuration component that switches between form/URL/phone based on campaign goal
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useGoal } from "@/lib/context/goal-context"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useDestination } from "@/lib/context/destination-context"
import { LeadFormSetup } from "./forms/lead-form-setup"
import { WebsiteUrlSetup } from "./forms/website-url-setup"
import { PhoneNumberSetup } from "./forms/phone-number-setup"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "./ui/card"

export function DestinationSetupCanvas() {
  const { campaign } = useCampaignContext()
  const { goalState } = useGoal()
  const { setDestination } = useDestination()
  
  // Get campaign-level goal (immutable) - prefer initial_goal from campaign
  const campaignGoal = campaign?.initial_goal || goalState.selectedGoal
  
  console.log('[DestinationSetupCanvas] Rendering with goal:', campaignGoal)
  
  return (
    <div className="w-full h-full overflow-auto bg-muted/30">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {campaignGoal === 'leads' && (
          <LeadFormSetup 
            onFormSelected={(form) => {
              console.log('[DestinationSetupCanvas] Form selected:', form)
              setDestination({
                type: 'instant_form',
                formId: form.id,
                formName: form.name,
              })
            }}
            onChangeGoal={() => {
              // No-op - goal cannot be changed at campaign level
              console.warn('[DestinationSetupCanvas] onChangeGoal called but goal is immutable')
            }}
          />
        )}
        
        {campaignGoal === 'website-visits' && (
          <WebsiteUrlSetup />
        )}
        
        {campaignGoal === 'calls' && (
          <PhoneNumberSetup />
        )}
        
        {!campaignGoal && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    No Goal Set
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    This campaign doesn't have a goal set. Please create a new campaign with a goal to continue.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

