/**
 * Feature: Finish Handler Service
 * Purpose: Handle message persistence, title generation, and summarization
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Microservices: Extracted from app/api/v1/chat/route.ts
 */

import { messageStore } from '@/lib/services/message-store';
import { conversationManager } from '@/lib/services/conversation-manager';
import { autoSummarizeIfNeeded } from '@/lib/ai/summarization';
import type { UIMessage } from '@ai-sdk/react';

// ============================================================================
// Types
// ============================================================================

export interface FinishHandlerInput {
  conversationId: string | null;
  messages: UIMessage[];
  responseMessage: UIMessage;
  conversation?: {
    id: string;
    title?: string | null;
    [key: string]: unknown;
  } | null;
}

// ============================================================================
// Finish Handler Service
// ============================================================================

export class FinishHandlerService {
  /**
   * Handle completion of AI response
   * Persists messages, generates title, and triggers summarization
   */
  async handle(input: FinishHandlerInput): Promise<void> {
    const { conversationId, messages, responseMessage, conversation } = input;

    if (!conversationId) {
      console.warn('[FinishHandler] No conversation ID, skipping save');
      return;
    }

    console.log(`[FinishHandler] Called with ${messages.length} messages`);
    console.log(`[FinishHandler] Response message:`, {
      id: responseMessage.id,
      role: responseMessage.role,
      partsCount: responseMessage.parts?.length || 0,
    });

    // Filter and validate messages
    const validMessages = this.filterValidMessages(messages);
    
    console.log(`[FinishHandler] Filtered ${messages.length} → ${validMessages.length} valid messages`);

    try {
      // Save messages to database
      await messageStore.saveMessages(conversationId, validMessages);
      console.log(`[FinishHandler] ✅ Saved ${validMessages.length} messages`);

      // Auto-generate title if needed
      if (conversation && !conversation.title && validMessages.length > 0) {
        await conversationManager.autoGenerateTitle(conversationId);
        console.log(`[FinishHandler] ✅ Generated conversation title`);
      }

      // Auto-summarize if threshold reached (non-blocking)
      autoSummarizeIfNeeded(conversationId).catch(error => {
        console.error('[FinishHandler] ⚠️ Auto-summarization failed:', error);
      });
    } catch (error) {
      console.error('[FinishHandler] ❌ Failed to save messages:', error);
      // Don't throw - persistence failure shouldn't break the stream
    }
  }

  /**
   * Filter messages to ensure complete tool executions
   */
  private filterValidMessages(messages: UIMessage[]): UIMessage[] {
    return messages.filter(msg => {
      // User and system messages are always valid
      if (msg.role !== 'assistant') return true;

      const parts = (msg.parts as Array<{ 
        type: string; 
        text?: string; 
        toolCallId?: string 
      }>) || [];

      // Assistant messages MUST have at least one text part OR tool results
      const hasTextContent = parts.some(p => 
        p.type === 'text' && p.text && p.text.trim().length > 0
      );

      const hasToolResults = parts.some(p => 
        typeof p.type === 'string' && p.type.startsWith('tool-')
      );

      // Log filtering for debugging
      if (!hasTextContent && !hasToolResults) {
        console.log(`[FinishHandler] Filtering assistant message without content: ${msg.id}`);
        return false;
      }

      if (hasToolResults && !hasTextContent) {
        console.log(`[FinishHandler] ✅ Keeping tool-only message: ${msg.id}`);
      }

      return true;
    });
  }
}

// Export singleton
export const finishHandlerService = new FinishHandlerService();

