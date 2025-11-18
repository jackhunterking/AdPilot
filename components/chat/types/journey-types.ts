/**
 * Feature: Journey Type Definitions
 * Purpose: Contract interfaces for journey modules
 * Microservices: Shared kernel - minimal shared types
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import type React from 'react';

// Tool part interface (from AI SDK)
export interface ToolPart {
  type: string;
  toolCallId: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  errorText?: string;
  [key: string]: unknown;
}

// Journey contract - all journeys must implement this
export interface Journey {
  renderTool: (part: ToolPart) => React.ReactNode;
  buildMetadata?: (input: string) => Record<string, unknown>;
  reset?: () => void;
}

// Journey context for orchestration
export interface JourneyContext {
  location: Journey;
  creative: Journey;
  copy: Journey;
  goal: Journey;
  campaign: Journey;
}

