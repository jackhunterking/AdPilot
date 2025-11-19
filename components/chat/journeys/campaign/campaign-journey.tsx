/**
 * Feature: Campaign Journey
 * Purpose: Handle ad creation, deletion, and management
 * Microservices: Self-contained campaign service
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import React, { useState } from 'react';
import { Loader2, Plus, Trash, Copy as CopyIcon, Edit, CheckCircle2 } from 'lucide-react';
import type { Journey, ToolPart, JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface CampaignState extends JourneyState {
  activeAdId: string | null;
  isProcessing: boolean;
}

export function CampaignJourney(): Journey<CampaignState> {
  const [state, setState] = useState<CampaignState>({
    status: 'idle',
    activeAdId: null,
    isProcessing: false,
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-createAd') {
      return renderCreateAd(part);
    }
    
    if (toolType === 'tool-deleteAd') {
      return renderDeleteAd(part);
    }
    
    if (toolType === 'tool-renameAd') {
      return renderRenameAd(part);
    }
    
    if (toolType === 'tool-duplicateAd') {
      return renderDuplicateAd(part);
    }
    
    return null;
  };
  
  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'campaign',
      input,
      context: {
        campaignMode: 'manage',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      activeAdId: null,
      isProcessing: false,
    });
  };

  return {
    id: 'campaign',
    renderTool,
    buildMetadata,
    reset,
    getState: () => state,
    setState: (partial) => setState(prev => ({ ...prev, ...partial })),
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('campaign'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('campaign'));
      }
    },
  };
}

function renderCreateAd(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Preparing to create ad...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Ad created successfully
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to create ad'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderDeleteAd(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  if (part.state === 'output-available') {
    return (
      <div key={callId} className="border rounded-lg p-3 my-2 bg-destructive/5 border-destructive/30">
        <div className="flex items-center gap-2">
          <Trash className="h-4 w-4 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Ad deleted
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

function renderRenameAd(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  if (part.state === 'output-available') {
    return (
      <div key={callId} className="border rounded-lg p-3 my-2 bg-blue-500/5 border-blue-500/30">
        <div className="flex items-center gap-2">
          <Edit className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-medium text-blue-600">
            Ad renamed
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

function renderDuplicateAd(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  if (part.state === 'output-available') {
    return (
      <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <CopyIcon className="h-4 w-4 text-green-600" />
          <p className="text-sm font-medium text-green-600">
            Ad duplicated successfully
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

