/**
 * Feature: Creative Journey
 * Purpose: Handle all image/creative generation and editing
 * Microservices: Self-contained creative service
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

"use client";

import React from 'react';
import { ImageEditProgressLoader } from '@/components/ai-elements/image-edit-progress-loader';
import { renderEditImageResult, renderRegenerateImageResult } from '@/components/ai-elements/tool-renderers';
import type { Journey, ToolPart } from '@/components/chat/types/journey-types';

export function CreativeJourney(): Journey {
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
    
    return null;
  };
  
  return { renderTool };
}

function renderGenerateVariations(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Generating creative variations...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="text-sm text-green-600 p-3 border border-green-500/30 rounded-lg my-2">
          ✨ Creative variations generated successfully
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

