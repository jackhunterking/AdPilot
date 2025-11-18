/**
 * Feature: Message Renderer
 * Purpose: Route message parts to appropriate journey modules
 * Microservices: Orchestration layer
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

"use client";

import React from 'react';
import { Message, MessageContent } from '@/components/ai-elements/message';
import type { UIMessage } from '@ai-sdk/react';
import type { ToolPart } from './types/journey-types';

interface MessageRendererProps {
  message: UIMessage;
  routeToJourney: (part: ToolPart) => React.ReactNode;
}

export function MessageRenderer({ message, routeToJourney }: MessageRendererProps) {
  const parts = (message.parts as Array<{ type: string; text?: string; [key: string]: unknown }>) || [];
  
  return (
    <Message from={message.role}>
      <MessageContent>
        {parts.map((part, i) => {
          // Text parts
          if (part.type === 'text' && part.text) {
            return (
              <div key={`${message.id}-text-${i}`} className="whitespace-pre-wrap">
                {part.text}
              </div>
            );
          }
          
          // Tool parts - route to appropriate journey
          if (part.type.startsWith('tool-')) {
            return routeToJourney(part as ToolPart);
          }
          
          // Unknown part type
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

