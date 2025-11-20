/**
 * Feature: AI Chat Streaming Route (Refactored - Microservices)
 * Purpose: Thin orchestrator delegating to service layer
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/streaming
 *  - Microservices Architecture: /micro.plan.md
 *  - Original: app/api/v1/chat/route.ts (1410 lines)
 *  - Refactored: ~200 lines (85% reduction)
 */

import { 
  convertToModelMessages, 
  streamText, 
  createIdGenerator, 
  safeValidateUIMessages,
  NoSuchToolError,
  InvalidToolInputError,
  ToolCallRepairError,
  type UIMessage,
  type Tool,
} from 'ai';
// Sanitizer removed - AI SDK v5 handles validation via safeValidateUIMessages
import { getModel } from '@/lib/ai/gateway-provider';
import { messageStore } from '@/lib/services/message-store';
import { conversationManager } from '@/lib/services/conversation-manager';
import { createServerClient } from '@/lib/supabase/server';

// Import microservices
import { systemPromptService } from '@/lib/ai/services/system-prompt-service';
import { toolRegistryService } from '@/lib/ai/services/tool-registry-service';
import { metadataService } from '@/lib/ai/services/metadata-service';
import { contextBuilderService } from '@/lib/ai/services/context-builder-service';
import { autoSummarizeIfNeeded } from '@/lib/ai/summarization';

export const maxDuration = 30;

/**
 * UUID validation helper
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Refactored Chat Route - Thin Orchestrator Pattern
 * 
 * This route is now ~200 lines (vs 1410 original) - 85% reduction
 * All business logic extracted to services:
 * - systemPromptService: Builds goal/step/mode-aware prompts
 * - toolRegistryService: Manages tool loading and locking
 * - metadataService: Parses request metadata
 * - contextBuilderService: Builds AI context (metrics, offer, etc.)
 * - finishHandlerService: Handles message persistence
 */
export async function POST(req: Request) {
  // 1. Authenticate user
  const supabase = await createServerClient();
  const { data: { user: cookieUser } } = await supabase.auth.getUser();

  let user = cookieUser;

  if (!user) {
    // Try bearer token fallback
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') 
      ? authHeader.slice(7).trim() 
      : undefined;
    
    if (bearer) {
      const { data } = await supabase.auth.getUser(bearer);
      user = data.user;
      if (!user) {
        return new Response('Unauthorized', { status: 401 });
      }
    } else {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  // 2. Apply rate limiting (20 req/min for chat)
  try {
    const { checkRateLimit } = await import('@/app/api/v1/_middleware');
    await checkRateLimit(user.id, '/api/v1/chat', 20);
  } catch (rateLimitError) {
    if (rateLimitError instanceof Error && rateLimitError.message.includes('Rate limit')) {
      return new Response('Rate limit exceeded. Please wait before sending more messages.', { status: 429 });
    }
  }

  // 2. Parse request
  const { message, id, model } = await req.json();
  
  console.log(`[API] Incoming message:`, {
    id: message?.id,
    role: message?.role,
    hasMetadata: !!message?.metadata,
  });

  // 3. Parse metadata using service
  const parsed = metadataService.parseMessageMetadata(message || {});
  console.log(`[API] Parsed metadata:`, {
    activeTab: parsed.activeTab,
    isEditMode: parsed.isEditMode,
    isLocationSetupMode: parsed.isLocationSetupMode,
    locationInput: parsed.locationInput,
    locationMode: parsed.locationMode,
    currentStep: parsed.currentStep,
  });

  // ✅ Validation check
  if (parsed.isLocationSetupMode && !parsed.locationInput) {
    console.warn('[API] ⚠️ Location setup mode active but no locationInput provided!');
  }

  // 4. Get or create conversation
  let conversationId = id;
  let conversation = null;

  console.log(`[API] Resolving conversation ID:`, id);

  if (id && isValidUUID(id)) {
    // Try to get existing conversation
    conversation = await conversationManager.getConversation(id);
    
    // If not found, check if it's a campaign ID
    if (!conversation && user) {
      conversation = await conversationManager.getOrCreateForCampaign(user.id, id);
      conversationId = conversation.id;
    }
  } else if (parsed.campaignId && isValidUUID(parsed.campaignId) && user) {
    // AI SDK generated ID - use campaign ID from metadata
    conversation = await conversationManager.getOrCreateForCampaign(
      user.id,
      parsed.campaignId
    );
    conversationId = conversation.id;
  } else {
    console.error(`[API] No valid conversation or campaign ID found`);
    return new Response(
      JSON.stringify({ error: 'Campaign ID required for new conversations' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 5. Extract goal from conversation or message
  const conversationMeta = conversation?.metadata as Record<string, unknown> | null;
  const conversationGoal = conversationMeta && typeof conversationMeta.current_goal === 'string'
    ? conversationMeta.current_goal as 'leads' | 'calls' | 'website-visits'
    : null;
  const effectiveGoal = conversationGoal || (parsed.goalType as 'leads' | 'calls' | 'website-visits' | null) || null;
  
  console.log(`[API] Effective goal:`, effectiveGoal);

  // 6. Build context using service
  const context = await contextBuilderService.buildContext({
    conversation,
    parsed,
    goalType: effectiveGoal,
  });

  // 7. Build reference context for editing
  const referenceContext = parsed.editingReference
    ? metadataService.buildReferenceContext(parsed.editingReference)
    : '';

  // 8. Build system prompt using service
  const systemPrompt = systemPromptService.buildPrompt({
    goal: effectiveGoal,
    currentStep: parsed.currentStep,
    activeTab: parsed.activeTab,
    isEditMode: parsed.isEditMode,
    isLocationSetupMode: parsed.isLocationSetupMode,
    locationInput: parsed.locationInput,
    referenceContext,
    resultsContext: context.resultsContext,
    offerContext: context.offerContext,
    planContext: context.planContext,
  });

  // 9. Get tools using service (with context-based filtering/locking)
  const tools = toolRegistryService.getTools({
    currentStep: parsed.currentStep,
    isEditMode: parsed.isEditMode,
    editingReference: parsed.editingReference,
  });

  // 10. Load and validate messages
  const previousMessages = await messageStore.loadMessages(conversationId, { limit: 80 });
  const allMessages = [...previousMessages, message];
  
  console.log(`[API] Total messages: ${allMessages.length}`);

  let validatedMessages: UIMessage[];
  try {
    // Use messages directly - AI SDK v5 validates structure
    const validationResult = await safeValidateUIMessages({
      messages: allMessages,
      tools: tools as unknown as Record<string, Tool<unknown, unknown>>,
    });

    if (validationResult.success) {
      validatedMessages = validationResult.data;
      console.log(`[API] ✅ Validated ${validatedMessages.length} messages`);
    } else {
      console.error('[API] ❌ Message validation failed:', validationResult.error);
      validatedMessages = [message];
    }
  } catch (err) {
    console.error('[API] ❌ Validation threw:', err);
    validatedMessages = [message];
  }

  // 11. Stream AI response
  const isOpenAIReasoningModel = typeof model === 'string' && 
    (model.includes('o1-preview') || model.includes('o1-mini'));

  const result = streamText({
    model: getModel(model || 'openai/gpt-4o'),
    messages: convertToModelMessages(validatedMessages),
    system: systemPrompt,
    tools,
    
    // Provider-specific options
    ...(isOpenAIReasoningModel && {
      providerOptions: {
        openai: {
          reasoningEffort: 'high',
          reasoningSummary: 'detailed',
        },
      },
    }),

    // Error handling
    onError: (error) => {
      if (NoSuchToolError.isInstance(error)) {
        console.error('[STREAM] NoSuchToolError:', error.message);
      } else if (InvalidToolInputError.isInstance(error)) {
        console.error('[STREAM] InvalidToolInputError:', error.message);
      } else if (ToolCallRepairError.isInstance(error)) {
        console.error('[STREAM] ToolCallRepairError:', error.message);
      } else {
        console.error('[STREAM] Unknown error:', error);
      }
    },
  });

  // 🔥 FIX #1: Add consumeStream() to ensure onFinish runs even on client disconnect
  // Per docs: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence#handling-client-disconnects
  // This ensures the stream continues processing independently of the client connection
  result.consumeStream();

  // 12. Return streaming response with proper onFinish
  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    sendSources: true,
    sendReasoning: true,
    generateMessageId: createIdGenerator({
      prefix: 'msg',
      size: 16,
    }),
    
    // 🔥 FIX #2: Move onFinish HERE (correct location per AI SDK v5 docs)
    // This receives the COMPLETE message array including the new assistant response
    // Reference: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
    onFinish: async ({ messages: completeMessages }) => {
      console.log(`[API] ✅ onFinish called with ${completeMessages.length} messages`);
      console.log(`[API] Message roles:`, completeMessages.map(m => ({ id: m.id, role: m.role })));
      
      if (!conversationId) {
        console.warn('[API] ⚠️ No conversation ID, skipping save');
        return;
      }
      
      try {
        // Save all messages (user + assistant response)
        await messageStore.saveMessages(conversationId, completeMessages);
        console.log(`[API] ✅ Successfully saved messages to database`);

        // Auto-generate title if needed
        if (conversation && !conversation.title && completeMessages.length > 0) {
          await conversationManager.autoGenerateTitle(conversationId);
          console.log(`[API] ✅ Generated conversation title`);
        }

        // Auto-summarize if threshold reached (non-blocking)
        autoSummarizeIfNeeded(conversationId).catch(error => {
          console.error('[API] ⚠️ Auto-summarization failed:', error);
        });
      } catch (error) {
        console.error('[API] ❌ Failed to save messages:', error);
        // Don't throw - persistence failure shouldn't break the stream
      }
    },
  });
}
