/**
 * Feature: Conversations API (v1)
 * Purpose: List and create conversations
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware';
import { conversationManager } from '@/lib/services/conversation-manager';

// GET /api/v1/conversations - List user's conversations
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const campaignId = searchParams.get('campaignId') || undefined;

    // If campaignId specified, verify ownership
    if (campaignId) {
      await requireCampaignOwnership(campaignId, user.id);
    }

    // List conversations using service
    const conversations = await conversationManager.listConversations(user.id, {
      limit,
      offset,
      campaignId,
    });

    return successResponse({ conversations });
  } catch (error) {
    console.error('[GET /api/v1/conversations] Error:', error);
    return errorResponse(error as Error);
  }
}

// POST /api/v1/conversations - Create new conversation
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body: unknown = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body');
    }

    const { campaignId, title, metadata = {} } = body as { 
      campaignId?: string; 
      title?: string; 
      metadata?: Record<string, unknown> 
    };

    // If campaignId specified, verify ownership
    if (campaignId) {
      await requireCampaignOwnership(campaignId, user.id);
    }

    // Create conversation using service
    const conversation = await conversationManager.createConversation(
      user.id,
      campaignId || null,
      {
        title,
        metadata,
      }
    );

    return successResponse({ conversation }, undefined, 201);
  } catch (error) {
    console.error('[POST /api/v1/conversations] Error:', error);
    return errorResponse(error as Error);
  }
}
