/**
 * Feature: Campaign Journey
 * Purpose: Handle ad creation, deletion, and management
 * Microservices: Self-contained campaign service
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { Journey, ToolPart } from '@/components/chat/types/journey-types';

export function CampaignJourney(): Journey {
  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-createAd') {
      return renderCreateAd(part);
    }
    
    // Future: deleteAd, renameAd, duplicateAd tools
    
    return null;
  };
  
  return { renderTool };
}

function renderCreateAd(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  // Show loading state while being processed
  return (
    <div key={callId} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm text-muted-foreground">Preparing to create ad...</span>
    </div>
  );
}

