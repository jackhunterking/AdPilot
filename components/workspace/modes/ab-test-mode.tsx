/**
 * Feature: AB Test Mode Component
 * Purpose: A/B test builder interface
 * References:
 *  - Microservices: Extracted from campaign-workspace.tsx
 */

"use client";

import React from 'react';
import { ABTestBuilder } from '@/components/ab-test/ab-test-builder';

import type { WorkspaceMode } from '@/lib/services/client/workspace-service-client';

export interface ABTestModeProps {
  campaignId: string;
  currentAdId?: string;
  ads: unknown[];
  refreshAds: () => Promise<void>;
  onNavigate: (mode: WorkspaceMode, adId?: string) => void;
}

/**
 * AB Test Mode
 * Handles A/B test creation
 */
export function ABTestMode(props: ABTestModeProps) {
  const currentVariant = props.currentAdId
    ? (props.ads as Array<{ id: string }>).find(a => a.id === props.currentAdId)
    : null;

  if (!currentVariant) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading ad...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
      <ABTestBuilder
        campaign_id={props.campaignId}
        current_variant={currentVariant as import('@/lib/types/workspace').AdVariant}
        onCancel={() => props.onNavigate('all-ads')}
        onComplete={() => props.onNavigate('all-ads')}
      />
    </div>
  );
}

