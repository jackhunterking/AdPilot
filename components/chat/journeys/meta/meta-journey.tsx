/**
 * Feature: Meta Connection Journey
 * Purpose: Handle Meta integration and asset selection
 * Microservices: Self-contained Meta connection service
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 *  - Meta Service: lib/services/contracts/meta-service.interface.ts
 */

"use client";

import React, { useState } from 'react';
import { Link2, Building2, FileText, CreditCard, Shield, CheckCircle2 } from 'lucide-react';
import type { Journey, ToolPart, JourneyState, JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

interface MetaConnectionState extends JourneyState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  selectedAssets: {
    businessId?: string;
    pageId?: string;
    adAccountId?: string;
  };
}

export function MetaJourney(): Journey<MetaConnectionState> {
  const [state, setState] = useState<MetaConnectionState>({
    status: 'idle',
    connectionStatus: 'disconnected',
    selectedAssets: {},
  });

  const renderTool = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    if (toolType === 'tool-connectMeta') {
      return renderConnectMeta(part);
    }
    
    if (toolType === 'tool-selectBusiness') {
      return renderSelectBusiness(part);
    }
    
    if (toolType === 'tool-selectPage') {
      return renderSelectPage(part);
    }
    
    if (toolType === 'tool-selectAdAccount') {
      return renderSelectAdAccount(part);
    }
    
    if (toolType === 'tool-verifyPayment') {
      return renderVerifyPayment(part);
    }
    
    return null;
  };

  const buildMetadata = (input: string): JourneyMetadata => {
    return {
      journeyId: 'meta',
      input,
      context: {
        metaMode: 'connect',
      },
    };
  };

  const reset = () => {
    setState({
      status: 'idle',
      connectionStatus: 'disconnected',
      selectedAssets: {},
    });
  };

  return {
    id: 'meta',
    renderTool,
    buildMetadata,
    reset,
    getState: () => state,
    setState: (partial) => setState(prev => ({ ...prev, ...partial })),
    onActivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackActivation?.('meta'));
      }
    },
    onDeactivate: () => {
      if (typeof window !== 'undefined') {
        import('@/lib/monitoring/journey-monitor').then(m => m.journeyMonitor.trackCompletion?.('meta'));
      }
    },
  };
}

function renderConnectMeta(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Connecting to Meta...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-blue-500/5 border-blue-500/30">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-600">
              Connected to Meta
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to connect to Meta'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderSelectBusiness(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Selecting business...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Business selected
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to select business'}
        </div>
      );
    
    default:
      return null;
  }
}

function renderSelectPage(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Selecting page...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Page selected
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to select page'}
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
            <CreditCard className="h-4 w-4 text-green-600" />
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

function renderVerifyPayment(part: ToolPart): React.ReactNode {
  const callId = part.toolCallId;
  
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <div key={callId} className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Verifying payment...</span>
        </div>
      );
    
    case 'output-available':
      return (
        <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              Payment verified
            </p>
          </div>
        </div>
      );
    
    case 'output-error':
      return (
        <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
          Error: {part.errorText || 'Failed to verify payment'}
        </div>
      );
    
    default:
      return null;
  }
}

