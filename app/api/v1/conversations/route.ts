/**
 * Feature: Conversations API
 * Purpose: List and create conversations
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { conversationManager } from '@/lib/services/conversation-manager';

// GET /api/conversations - List user's conversations
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const campaignId = searchParams.get('campaignId') || undefined;

    // List conversations using service
    const conversations = await conversationManager.listConversations(user.id, {
      limit,
      offset,
      campaignId,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[Conversations API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { campaignId, title, metadata = {} } = body;

    // Create conversation using service
    const conversation = await conversationManager.createConversation(
      user.id,
      campaignId || null,
      {
        title,
        metadata,
      }
    );

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('[Conversations API] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

