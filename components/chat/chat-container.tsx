/**
 * Feature: Chat Container (Orchestrator)
 * Purpose: Coordinate journey modules, no business logic
 * Microservices: Thin orchestration layer
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

"use client";

import React, { lazy, Suspense } from 'react';
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
import { useJourneyRouter } from './hooks/use-journey-router';
import { useMetadataBuilder } from './hooks/use-metadata-builder';
import type { ChatProps } from './types/chat-types';

// Journey modules (loaded synchronously for now due to factory pattern)
// Future optimization: Convert journeys to async modules
import { LocationJourney } from './journeys/location/location-journey';
import { CreativeJourney } from './journeys/creative/creative-journey';
import { CopyJourney } from './journeys/copy/copy-journey';
import { GoalJourney } from './journeys/goal/goal-journey';
import { CampaignJourney } from './journeys/campaign/campaign-journey';
import { DestinationJourney } from './journeys/destination/destination-journey';
import { BudgetJourney } from './journeys/budget/budget-journey';
import { AnalyticsJourney } from './journeys/analytics/analytics-journey';
import { ResultsJourney } from './journeys/results/results-journey';
import { MetaJourney } from './journeys/meta/meta-journey';

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
  const destinationJourney = DestinationJourney();
  const budgetJourney = BudgetJourney();
  const analyticsJourney = AnalyticsJourney();
  const resultsJourney = ResultsJourney();
  const metaJourney = MetaJourney();
  
  // Create journey router with state persistence
  const { routeToJourney } = useJourneyRouter({
    location: locationJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    creative: creativeJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    copy: copyJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    goal: goalJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    campaign: campaignJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    destination: destinationJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    budget: budgetJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    analytics: analyticsJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    results: resultsJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
    meta: metaJourney as unknown as import('@/lib/journeys/types/journey-contracts').Journey,
  }, {
    persistState: true,
    enableEvents: true,
  });
  
  // Note: This is a simplified orchestrator demonstrating journey architecture
  // Full integration with useChat hook would require more setup
  // For now, this shows the microservices pattern
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    }>
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
    </Suspense>
  );
}

