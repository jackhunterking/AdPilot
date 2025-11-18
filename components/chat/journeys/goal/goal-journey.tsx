/**
 * Feature: Goal Journey
 * Purpose: Handle goal setup workflow
 * Microservices: Self-contained goal service
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

"use client";

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Journey, ToolPart } from '@/components/chat/types/journey-types';

export function GoalJourney(): Journey {
  const renderTool = (part: ToolPart): React.ReactNode => {
    if (part.type !== 'tool-setupGoal') {
      return null;
    }
    
    const callId = part.toolCallId;
    const input = part.input as { confirmationMessage?: string };
    
    switch (part.state) {
      case 'input-streaming':
        return (
          <div key={callId} className="text-sm text-muted-foreground">
            Setting up goal...
          </div>
        );
      
      case 'input-available':
        return (
          <div key={callId} className="w-full my-4 space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-600 mb-1">Goal Configuration</p>
                <p className="text-xs text-muted-foreground">
                  {input.confirmationMessage || 'Setting up campaign goal...'}
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'output-available': {
        const output = ((part as unknown as { output?: unknown; result?: unknown }).output || 
                       (part as unknown as { output?: unknown; result?: unknown }).result) as {
          success?: boolean;
          goalType?: string;
        };
        
        if (!output.success) {
          return (
            <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
              Error: Failed to setup goal
            </div>
          );
        }
        
        return (
          <div key={callId} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-600">
                Goal setup complete
              </p>
            </div>
          </div>
        );
      }
      
      case 'output-error':
        return (
          <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
            Error: {part.errorText || 'Failed to setup goal'}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return { renderTool };
}

