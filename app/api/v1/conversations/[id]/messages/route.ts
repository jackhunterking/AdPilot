/**
 * Feature: Conversation Messages API (v1)
 * Purpose: Get message history for a conversation
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse, NotFoundError, ForbiddenError } from '@/app/api/v1/_middleware';
import { conversationManager } from '@/lib/services/conversation-manager';
import { messageStore } from '@/lib/services/message-store';

// GET /api/v1/conversations/[id]/messages - Get message history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    // Get conversation to verify ownership
    const conversation = await conversationManager.getConversation(id);
    
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Verify ownership
    if (conversation.user_id !== user.id) {
      throw new ForbiddenError('You do not have access to this conversation');
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '80');
    const before = searchParams.get('before') || undefined;

    // Load messages using message store service
    const messages = await messageStore.loadMessages(id, {
      limit,
      before,
    });

    return successResponse({
      messages,
      count: messages.length,
      conversation_id: id,
    });
  } catch (error) {
    console.error('[GET /api/v1/conversations/:id/messages] Error:', error);
    return errorResponse(error as Error);
  }
}
