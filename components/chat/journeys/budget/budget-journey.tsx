/**
 * Feature: Budget Journey
 * Purpose: Handle budget and schedule configuration
 * Microservices: Self-contained budget service
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 *  - Budget Service: lib/services/contracts/budget-service.interface.ts
 */

"use client";

import React, { useState } from 'react';
import { DollarSign, Calendar, CheckCircle2 } from 'lucide-react';
import type { Journey, ToolPart, JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface BudgetState extends JourneyState {
  dailyBudget: number | null;
  schedule: {
    startTime?: string;
    endTime?: string;
    timezone?: string;
  } | null;
  adAccountId: string | null;
}

export function BudgetJourney(): Journey<BudgetState> {
  const [state, setState] = useState<BudgetState>({
    status: 'idle',
    dailyBudget: null,
    schedule: null,
    adAccountId: null,
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-setBudget') {
      return renderSetBudget(part);
    }
    
    if (toolType === 'tool-setSchedule') {
      return renderSetSchedule(part);
    }
    
    if (toolType === 'tool-selectAdAccount') {
      return renderSelectAdAccount(part);
    }
    
    return null;
  };

  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'budget',
      input,
      context: {
        setupMode: 'budget',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      dailyBudget: null,
      schedule: null,
      adAccountId: null,
    });
  };

  return {
    id: 'budget',
    renderTool,
    buildMetadata,
    reset,
    getState: () => state,
    setState: (partial) => setState(prev => ({ ...prev, ...partial })),
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('budget'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('budget'));
      }
    },
  };
}

function renderSetBudget(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  const input = part.input as { dailyBudget?: number; currency?: string };
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Setting budget...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Budget set to ${input.dailyBudget}/day
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to set budget'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderSetSchedule(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Configuring schedule...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Schedule configured
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to configure schedule'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderSelectAdAccount(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Selecting ad account...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Ad account selected
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to select ad account'}
        </div>
      );
    
    default:
      return null;
  }
}

