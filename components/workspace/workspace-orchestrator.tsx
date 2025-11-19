/**
 * Feature: Campaign Workspace Orchestrator (Refactored)
 * Purpose: Thin orchestrator coordinating workspace modes
 * References:
 *  - Original: components/campaign-workspace.tsx (1393 lines)
 *  - Refactored: ~200 lines (85% reduction)
 *  - Microservices Architecture: /micro.plan.md
 */

"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WorkspaceHeader } from "@/components/workspace-header";
import { BuildMode } from "./modes/build-mode";
import { EditMode } from "./modes/edit-mode";
import { AllAdsMode } from "./modes/all-ads-mode";
import { ResultsMode } from "./modes/results-mode";
import { ABTestMode } from "./modes/ab-test-mode";
import { useCampaignContext } from "@/lib/context/campaign-context";
import { useMetaConnection } from "@/lib/hooks/use-meta-connection";
import { useCampaignAds } from "@/lib/hooks/use-campaign-ads";
import { workspaceServiceClient as workspaceService } from "@/lib/services/client/workspace-service-client";
import { saveServiceClient as saveService } from "@/lib/services/client/save-service-client";
import { publishServiceClient as publishService } from "@/lib/services/client/publish-service-client";
import { useWorkspaceState } from "./hooks/use-workspace-state";
import { useWorkspaceNavigation } from "./hooks/use-workspace-navigation";
import type { WorkspaceMode } from "@/lib/services/client/workspace-service-client";

/**
 * Campaign Workspace Orchestrator
 * 
 * Thin orchestrator following microservices principles:
 * - Coordinates mode-specific components
 * - Delegates business logic to services
 * - Manages navigation and state transitions
 * - No business logic (just coordination)
 * 
 * Services Used:
 * - workspaceService: Mode management, validation
 * - saveService: Ad persistence
 * - publishService: Publishing workflows
 */
export function CampaignWorkspaceOrchestrator() {
  const { campaign, updateBudget } = useCampaignContext();
  const { metaStatus, paymentStatus } = useMetaConnection();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const campaignId = campaign?.id ?? "";
  const { ads, refreshAds } = useCampaignAds(campaignId);

  // Use workspace state hook (extracted logic)
  const {
    effectiveMode,
    currentAdId,
    hasUnsavedChanges,
    hasPublishedAds,
    isPublishReady,
    isAdPublished,
  } = useWorkspaceState({ 
    campaign: campaign as unknown as { id: string; [key: string]: unknown } | null, 
    ads: ads as unknown as Array<{ id: string; status: string; meta_ad_id?: string | null; [key: string]: unknown }>, 
    searchParams 
  });

  // Use workspace navigation hook (extracted logic)
  const {
    setWorkspaceMode,
    handleBack,
    handleNewAd,
    handleViewAllAds,
  } = useWorkspaceNavigation({
    campaignId,
    effectiveMode,
    hasUnsavedChanges,
    pathname,
    router,
    searchParams,
  });

  // Determine header visibility
  const showBackButton = workspaceService.shouldShowBackButton(effectiveMode);
  const showNewAdButton = workspaceService.shouldShowNewAdButton(effectiveMode);

  // Render mode-specific component
  const renderMode = () => {
    const modeProps = {
      campaignId,
      currentAdId: currentAdId || undefined,
      ads,
      refreshAds,
      onNavigate: setWorkspaceMode,
    };

    switch (effectiveMode) {
      case 'build':
        return <BuildMode {...modeProps} />;
      
      case 'edit':
        return <EditMode {...modeProps} />;
      
      case 'all-ads':
        return <AllAdsMode {...modeProps} />;
      
      case 'results':
        return <ResultsMode {...modeProps} />;
      
      case 'ab-test-builder':
        return <ABTestMode {...modeProps} />;
      
      default:
        return <AllAdsMode {...modeProps} />;
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full min-h-0 relative">
      <WorkspaceHeader
        mode={effectiveMode}
        onBack={showBackButton ? handleBack : undefined}
        onNewAd={handleNewAd}
        showBackButton={showBackButton}
        showNewAdButton={showNewAdButton}
        campaignStatus={(campaign?.published_status || 'draft') as unknown as import('@/lib/types/workspace').CampaignStatus}
        totalAds={ads.length}
        hasPublishedAds={hasPublishedAds}
        metaConnectionStatus={metaStatus}
        paymentStatus={paymentStatus}
        campaignBudget={campaign?.campaign_budget ?? null}
        onBudgetUpdate={updateBudget}
        onViewAllAds={handleViewAllAds}
        isAdPublished={isAdPublished}
      />

      <div className="flex-1 overflow-hidden h-full min-h-0">
        {renderMode()}
      </div>
    </div>
  );
}

/**
 * Refactoring Summary:
 * 
 * BEFORE: 1393 lines (monolithic component)
 * AFTER: ~200 lines (orchestrator) + mode components
 * 
 * Extracted:
 * - workspaceService: Mode management, validation (110 lines)
 * - saveService: Save workflows (160 lines)
 * - publishService: Publish workflows (150 lines)
 * - useWorkspaceState hook: State derivation (80 lines)
 * - useWorkspaceNavigation hook: Navigation logic (120 lines)
 * - Mode components: 5 × ~150 lines each (750 lines)
 * 
 * Architecture:
 * - Single Responsibility: Each module does ONE thing
 * - Testability: Services can be mocked
 * - Maintainability: Clear boundaries
 * - Reusability: Services used elsewhere
 */

