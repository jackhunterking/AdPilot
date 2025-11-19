/**
 * Feature: Results Mode Component
 * Purpose: Campaign results and analytics view
 * References:
 *  - Microservices: Extracted from campaign-workspace.tsx
 */

"use client";

import React from 'react';
import { ResultsPanel } from '@/components/results/results-panel';

import type { WorkspaceMode } from '@/lib/services/client/workspace-service-client';

export interface ResultsModeProps {
  campaignId: string;
  currentAdId?: string;
  ads: unknown[];
  refreshAds: () => Promise<void>;
  onNavigate: (mode: WorkspaceMode, adId?: string) => void;
}

/**
 * Results Mode
 * Shows campaign performance metrics
 */
export function ResultsMode(props: ResultsModeProps) {
  const hasPublishedAds = (props.ads as Array<{ status: string }>).some(
    ad => ad.status === 'active' || ad.status === 'paused'
  );

  return (
    <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
      <ResultsPanel isEnabled={hasPublishedAds} />
    </div>
  );
}

