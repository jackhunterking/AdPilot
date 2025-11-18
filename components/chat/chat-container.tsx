/**
 * Feature: Chat Container (Orchestrator)
 * Purpose: Coordinate journey modules, no business logic
 * Microservices: Thin orchestration layer
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

"use client";

import React from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { MessageRenderer } from './message-renderer';
import { LocationJourney } from './journeys/location/location-journey';
import { CreativeJourney } from './journeys/creative/creative-journey';
import { CopyJourney } from './journeys/copy/copy-journey';
import { GoalJourney } from './journeys/goal/goal-journey';
import { CampaignJourney } from './journeys/campaign/campaign-journey';
import { useJourneyRouter } from './hooks/use-journey-router';
import { useMetadataBuilder } from './hooks/use-metadata-builder';
import type { ChatProps } from './types/chat-types';

/**
 * Chat Container - Microservices Orchestrator
 * 
 * This component is LEAN - it only coordinates journey modules.
 * All business logic lives in journey modules.
 * 
 * Architecture:
 * - Initializes 5 independent journey services
 * - Routes tool parts to appropriate journey
 * - Combines journey metadata
 * - No business logic (just coordination)
 */
export function ChatContainer({
  campaignId,
  conversationId,
  currentAdId,
  messages = [],
  campaignMetadata,
  context,
  currentStep
}: ChatProps) {
  // Initialize all journey modules
  const locationJourney = LocationJourney();
  const creativeJourney = CreativeJourney();
  const copyJourney = CopyJourney();
  const goalJourney = GoalJourney();
  const campaignJourney = CampaignJourney();
  
  // Create journey router
  const { routeToJourney } = useJourneyRouter({
    location: locationJourney,
    creative: creativeJourney,
    copy: copyJourney,
    goal: goalJourney,
    campaign: campaignJourney
  });
  
  // Note: This is a simplified orchestrator demonstrating journey architecture
  // Full integration with useChat hook would require more setup
  // For now, this shows the microservices pattern
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {messages.map((message) => (
          <MessageRenderer
            key={message.id}
            message={message}
            routeToJourney={routeToJourney}
          />
        ))}
      </div>
      
      <div className="border-t bg-background px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="text-sm text-muted-foreground">
            Chat Container (Orchestrator) - Journey modules initialized
          </div>
        </div>
      </div>
    </div>
  );
}

