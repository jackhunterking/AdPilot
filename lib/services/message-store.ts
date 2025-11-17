/**
 * Feature: Message Store Service
 * Purpose: AI SDK conversation history persistence with Supabase
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { UIMessage } from 'ai';
import { sanitizeParts } from '@/lib/ai/schema';
import { supabaseServer } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/database.types';

// ============================================
// Types
// ============================================

interface LoadMessagesOptions {
  limit?: number;
  before?: string; // seq value for cursor-based pagination
  includeMetadata?: boolean;
}

interface SaveMessageOptions {
  skipValidation?: boolean;
}

type MessageRow = Database['public']['Tables']['messages']['Row'];

// ============================================
// Message Transformation
// ============================================

/**
 * Convert UIMessage to database row format
 * Extracts text content for searching while preserving full parts array
 */
function messageToStorage(msg: UIMessage, conversationId: string): Omit<MessageRow, 'seq' | 'created_at'> {
  // Extract text content for the content field (for querying)
  const textParts = (msg.parts as Array<{ type: string; text?: string }> | undefined)?.filter((part) => part.type === 'text') || [];
  let content = textParts.map((p) => p.text || '').join('\n');
  
  // For messages with tool parts but no text, create descriptive content
  // This satisfies the database constraint and improves searchability
  if (!content || content.trim().length === 0) {
    const toolParts = (msg.parts as Array<{ type?: string; toolCallId?: string }> | undefined)?.filter(
      (part) => typeof part.type === 'string' && part.type.startsWith('tool-')
    ) || [];
    
    if (toolParts.length > 0) {
      // Create human-readable content from tool calls
      const toolDescriptions = toolParts.map((p) => {
        const toolType = (p.type as string).replace('tool-', '');
        return `[Tool: ${toolType}]`;
      }).join(', ');
      
      content = `Tool execution: ${toolDescriptions}`;
    }
  }
  
  // Enforce content size limit (50KB)
  const truncatedContent = content.length > 50000 
    ? content.substring(0, 50000) + '... [truncated]'
    : content;
  
  // Final safety: ensure content is never empty string (use single space as minimum)
  const finalContent = truncatedContent || ' ';
  
  return {
    id: msg.id,
    conversation_id: conversationId,
    role: msg.role,
    content: finalContent,
    parts: (msg.parts as unknown as Json) || [],
    tool_invocations: ((msg as unknown as { toolInvocations?: unknown }).toolInvocations as Json) || [],
    metadata: ((msg as unknown as { metadata?: Record<string, unknown> }).metadata as Json) || {},
  };
}

/**
 * Convert database row to UIMessage format
 * Restores complete message with parts and tool invocations
 * Filters incomplete tool invocations for data integrity
 */
function storageToMessage(stored: MessageRow): UIMessage {
  // Sanitize all parts from storage to guarantee invariants
  let parts = sanitizeParts(stored.parts);
  
  // For assistant messages, filter incomplete tool invocations
  // Per AI SDK docs: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#response-messages
  if (stored.role === 'assistant' && parts.length > 0) {
    parts = parts.filter((part) => {
      const type = (part as { type?: unknown }).type;
      if (typeof type !== 'string') return false;
      
      // Keep all non-tool parts
      if (!type.startsWith('tool-')) return true;
      
      // For tool parts, we need a toolCallId
      const toolCallId = (part as { toolCallId?: unknown }).toolCallId;
      if (typeof toolCallId !== 'string' || !toolCallId) {
        console.log(`[MessageStore] Filtering tool part without toolCallId:`, { type });
        return false;
      }
      
      // Keep tool-result parts (they're complete by definition)
      if (type === 'tool-result') return true;
      
      // For tool-specific parts (tool-addLocations, tool-generateImage, etc.)
      // Keep them if they have EITHER:
      // 1. An output property (where results are stored)
      // 2. A result property (legacy/alternative storage)
      // 3. A state indicating completion (output-available, output-error)
      const hasOutput = (part as { output?: unknown }).output !== undefined;
      const hasResult = (part as { result?: unknown }).result !== undefined;
      const state = (part as { state?: unknown }).state;
      const hasCompletionState = state === 'output-available' || state === 'output-error';
      
      if (hasOutput || hasResult || hasCompletionState) {
        return true;
      }
      
      // Filter out incomplete tool invocations (streaming, no output yet)
      console.log(`[MessageStore] Filtering incomplete tool part:`, { 
        type, 
        toolCallId, 
        state,
        hasOutput, 
        hasResult 
      });
      return false;
    });
  }
  
  // Migrate legacy data field to metadata for backward compatibility
  const metadata: Record<string, unknown> = (stored.metadata as Record<string, unknown>) || {};
  if ((stored as unknown as { data?: Record<string, unknown> }).data && !(metadata as { migratedFromData?: boolean }).migratedFromData) {
    Object.assign(metadata, (stored as unknown as { data?: Record<string, unknown> }).data);
    (metadata as { migratedFromData: boolean }).migratedFromData = true;
  }
  
  return {
    id: stored.id,
    role: stored.role as 'user' | 'assistant' | 'system',
    parts: parts,
    metadata, // Include metadata (AI SDK v5 pattern)
    ...(stored.tool_invocations && (stored.tool_invocations as unknown[]).length > 0 && {
      toolInvocations: stored.tool_invocations as unknown
    })
  } as UIMessage;
}

// ============================================
// Message Store Service
// ============================================

export const messageStore = {
  /**
   * Load messages from a conversation with pagination
   * Uses seq-based cursor pagination for efficiency
   */
  async loadMessages(
    conversationId: string,
    _options: LoadMessagesOptions = {}
  ): Promise<UIMessage[]> {
    const { limit = 80, before } = _options;

    try {
      let query = supabaseServer
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('seq', { ascending: true })
        .limit(limit);

      // Cursor-based pagination
      if (before) {
        query = query.lt('seq', parseInt(before));
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MessageStore] Load error:', error);
        throw new Error(`Failed to load messages: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      console.log(`[MessageStore] Loaded ${data.length} messages for conversation ${conversationId}`);

      return data.map(storageToMessage);
    } catch (error) {
      console.error('[MessageStore] Load exception:', error);
      throw error;
    }
  },

  /**
   * Save a single message (append-only)
   * Uses atomic insert to prevent race conditions
   */
  async saveMessage(
    conversationId: string,
    message: UIMessage,
    _options: SaveMessageOptions = {}
  ): Promise<void> {
    try {
      // Validate message has ID
      if (!message.id) {
        throw new Error('Message must have an ID');
      }

      const messageData = messageToStorage(message, conversationId);

      const { error } = await supabaseServer
        .from('messages')
        .insert(messageData);

      if (error) {
        console.error('[MessageStore] Save error:', error);
        throw new Error(`Failed to save message: ${error.message}`);
      }

      console.log(`[MessageStore] Saved message ${message.id} to conversation ${conversationId}`);
    } catch (error) {
      console.error('[MessageStore] Save exception:', error);
      throw error;
    }
  },

  /**
   * Save multiple messages in a batch (append-only)
   * Note: Only saves NEW messages, does not update existing ones
   */
  async saveMessages(
    conversationId: string,
    messages: UIMessage[]
  ): Promise<void> {
    if (messages.length === 0) {
      console.log('[MessageStore] No messages to save');
      return;
    }

    try {
      // Validate all messages have IDs
      const invalidMessages = messages.filter(m => !m.id);
      if (invalidMessages.length > 0) {
        throw new Error(`Found ${invalidMessages.length} messages without IDs`);
      }

      // Get existing message IDs to avoid duplicates
      const messageIds = messages.map(m => m.id);
      const { data: existing } = await supabaseServer
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .in('id', messageIds);

      const existingIds = new Set(existing?.map(m => m.id) || []);
      
      // Filter out messages that already exist
      const newMessages = messages.filter(m => !existingIds.has(m.id));

      if (newMessages.length === 0) {
        console.log('[MessageStore] All messages already exist, skipping save');
        return;
      }

      // Convert to storage format
      const messagesToInsert = newMessages.map(msg => 
        messageToStorage(msg, conversationId)
      );

      const { error } = await supabaseServer
        .from('messages')
        .insert(messagesToInsert);

      if (error) {
        console.error('[MessageStore] Batch save error:', error);
        throw new Error(`Failed to save messages: ${error.message}`);
      }

      console.log(`[MessageStore] Saved ${newMessages.length} new messages to conversation ${conversationId}`);
    } catch (error) {
      console.error('[MessageStore] Batch save exception:', error);
      throw error;
    }
  },

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    try {
      const { count, error } = await supabaseServer
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('[MessageStore] Count error:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[MessageStore] Count exception:', error);
      return 0;
    }
  },

  /**
   * Get the most recent message in a conversation
   */
  async getLatestMessage(conversationId: string): Promise<UIMessage | null> {
    try {
      const { data, error } = await supabaseServer
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('seq', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return storageToMessage(data);
    } catch (error) {
      console.error('[MessageStore] Get latest exception:', error);
      return null;
    }
  },

  /**
   * Delete all messages in a conversation (cascade delete)
   */
  async deleteConversationMessages(conversationId: string): Promise<void> {
    try {
      const { error } = await supabaseServer
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('[MessageStore] Delete error:', error);
        throw new Error(`Failed to delete messages: ${error.message}`);
      }

      console.log(`[MessageStore] Deleted all messages for conversation ${conversationId}`);
    } catch (error) {
      console.error('[MessageStore] Delete exception:', error);
      throw error;
    }
  },

  /**
   * Search messages by content (requires FTS index)
   * Only use if full-text search index is enabled
   */
  async searchMessages(
    conversationId: string,
    query: string,
    limit: number = 20
  ): Promise<UIMessage[]> {
    try {
      // Use ilike for basic search (works without FTS index)
      const { data, error } = await supabaseServer
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .ilike('content', `%${query}%`)
        .order('seq', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[MessageStore] Search error:', error);
        return [];
      }

      return (data || []).map(storageToMessage);
    } catch (error) {
      console.error('[MessageStore] Search exception:', error);
      return [];
    }
  },
};

