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
import { BudgetProvider } from "@/lib/context/budget-context";
import { AdCopyProvider } from "@/lib/context/ad-copy-context";
import { GenerationProvider } from "@/lib/context/generation-context";

export default async function CampaignLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params;
  
  return (
    <CampaignProvider initialCampaignId={campaignId}>
      <AdPreviewProvider>
        <GoalProvider>
          <DestinationProvider>
            <LocationProvider>
              <BudgetProvider>
                <AdCopyProvider>
                  <GenerationProvider>
                    {children}
                  </GenerationProvider>
                </AdCopyProvider>
              </BudgetProvider>
            </LocationProvider>
          </DestinationProvider>
        </GoalProvider>
      </AdPreviewProvider>
    </CampaignProvider>
  );
}

