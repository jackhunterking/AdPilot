/**
 * Feature: Creative Journey (Enhanced)
 * Purpose: Handle all image/creative generation and editing
 * Microservices: Self-contained creative service with full Journey interface
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Edit, Trash, Check } from 'lucide-react';
import { ImageEditProgressLoader } from '@/components/ai-elements/image-edit-progress-loader';
import { renderEditImageResult, renderRegenerateImageResult } from '@/components/ai-elements/tool-renderers';
import type { Journey, ToolPart } from '@/lib/journeys/types/journey-contracts';
import type { JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface CreativeState extends JourneyState {
  imageVariations: string[];
  selectedIndex: number | null;
  isGenerating: boolean;
}

export function CreativeJourney(): Journey<CreativeState> {
  const [state, setState] = useState<CreativeState>({
    status: 'idle',
    imageVariations: [],
    selectedIndex: null,
    isGenerating: false,
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    // Handle all creative-related tools
    if (toolType === 'tool-generateVariations') {
      return renderGenerateVariations(part);
    }
    
    if (toolType === 'tool-editVariation') {
      return renderEditVariation(part);
    }
    
    if (toolType === 'tool-regenerateVariation') {
      return renderRegenerateVariation(part);
    }
    
    if (toolType === 'tool-selectVariation') {
      return renderSelectVariation(part);
    }
    
    if (toolType === 'tool-deleteVariation') {
      return renderDeleteVariation(part);
    }
    
    return null;
  };

  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'creative',
      input,
      context: {
        creativeMode: 'generate',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      imageVariations: [],
      selectedIndex: null,
      isGenerating: false,
    });
  };

  const getState = () => state;

  const setStatePartial = (partial: Partial<CreativeState>) => {
    setState(prev => ({ ...prev, ...partial }));
  };

  return {
    id: 'creative',
    renderTool,
    buildMetadata,
    reset,
    getState,
    setState: setStatePartial,
    onActivate: () => {
      if (typeof window !== 'undefined') {
        const monitor = import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor);
        monitor.then(mon => mon.trackActivation?.('creative'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        const monitor = import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor);
        monitor.then(mon => mon.trackCompletion?.('creative'));
      }
    },
  };
}

function renderSelectVariation(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  if (part.state === 'output-available') {
    return (
      <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <p className="text-sm font-medium text-green-600">
            Variation selected
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

function renderDeleteVariation(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  if (part.state === 'output-available') {
    return (
      <div key={callId} className="border rounded-lg p-3 my-2 bg-destructive/5 border-destructive/30">
        <div className="flex items-center gap-2">
          <Trash className="h-4 w-4 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Variation deleted
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

function renderGenerateVariations(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Generating creative variations...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Creative variations generated successfully
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to generate variations'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderEditVariation(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  const input = part.input as { prompt?: string; variationIndex?: number };
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return <ImageEditProgressLoader key={callId} type="edit" />;
    
    case 'output-available': {
      const output = ((part as unknown as { output?: unknown; result?: unknown }).output || 
                     (part as unknown as { output?: unknown; result?: unknown }).result) as {
        success?: boolean;
        editedImageUrl?: string;
        variationIndex?: number;
        error?: string;
      };
      
      return renderEditImageResult({
        callId,
        keyId: `${callId}-output-available`,
        input,
        output,
        isSubmitting: false
      });
    }
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to edit image'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderRegenerateVariation(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  const input = part.input as { variationIndex?: number };
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return <ImageEditProgressLoader key={callId} type="regenerate" />;
    
    case 'output-available': {
      const output = ((part as unknown as { output?: unknown; result?: unknown }).output || 
                     (part as unknown as { output?: unknown; result?: unknown }).result) as {
        success?: boolean;
        imageUrl?: string;
        variationIndex?: number;
        error?: string;
      };
      
      return renderRegenerateImageResult({
        callId,
        keyId: `${callId}-output-available`,
        output
      });
    }
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to regenerate image'}
        </div>
      );
    
    default:
      return null;
  }
}

