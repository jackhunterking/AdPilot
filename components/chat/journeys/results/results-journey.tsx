/**
 * Feature: Results Journey
 * Purpose: Handle results interpretation and optimization suggestions
 * Microservices: Self-contained results service
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import React, { useState } from 'react';
import { Lightbulb, Download, Target } from 'lucide-react';
import type { Journey, ToolPart, JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface ResultsState extends JourneyState {
  resultsSnapshot: unknown | null;
  suggestions: unknown[] | null;
}

export function ResultsJourney(): Journey<ResultsState> {
  const [state, setState] = useState<ResultsState>({
    status: 'idle',
    resultsSnapshot: null,
    suggestions: null,
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-interpretResults') {
      return renderInterpretResults(part);
    }
    
    if (toolType === 'tool-suggestOptimizations') {
      return renderSuggestOptimizations(part);
    }
    
    if (toolType === 'tool-exportLeads') {
      return renderExportLeads(part);
    }
    
    return null;
  };

  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'results',
      input,
      context: {
        resultsMode: 'interpret',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      resultsSnapshot: null,
      suggestions: null,
    });
  };

  return {
    id: 'results',
    renderTool,
    buildMetadata,
    reset,
    getState: () => state,
    setState: (partial) => setState(prev => ({ ...prev, ...partial })),
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('results'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('results'));
      }
    },
  };
}

function renderInterpretResults(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Interpreting results...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-blue-500/5 border-blue-500/30">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-600">
              Results analyzed
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to interpret results'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderSuggestOptimizations(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Generating optimization suggestions...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-yellow-500/5 border-yellow-500/30">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-600">
              Optimization suggestions generated
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to generate optimization suggestions'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderExportLeads(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Exporting leads...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Leads exported
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to export leads'}
        </div>
      );
    
    default:
      return null;
  }
}

