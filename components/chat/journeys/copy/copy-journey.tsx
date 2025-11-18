/**
 * Feature: Copy Journey
 * Purpose: Handle all copy editing operations
 * Microservices: Self-contained copy service
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

"use client";

import React from 'react';
import { ImageEditProgressLoader } from '@/components/ai-elements/image-edit-progress-loader';
import { renderEditAdCopyResult } from '@/components/ai-elements/tool-renderers';
import type { Journey, ToolPart } from '@/components/chat/types/journey-types';

export function CopyJourney(): Journey {
  const renderTool = (part: ToolPart): React.ReactNode => {
    if (part.type !== 'tool-editCopy') {
      return null;
    }
    
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
  };
  
  return { renderTool };
}

