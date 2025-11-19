/**
 * Feature: Conversation Detail API (v1)
 * Purpose: Get, update, and delete specific conversations
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse, NotFoundError, ForbiddenError, ValidationError } from '@/app/api/v1/_middleware';
import { conversationManager } from '@/lib/services/conversation-manager';

// GET /api/v1/conversations/[id] - Get conversation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    // Get conversation
    const conversation = await conversationManager.getConversation(id);
    
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Verify ownership
    if (conversation.user_id !== user.id) {
      throw new ForbiddenError('You do not have access to this conversation');
    }

    return successResponse({ conversation });
  } catch (error) {
    console.error('[GET /api/v1/conversations/:id] Error:', error);
    return errorResponse(error as Error);
  }
}

// PATCH /api/v1/conversations/[id] - Update conversation
export async function PATCH(
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

    const body: unknown = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body');
    }

    const { title, metadata } = body as { title?: string; metadata?: Record<string, unknown> };

    // Update conversation
    if (title !== undefined) {
      await conversationManager.updateTitle(id, title);
    }

    if (metadata !== undefined) {
      await conversationManager.updateMetadata(id, metadata);
    }

    // Return updated conversation
    const updatedConversation = await conversationManager.getConversation(id);

    return successResponse({ conversation: updatedConversation });
  } catch (error) {
    console.error('[PATCH /api/v1/conversations/:id] Error:', error);
    return errorResponse(error as Error);
  }
}

// DELETE /api/v1/conversations/[id] - Delete conversation
export async function DELETE(
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

    // Delete conversation (cascade deletes messages)
    await conversationManager.deleteConversation(id);

    return successResponse({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/v1/conversations/:id] Error:', error);
    return errorResponse(error as Error);
  }
}
