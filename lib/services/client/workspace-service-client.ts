/**
 * Feature: Workspace Service Client
 * Purpose: Client-side workspace mode management and navigation logic
 * Microservices: Pure client service (no backend calls needed)
 * References:
 *  - Original: lib/services/workspace-service.ts
 *  - Service Pattern: /journey-ui.plan.md
 */

"use client";

export type WorkspaceMode = 'build' | 'edit' | 'all-ads' | 'results' | 'ab-test-builder';

export interface WorkspaceState {
  mode: WorkspaceMode;
  currentAdId: string | null;
  hasUnsavedChanges: boolean;
  isPublishing: boolean;
}

/**
 * Workspace Service Client
 * 
 * Pure client-side service for workspace state management.
 * No API calls needed - all logic runs in the browser.
 * 
 * Features:
 * - Mode navigation logic
 * - Unsaved changes tracking
 * - Publish readiness validation
 * - Client-side only (no server communication)
 */
export class WorkspaceServiceClient {
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
    hasBudget: boolean;
    hasMetaConnection: boolean;
  }): boolean {
    return (
      config.hasCreative &&
      config.hasCopy &&
      config.hasDestination &&
      config.hasLocation &&
      config.hasBudget &&
      config.hasMetaConnection
    );
  }

  /**
   * Validate navigation transition
   */
  canNavigate(from: WorkspaceMode, to: WorkspaceMode, hasUnsavedChanges: boolean): {
    allowed: boolean;
    requiresConfirmation: boolean;
    message?: string;
  } {
    // Allow navigation within same mode
    if (from === to) {
      return { allowed: true, requiresConfirmation: false };
    }

    // Check for unsaved changes
    if (hasUnsavedChanges) {
      return {
        allowed: true,
        requiresConfirmation: true,
        message: 'You have unsaved changes. Do you want to leave without saving?',
      };
    }

    // Define allowed transitions
    const allowedTransitions: Record<WorkspaceMode, WorkspaceMode[]> = {
      'build': ['edit', 'all-ads', 'results'],
      'edit': ['build', 'all-ads', 'results'],
      'all-ads': ['build', 'edit', 'results', 'ab-test-builder'],
      'results': ['build', 'edit', 'all-ads'],
      'ab-test-builder': ['all-ads'],
    };

    const allowed = allowedTransitions[from]?.includes(to) ?? false;

    return {
      allowed,
      requiresConfirmation: false,
      message: allowed ? undefined : `Cannot navigate from ${from} to ${to}`,
    };
  }

  /**
   * Get mode display name
   */
  getModeDisplayName(mode: WorkspaceMode): string {
    const names: Record<WorkspaceMode, string> = {
      'build': 'Build Mode',
      'edit': 'Edit Mode',
      'all-ads': 'All Ads',
      'results': 'Results',
      'ab-test-builder': 'A/B Test Builder',
    };
    
    return names[mode] || mode;
  }
}

export const workspaceServiceClient = new WorkspaceServiceClient();

