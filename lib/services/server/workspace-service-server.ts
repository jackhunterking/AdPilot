/**
 * Feature: Workspace Service
 * Purpose: Mode management, navigation logic, unsaved changes tracking
 * References:
 *  - Microservices: Extracted from components/campaign-workspace.tsx
 */

export type WorkspaceMode = 'build' | 'edit' | 'all-ads' | 'results' | 'ab-test-builder';

export interface WorkspaceState {
  mode: WorkspaceMode;
  currentAdId: string | null;
  hasUnsavedChanges: boolean;
  isPublishing: boolean;
}

export class WorkspaceService {
  /**
   * Determine if back button should be shown
   */
  shouldShowBackButton(mode: WorkspaceMode): boolean {
    return mode !== 'all-ads';
  }

  /**
   * Determine if new ad button should be shown
   */
  shouldShowNewAdButton(mode: WorkspaceMode): boolean {
    return mode === 'results' || mode === 'all-ads';
  }

  /**
   * Determine effective mode based on URL params
   */
  getEffectiveMode(viewParam: string | null, currentAdId: string | null): WorkspaceMode {
    if (viewParam) {
      return viewParam as WorkspaceMode;
    }
    
    if (currentAdId) {
      return 'build';
    }
    
    return 'all-ads';
  }

  /**
   * Track unsaved changes based on mode and context
   */
  shouldTrackUnsavedChanges(
    mode: WorkspaceMode,
    currentAdId: string | null,
    isCreatingNewAd: boolean,
    hasPublishedAds: boolean,
    hasBuildProgress: boolean
  ): boolean {
    if (mode === 'edit' && currentAdId) {
      return true;
    }

    if (mode === 'build') {
      if (isCreatingNewAd) {
        return true; // Always track for new ads
      }
      
      if (hasPublishedAds) {
        return hasBuildProgress; // Track actual progress
      }
    }

    return false;
  }

  /**
   * Check if ad is ready to publish
   */
  isPublishReady(config: {
    hasCreative: boolean;
    hasCopy: boolean;
    hasDestination: boolean;
    hasLocation: boolean;
    hasMetaConnection: boolean;
    hasPayment: boolean;
    hasBudget: boolean;
  }): boolean {
    return (
      config.hasCreative &&
      config.hasCopy &&
      config.hasDestination &&
      config.hasLocation &&
      config.hasMetaConnection &&
      config.hasPayment &&
      config.hasBudget
    );
  }

  /**
   * Check if ad is ready to create (build mode)
   */
  isAdReadyToCreate(config: {
    hasCreative: boolean;
    hasCopy: boolean;
    hasDestination: boolean;
    hasLocation: boolean;
    hasMetaConnection: boolean;
    hasPayment: boolean;
    hasBudget: boolean;
  }): boolean {
    return this.isPublishReady(config);
  }
}

// Export singleton
export const workspaceService = new WorkspaceService();

