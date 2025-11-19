/**
 * Feature: All Ads Mode Component
 * Purpose: Grid view of all ads in campaign
 * References:
 *  - Microservices: Extracted from campaign-workspace.tsx
 */

"use client";

import React from 'react';
import { AllAdsGrid } from '@/components/all-ads-grid';

import type { WorkspaceMode } from '@/lib/services/client/workspace-service-client';

export interface AllAdsModeProps {
  campaignId: string;
  currentAdId?: string;
  ads: unknown[];
  refreshAds: () => Promise<void>;
  onNavigate: (mode: WorkspaceMode, adId?: string) => void;
}

/**
 * All Ads Mode
 * Shows grid of all ads
 */
export function AllAdsMode(props: AllAdsModeProps) {
  // Placeholder handlers - will be implemented with full service integration
  const handlePublishAd = async (adId: string) => {
    console.log('[AllAdsMode] Publish ad:', adId);
  };
  
  const handlePauseAd = async (adId: string) => {
    console.log('[AllAdsMode] Pause ad:', adId);
    return true;
  };
  
  const handleResumeAd = async (adId: string) => {
    console.log('[AllAdsMode] Resume ad:', adId);
    return true;
  };
  
  const handleCreateABTest = (adId: string) => {
    props.onNavigate('ab-test-builder', adId);
  };
  
  const handleDeleteAd = async (adId: string) => {
    console.log('[AllAdsMode] Delete ad:', adId);
    await props.refreshAds();
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
      <AllAdsGrid
        ads={props.ads as import('@/lib/types/workspace').AdVariant[]}
        campaignId={props.campaignId}
        onViewAd={() => props.onNavigate('results')}
        onEditAd={(adId) => props.onNavigate('edit', adId)}
        onPublishAd={handlePublishAd}
        onPauseAd={handlePauseAd}
        onResumeAd={handleResumeAd}
        onCreateABTest={handleCreateABTest}
        onDeleteAd={handleDeleteAd}
        onRefreshAds={props.refreshAds}
      />
    </div>
  );
}

