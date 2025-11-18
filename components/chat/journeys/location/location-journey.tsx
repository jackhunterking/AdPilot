/**
 * Feature: Location Targeting Journey
 * Purpose: Complete location targeting workflow
 * Microservices: Self-contained location service
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

"use client";

import React, { Fragment } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { LocationProcessingCard } from '@/components/ai-elements/location-processing-card';
import { renderLocationUpdateResult } from '@/components/ai-elements/tool-renderers';
import { useLocationMode } from './use-location-mode';
import { createLocationMetadata } from './location-metadata';
import type { Journey, ToolPart } from '@/components/chat/types/journey-types';

interface LocationToolInput {
  locations: Array<{
    name: string;
    type: string;
    mode?: string;
    radius?: number;
  }>;
  explanation?: string;
}

export function LocationJourney(): Journey {
  const { mode, isActive, reset } = useLocationMode();
  
  const renderTool = (part: ToolPart): React.ReactNode => {
    if (part.type !== 'tool-addLocations') {
      return null;
    }
    
    const callId = part.toolCallId;
    const input = part.input as LocationToolInput;
    
    switch (part.state) {
      case 'input-streaming':
        return null;
      
      case 'input-available':
        return (
          <LocationProcessingCard
            key={callId}
            locationCount={input.locations.length}
          />
        );
      
      case 'output-available': {
        const output = ((part as unknown as { output?: unknown; result?: unknown }).output || 
                       (part as unknown as { output?: unknown; result?: unknown }).result) as {
          success?: boolean;
          count?: number;
          locations?: Array<{
            name: string;
            coordinates: [number, number];
            radius?: number;
            type: string;
            mode: string;
            bbox?: [number, number, number, number];
            geometry?: unknown;
            key?: string;
            country_code?: string;
          }>;
          error?: string;
        };
        
        if (!output.success || output.error) {
          return (
            <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
              Error: {output.error || 'Failed to update location'}
            </div>
          );
        }
        
        return renderLocationUpdateResult({
          callId,
          keyId: `${callId}-output-available`,
          input,
          output
        });
      }
      
      case 'output-error':
        return (
          <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
            Error: {part.errorText || 'Failed to update location'}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  const buildMetadata = (input: string) => {
    return createLocationMetadata(mode, input);
  };
  
  return {
    renderTool,
    buildMetadata,
    reset,
    mode,
    isActive
  };
}

