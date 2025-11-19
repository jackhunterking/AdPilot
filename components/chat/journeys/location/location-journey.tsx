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
import { useLocation } from '@/lib/context/location-context';
import type { Journey, ToolPart, JourneyState } from '@/lib/journeys/types/journey-contracts';

interface LocationToolInput {
  locations: Array<{
    name: string;
    type: string;
    mode?: string;
    radius?: number;
  }>;
  explanation?: string;
}

interface LocationToolOutput {
  success: boolean;
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
  message?: string;
}

interface LocationState extends JourneyState {
  mode: 'include' | 'exclude';
  isActive: boolean;
}

export function LocationJourney(): Journey<LocationState> {
  const { mode, isActive, reset } = useLocationMode();
  const { addLocations, updateStatus } = useLocation(); // ✅ Journey has context access
  
  const renderTool = (part: ToolPart): React.ReactNode => {
    // Handle tool type with or without 'tool-' prefix
    const toolName = part.type.startsWith('tool-') 
      ? part.type.slice(5) 
      : part.type;
    
    if (toolName !== 'addLocations') {
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
                       (part as unknown as { output?: unknown; result?: unknown }).result) as LocationToolOutput;
        
        // ✅ INTEGRATION: Update LocationContext when tool succeeds
        // ✅ Wrap in try-catch to prevent journey crashes
        try {
          if (output.success && output.locations && output.locations.length > 0) {
            // Add IDs and integrate into context
            const locationsWithIds = output.locations.map(loc => ({
              ...loc,
              id: `${loc.name}-${loc.mode}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
            }));
            
            // ✅ Journey handles its own side effects
            addLocations(locationsWithIds, true)
              .then(() => {
                console.log('[LocationJourney] ✅ Integrated locations into context:', locationsWithIds.length);
                updateStatus('completed');
              })
              .catch(err => {
                console.error('[LocationJourney] ❌ Failed to integrate locations:', err);
                updateStatus('error');
              });
          }
        } catch (error) {
          console.error('[LocationJourney] ❌ Critical error during integration:', error);
          updateStatus('error');
        }
        
        // Handle errors
        if (!output.success || output.error) {
          return (
            <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
              Error: {output.error || 'Failed to update location'}
            </div>
          );
        }
        
        // Render success UI
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
  
  const getState = (): LocationState => {
    return {
      status: 'idle',
      mode,
      isActive
    };
  };
  
  const setState = (partial: Partial<LocationState>) => {
    console.log('[LocationJourney] setState called with:', partial);
  };
  
  return {
    id: 'location',
    renderTool,
    buildMetadata,
    reset,
    getState,
    setState,
    mode,
    isActive,
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('location'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('location'));
      }
    },
  };
}

