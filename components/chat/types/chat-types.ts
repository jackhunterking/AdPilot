/**
 * Feature: Chat Type Definitions
 * Purpose: Core chat interfaces and types
 * Microservices: Shared kernel - minimal shared types
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import type { UIMessage } from '@ai-sdk/react';

export interface ChatState {
  messages: UIMessage[];
  sendMessage: (input: { text?: string; metadata?: Record<string, unknown> }) => void;
  status: 'idle' | 'streaming' | 'submitted';
  stop: () => void;
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void;
}

export interface ChatProps {
  campaignId?: string;
  conversationId?: string | null;
  currentAdId?: string;
  messages?: UIMessage[];
  campaignMetadata?: {
    initialPrompt?: string;
    initialGoal?: string | null;
  };
  context?: 'build' | 'edit' | 'all-ads' | 'ab-test-builder' | 'results';
  currentStep?: string;
}

export interface EditReferenceContext {
  type?: string;
  variationTitle?: string;
  variationNumber?: number;
  variationIndex?: number;
  format?: 'feed' | 'story' | 'reel';
  imageUrl?: string;
  content?: {
    primaryText?: string;
    headline?: string;
    description?: string;
  };
  gradient?: string;
}

