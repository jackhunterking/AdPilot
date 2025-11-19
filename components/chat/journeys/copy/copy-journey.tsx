/**
 * Feature: Copy Journey (Enhanced)
 * Purpose: Handle all copy editing operations
 * Microservices: Self-contained copy service with full Journey interface
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import React, { useState } from 'react';
import { FileText, Edit, Check, Sparkles } from 'lucide-react';
import { ImageEditProgressLoader } from '@/components/ai-elements/image-edit-progress-loader';
import { renderEditAdCopyResult } from '@/components/ai-elements/tool-renderers';
import type { Journey, ToolPart, JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface CopyState extends JourneyState {
  copyVariations: Array<{
    headline: string;
    primaryText: string;
    description?: string;
    cta: string;
  }>;
  selectedIndex: number | null;
  isEditing: boolean;
}

export function CopyJourney(): Journey<CopyState> {
  const [state, setState] = useState<CopyState>({
    status: 'idle',
    copyVariations: [],
    selectedIndex: null,
    isEditing: false,
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-editCopy') {
      return renderEditCopy(part);
    }
    
    if (toolType === 'tool-generateCopyVariations') {
      return renderGenerateCopyVariations(part);
    }
    
    if (toolType === 'tool-selectCopyVariation') {
      return renderSelectCopyVariation(part);
    }
    
    return null;
  };

  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'copy',
      input,
      context: {
        copyMode: 'edit',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      copyVariations: [],
      selectedIndex: null,
      isEditing: false,
    });
  };

  return {
    id: 'copy',
    renderTool,
    buildMetadata,
    reset,
    getState: () => state,
    setState: (partial) => setState(prev => ({ ...prev, ...partial })),
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('copy'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('copy'));
      }
    },
  };
}

function renderEditCopy(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  const input = part.input as { 
    prompt?: string; 
    current?: { 
      primaryText?: string; 
      headline?: string; 
      description?: string 
    } 
  };
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return <ImageEditProgressLoader key={callId} type="edit" />;
    
    case 'output-available': {
      const output = ((part as unknown as { output?: unknown; result?: unknown }).output || 
                     (part as unknown as { output?: unknown; result?: unknown }).result) as {
        success?: boolean;
        variationIndex?: number;
        copy?: {
          primaryText: string;
          headline: string;
          description: string;
        };
        error?: string;
      };
      
      return renderEditAdCopyResult({
        callId,
        keyId: `${callId}-output-available`,
        input,
        output
      });
    }
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to edit ad copy'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderGenerateCopyVariations(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  if (part.state === 'output-available') {
    return (
      <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-green-600" />
          <p className="text-sm font-medium text-green-600">
            Copy variations generated
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

function renderSelectCopyVariation(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  if (part.state === 'output-available') {
    return (
      <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <p className="text-sm font-medium text-green-600">
            Copy variation selected
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}

