/**
 * Feature: Workspace State Hook
 * Purpose: Derive workspace state from campaign and ads
 * References:
 *  - Microservices: Extracted from campaign-workspace.tsx
 */

"use client";

import { useMemo } from 'react';
import { workspaceServiceClient as workspaceService, type WorkspaceMode } from '@/lib/services/client/workspace-service-client';

export interface UseWorkspaceStateInput {
  campaign: { id: string; [key: string]: unknown } | null;
  ads: Array<{ id: string; status: string; meta_ad_id?: string | null; [key: string]: unknown }>;
  searchParams: URLSearchParams;
}

export interface UseWorkspaceStateOutput {
  effectiveMode: WorkspaceMode;
  currentAdId: string | null;
  hasUnsavedChanges: boolean;
  hasPublishedAds: boolean;
  isPublishReady: boolean;
  isAdPublished: boolean;
}

/**
 * Workspace State Hook
 * Derives all workspace state from inputs
 */
export function useWorkspaceState(input: UseWorkspaceStateInput): UseWorkspaceStateOutput {
  const { campaign, ads, searchParams } = input;

  const viewParam = searchParams.get("view") as WorkspaceMode | null;
  const currentAdId = searchParams.get("adId");
  const isCreatingVariant = searchParams.get('variant') === 'true';

  // Determine effective mode
  const effectiveMode = workspaceService.getEffectiveMode(viewParam, currentAdId);

  // Check if campaign has published ads
  const hasPublishedAds = useMemo(() => {
    return ads.some(ad => ad.status === 'active' || ad.status === 'paused');
  }, [ads]);

  // Check if current ad is published
  const isAdPublished = useMemo(() => {
    if (!currentAdId) return false;
    const ad = ads.find(a => a.id === currentAdId);
    return Boolean(ad?.meta_ad_id);
  }, [currentAdId, ads]);

  // Determine unsaved changes (simplified - full logic would be in service)
  const hasUnsavedChanges = effectiveMode === 'edit' || effectiveMode === 'build';

  // Determine if publish ready (simplified - full logic would be in service)
  const isPublishReady = false; // Would check all conditions via service

  return {
    effectiveMode,
    currentAdId,
    hasUnsavedChanges,
    hasPublishedAds,
    isPublishReady,
    isAdPublished,
  };
}

