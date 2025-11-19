/**
 * Feature: Destination Journey
 * Purpose: Handle destination setup (instant form, website URL, phone)
 * Microservices: Self-contained destination service
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 *  - Destination Service: lib/services/contracts/destination-service.interface.ts
 */

"use client";

import React, { useState } from 'react';
import { CheckCircle2, Link, Phone, FileText } from 'lucide-react';
import type { Journey, ToolPart, JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface DestinationState extends JourneyState {
  destinationType: 'instant_form' | 'website_url' | 'phone' | null;
  configuration: Record<string, unknown> | null;
}

export function DestinationJourney(): Journey<DestinationState> {
  const [state, setState] = useState<DestinationState>({
    status: 'idle',
    destinationType: null,
    configuration: null,
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-setupDestination') {
      return renderSetupDestination(part);
    }
    
    return null;
  };

  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'destination',
      input,
      context: {
        setupMode: 'destination',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      destinationType: null,
      configuration: null,
    });
  };

  return {
    id: 'destination',
    renderTool,
    buildMetadata,
    reset,
    getState: () => state,
    setState: (partial) => setState(prev => ({ ...prev, ...partial })),
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('destination'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('destination'));
      }
    },
  };
}

function renderSetupDestination(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  const input = part.input as { type?: string };
  
  const getIcon = () => {
    switch (input.type) {
      case 'instant_form':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'website_url':
        return <Link className="h-4 w-4 text-blue-600" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-blue-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
    }
  };

  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Setting up destination...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            {getIcon()}
            <p className="text-sm font-medium text-green-600">
              Destination configured
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to setup destination'}
        </div>
      );
    
    default:
      return null;
  }
}

