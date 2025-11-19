/**
 * Feature: Edit Mode Component
 * Purpose: Ad editing interface
 * References:
 *  - Microservices: Extracted from campaign-workspace.tsx
 */

"use client";

import React from 'react';
import { PreviewPanel } from '@/components/preview-panel';

import type { WorkspaceMode } from '@/lib/services/client/workspace-service-client';

export interface EditModeProps {
  campaignId: string;
  currentAdId?: string;
  ads: unknown[];
  refreshAds: () => Promise<void>;
  onNavigate: (mode: WorkspaceMode, adId?: string) => void;
}

/**
 * Edit Mode
 * Handles ad editing workflow
 */
export function EditMode(props: EditModeProps) {
  return (
    <div className="flex-1 h-full overflow-hidden">
      <PreviewPanel />
    </div>
  );
}

