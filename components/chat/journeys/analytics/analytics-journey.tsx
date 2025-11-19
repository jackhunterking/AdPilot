/**
 * Feature: Analytics Journey
 * Purpose: Handle metrics explanation and performance insights
 * Microservices: Self-contained analytics service
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 *  - Analytics Service: lib/services/contracts/analytics-service.interface.ts
 */

"use client";

import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import type { Journey, ToolPart, JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface AnalyticsState extends JourneyState {
  activeMetric: string | null;
  comparisonData: unknown | null;
}

export function AnalyticsJourney(): Journey<AnalyticsState> {
  const [state, setState] = useState<AnalyticsState>({
    status: 'idle',
    activeMetric: null,
    comparisonData: null,
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-explainMetrics') {
      return renderExplainMetrics(part);
    }
    
    if (toolType === 'tool-comparePerformance') {
      return renderComparePerformance(part);
    }
    
    if (toolType === 'tool-analyzeDemographics') {
      return renderAnalyzeDemographics(part);
    }
    
    return null;
  };

  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'analytics',
      input,
      context: {
        analyticsMode: 'explain',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      activeMetric: null,
      comparisonData: null,
    });
  };

  return {
    id: 'analytics',
    renderTool,
    buildMetadata,
    reset,
    getState: () => state,
    setState: (partial) => setState(prev => ({ ...prev, ...partial })),
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('analytics'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('analytics'));
      }
    },
  };
}

function renderExplainMetrics(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Analyzing metrics...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-blue-500/5 border-blue-500/30">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-600">
              Metrics explained
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to explain metrics'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderComparePerformance(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Comparing performance...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-purple-500/5 border-purple-500/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-purple-600">
              Performance comparison complete
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to compare performance'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderAnalyzeDemographics(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Analyzing demographics...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-purple-500/5 border-purple-500/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-purple-600">
              Demographic analysis complete
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to analyze demographics'}
        </div>
      );
    
    default:
      return null;
  }
}

