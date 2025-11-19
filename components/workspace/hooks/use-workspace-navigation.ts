/**
 * Feature: Workspace Navigation Hook
 * Purpose: Handle workspace navigation and mode transitions
 * References:
 *  - Microservices: Extracted from campaign-workspace.tsx
 */

"use client";

import { useCallback } from 'react';
import { toast } from 'sonner';
import { SaveService } from '@/lib/services/server/save-service-server';
import type { WorkspaceMode } from '@/lib/services/server/workspace-service-server';

const saveService = new SaveService();
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export interface UseWorkspaceNavigationInput {
  campaignId: string;
  effectiveMode: WorkspaceMode;
  hasUnsavedChanges: boolean;
  pathname: string;
  router: AppRouterInstance;
  searchParams: URLSearchParams;
}

/**
 * Workspace Navigation Hook
 * Handles all navigation logic
 */
export function useWorkspaceNavigation(input: UseWorkspaceNavigationInput) {
  const { campaignId, effectiveMode, hasUnsavedChanges, pathname, router, searchParams } = input;

  const setWorkspaceMode = useCallback((mode: WorkspaceMode, adId?: string) => {
    const params = new URLSearchParams();
    params.set("view", mode);
    if (adId) params.set("adId", adId);
    router.replace(`${pathname}?${params.toString()}`);

    // Persist last view
    if (campaignId) {
      try {
        sessionStorage.setItem(`campaign:${campaignId}:lastView`, mode);
      } catch (error) {
        console.warn('Failed to save last view:', error);
      }
    }
  }, [pathname, router, campaignId]);

  const handleBack = useCallback(() => {
    // TODO: Check for unsaved changes
    setWorkspaceMode('all-ads');
  }, [setWorkspaceMode]);

  const handleNewAd = useCallback(async () => {
    const loadingToast = toast.loading('Creating new ad...');
    
    const result = await saveService.createDraftAd(campaignId);
    
    toast.dismiss(loadingToast);

    if (!result.success) {
      toast.error(result.error?.message || 'Failed to create ad');
      return;
    }

    const params = new URLSearchParams();
    params.set("view", "build");
    params.set("adId", result.data!.adId);
    params.set("newAd", "true");
    router.replace(`${pathname}?${params.toString()}`);
    
    toast.success('New ad created!');
  }, [campaignId, pathname, router]);

  const handleViewAllAds = useCallback(() => {
    // TODO: Check for unsaved changes
    setWorkspaceMode('all-ads');
  }, [setWorkspaceMode]);

  return {
    setWorkspaceMode,
    handleBack,
    handleNewAd,
    handleViewAllAds,
  };
}

