/**
 * Feature: Build Mode Component
 * Purpose: Ad building interface with stepper and preview
 * References:
 *  - Microservices: Extracted from campaign-workspace.tsx
 */

"use client";

import React from 'react';
import { PreviewPanel } from '@/components/preview-panel';

import type { WorkspaceMode } from '@/lib/services/client/workspace-service-client';

export interface BuildModeProps {
  campaignId: string;
  currentAdId?: string;
  ads: unknown[];
  refreshAds: () => Promise<void>;
  onNavigate: (mode: WorkspaceMode, adId?: string) => void;
}

/**
 * Build Mode
 * Handles ad creation workflow
 */
export function BuildMode(props: BuildModeProps) {
  return (
    <div className="flex-1 h-full overflow-hidden">
      <PreviewPanel />
    </div>
  );
}

