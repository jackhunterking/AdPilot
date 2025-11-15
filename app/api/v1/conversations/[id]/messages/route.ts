/**
 * Feature: Conversation Messages API
 * Purpose: Get message history for a conversation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { conversationManager } from '@/lib/services/conversation-manager';
import { messageStore } from '@/lib/services/message-store';

// GET /api/conversations/[id]/messages - Get message history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get conversation to verify ownership
    const conversation = await conversationManager.getConversation(id);
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
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

    return NextResponse.json({
      messages,
      count: messages.length,
      conversation_id: id,
    });
  } catch (error) {
    console.error('[Messages API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

