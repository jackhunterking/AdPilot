/**
 * Feature: Campaign Layout
 * Purpose: Provide campaign-specific context providers with proper hierarchy
 * References:
 *  - Next.js Layouts: https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import { CampaignProvider } from "@/lib/context/campaign-context";
import { AdPreviewProvider } from "@/lib/context/ad-preview-context";
import { GoalProvider } from "@/lib/context/goal-context";
import { DestinationProvider } from "@/lib/context/destination-context";
import { LocationProvider } from "@/lib/context/location-context";
import { AudienceProvider } from "@/lib/context/audience-context";
import { AudienceMachineProvider } from "@/lib/context/audience-machine-context";
import { BudgetProvider } from "@/lib/context/budget-context";
import { AdCopyProvider } from "@/lib/context/ad-copy-context";
import { GenerationProvider } from "@/lib/context/generation-context";
import { FEATURE_FLAGS } from "@/lib/machines/audience/constants";

export default async function CampaignLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params;
  
  // Choose audience provider based on feature flag
  const AudienceContextProvider = FEATURE_FLAGS.USE_XSTATE_MACHINE
    ? AudienceMachineProvider
    : AudienceProvider;
  
  return (
    <CampaignProvider initialCampaignId={campaignId}>
      <AdPreviewProvider>
        <GoalProvider>
          <DestinationProvider>
            <LocationProvider>
              <AudienceContextProvider>
                <BudgetProvider>
                  <AdCopyProvider>
                    <GenerationProvider>
                      {children}
                    </GenerationProvider>
                  </AdCopyProvider>
                </BudgetProvider>
              </AudienceContextProvider>
            </LocationProvider>
          </DestinationProvider>
        </GoalProvider>
      </AdPreviewProvider>
    </CampaignProvider>
  );
}

