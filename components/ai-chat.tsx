"use client";

/**
 * Feature: Generation state scoping for overlays
 * Purpose: Limit global generating overlay to active work only so ad-copy selection remains visible when the assistant is idle.
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway (streaming semantics): https://vercel.com/docs/ai-gateway/openai-compat
 *  - Supabase Next.js SSR (state persistence): https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState, useEffect, useMemo, Fragment, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { ThumbsUpIcon, ThumbsDownIcon, CopyIcon, Sparkles, ChevronRight, MapPin, CheckCircle2, XCircle, Reply, X, Check, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import { Actions, Action } from "@/components/ai-elements/actions";
import { DefaultChatTransport, ChatStatus } from "ai";
import { supabase } from "@/lib/supabase/client";
import { generateImage } from "@/server/images";
import { ImageGenerationConfirmation } from "@/components/ai-elements/image-generation-confirmation";
import { ConfirmationCard, SuccessCard } from "@/components/ai-elements/confirmation-card";
import { LocationConfirmationCard } from "@/components/ai-elements/location-confirmation-card";
import { LocationProcessingCard } from "@/components/ai-elements/location-processing-card";
import { LocationSuccessCard } from "@/components/ai-elements/location-success-card";
// Removed legacy FormSelectionUI in favor of unified canvas in Goal step
import { ImageEditProgressLoader } from "@/components/ai-elements/image-edit-progress-loader";
import { renderEditImageResult, renderRegenerateImageResult, renderEditAdCopyResult } from "@/components/ai-elements/tool-renderers";
import { useAdPreview } from "@/lib/context/ad-preview-context";
import { searchLocations, getLocationBoundary } from "@/app/actions/geocoding";
import { searchMetaLocation } from "@/app/actions/meta-location-search";
import { useGoal } from "@/lib/context/goal-context";
import { useLocation } from "@/lib/context/location-context";
import { useDraftAutoSave } from "@/lib/hooks/use-draft-auto-save";
import { AdReferenceCard } from "@/components/ad-reference-card-example";
import { useGeneration } from "@/lib/context/generation-context";
import { emitBrowserEvent } from "@/lib/utils/browser-events";
import { useCampaignContext } from "@/lib/context/campaign-context";
import { toZeroBasedIndex } from "@/lib/utils/variation";

// Type definitions
interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  parts: MessagePart[];
  [key: string]: unknown;
}

// AI SDK v5 Message Metadata interface (for proper typing)
interface MessageMetadata {
  timestamp: string;
  source: 'chat_input' | 'auto_submit' | 'tool_response';
  editMode?: boolean;
  locationSetupMode?: boolean;
  locationInput?: string;
  editingReference?: {
    type?: string;
    variationTitle?: string;
    variationNumber?: number;
    variationIndex?: number;
    format?: 'feed' | 'story' | 'reel';
    imageUrl?: string;
    content?: {
      primaryText?: string;
      headline?: string;
      description?: string;
    };
    gradient?: string;
    editSession?: { sessionId: string; variationIndex: number };
  };
  activeView?: 'home' | 'build' | 'view';
}

interface LocationInput {
  name: string;
  coordinates?: [number, number];
  radius?: number;
  type: 'city' | 'region' | 'country' | 'radius';
  mode: 'include' | 'exclude';
}

interface LocationToolInput {
  locations: LocationInput[];
  explanation?: string;
}

interface LocationOutput {
  name: string;
  type: string;
  mode?: string;
  radius?: number;
}

interface GoalToolInput {
  goalType: string;
  conversionMethod: string;
}

interface CustomEvent<T = unknown> extends Event {
  detail: T;
}

interface EditReferenceContext {
  type?: string;
  variationNumber?: number;
  variationTitle?: string;
  copyNumber?: number;
  format?: 'feed' | 'story' | 'reel';
  gradient?: string;
  imageUrl?: string;
  content?: {
    primaryText?: string;
    headline?: string;
    description?: string;
  };
  preview?: {
    brandName?: string;
    headline?: string;
    body?: string;
    gradient?: string;
    imageUrl?: string;
    dimensions?: {
      width: number;
      height: number;
      aspect: string;
    };
  };
  variationIndex?: number;
  editSession?: { sessionId: string; variationIndex: number };
}

interface ToolResult {
  tool: string;
  toolCallId: string;
  output: string | object | undefined;  // Allow objects for complex tool results
  errorText?: string;
}

interface AIChatProps {
  campaignId?: string;
  conversationId?: string | null;  // Campaign-level conversation ID (persists across ads)
  currentAdId?: string;  // Current ad being worked on
  messages?: UIMessage[];  // AI SDK v5 prop name
  campaignMetadata?: {
    initialPrompt?: string;
    initialGoal?: string | null;
  };
  context?: 'build' | 'edit' | 'all-ads' | 'ab-test-builder' | 'results';  // NEW: Context-aware mode
  currentStep?: string;  // Current step ID from Campaign Stepper
}

const AIChat = ({ campaignId, conversationId, currentAdId, messages: initialMessages = [], campaignMetadata, context, currentStep }: AIChatProps = {}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNewAd = searchParams.get('newAd') === 'true';
  const [input, setInput] = useState("");
  const [model] = useState<string>("openai/gpt-4o");
  const { campaign } = useCampaignContext();
  const { adContent, setAdContent } = useAdPreview();
  const { goalState, setFormData, setError } = useGoal();
  const { locationState, addLocations, updateStatus: updateLocationStatus, startLocationSetup } = useLocation();
  const { triggerSave } = useDraftAutoSave(campaignId, currentAdId || null, true);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  // removed unused editingImages setter
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  
  // Track dispatched events to prevent duplicates (infinite loop prevention)
  const dispatchedEvents = useRef<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  
  // NEW: Location setup mode flag for enforcing AI tool calling
  const [locationSetupMode, setLocationSetupMode] = useState(false);
  
  // Track processed location tool calls to prevent re-processing
  const processedLocationCalls = useRef<Set<string>>(new Set());
  
  // Helper to check if a tool call already has a result in messages
  const hasToolResult = (toolCallId: string): boolean => {
    for (const msg of messages) {
      const parts = (msg as unknown as { parts?: Array<{ type?: string; toolCallId?: string }> }).parts || [];
      for (const part of parts) {
        if (part.type === 'tool-result' && part.toolCallId === toolCallId) {
          return true;
        }
      }
    }
    return false;
  };
  
  const [adEditReference, setAdEditReference] = useState<EditReferenceContext | null>(null);
  const [activeEditSession, setActiveEditSession] = useState<{ sessionId: string; variationIndex: number } | null>(null);
  const [customPlaceholder, setCustomPlaceholder] = useState("Type your message...");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Update placeholder based on context mode
  useEffect(() => {
    if (!context) {
      setCustomPlaceholder('What would you like to do with your campaign?');
      return;
    }
    
    switch (context) {
      case 'build':
        setCustomPlaceholder('Describe your ad creative or ask for suggestions…');
        break;
      case 'edit':
        setCustomPlaceholder('How would you like to modify this ad?');
        break;
      case 'all-ads':
        setCustomPlaceholder('Ask how your ads are performing or request optimization tips…');
        break;
      case 'results':
        setCustomPlaceholder('What insights can I provide about this ad?');
        break;
      case 'ab-test-builder':
        setCustomPlaceholder('Ask for help setting up your A/B test…');
        break;
      default:
        setCustomPlaceholder('Type your message...');
    }
  }, [context]);
  
  // Keep latest Authorization header (Bearer <token>) in a ref for sync headers
  const authHeaderRef = useRef<string | null>(null);
  const { setIsGenerating, setGenerationMessage, generationMessage } = useGeneration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Extract goal from campaign metadata for context enrichment
  const goalType = campaignMetadata?.initialGoal || goalState?.selectedGoal || null;

  // Reset AI chat local state when conversation ID changes (new ad creation)
  useEffect(() => {
    // Check if this is a new temporary conversation (created for new ad)
    if (conversationId?.startsWith('conv_')) {
      
      // Clear generation states
      setGeneratingImages(new Set())
      setIsGenerating(false)
      setGenerationMessage('')
      
      // Clear edit sessions and contexts
      setActiveEditSession(null)
      setAdEditReference(null)
      
      // Reset placeholder to build mode default
      setCustomPlaceholder('Describe your ad creative or ask for suggestions…')
    }
  }, [conversationId, setIsGenerating, setGenerationMessage]);

  // Load current session token and subscribe to auth changes
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const token = data.session?.access_token;
      authHeaderRef.current = token ? `Bearer ${token}` : null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authHeaderRef.current = session?.access_token ? `Bearer ${session.access_token}` : null;
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);
  
  // AI SDK Native Pattern: Use stable conversationId from server
  // This prevents ID changes that would cause useChat to reset
  // Priority: conversationId from server > campaign.conversationId > campaignId
  const chatId = conversationId || campaign?.conversationId || campaignId;
  
  // Simple transport following AI SDK pattern
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers: () => {
          const headers: Record<string, string> = {};
          if (authHeaderRef.current) headers.Authorization = authHeaderRef.current;
          return headers;
        },
        prepareSendMessagesRequest({ messages, id }) {
          const lastMessage = messages[messages.length - 1];
          
          // Enrich message metadata with goal context (AI SDK v5 pattern)
          const existingMetaUnknown = (lastMessage as { metadata?: unknown }).metadata;
          const existingMeta =
            existingMetaUnknown && typeof existingMetaUnknown === 'object'
              ? (existingMetaUnknown as Record<string, unknown>)
              : undefined;
          const enrichedMessage = {
            ...lastMessage,
          metadata: {
            ...(existingMeta || {}),
            campaignId: campaignId, // Required for AI SDK-generated conversation IDs
            currentAdId: currentAdId, // Current ad being worked on (campaign-level chat context)
            goalType: goalType,
            currentStep: currentStep || 'ads', // Current step ID for step-aware AI behavior (defaults to 'ads' for creative generation)
          },
        };
        
        // DEBUG: Log what we're sending (AI SDK v5 pattern - metadata field)
          
          return {
            body: {
              message: enrichedMessage,
              id,
              model: model,
            },
        };
      },
    }),
  [model, goalType, currentStep]
);
  

  // Simple useChat initialization - AI SDK native pattern (following docs exactly)
  // Uses conversationId for proper AI SDK conversation history
  const chatHelpers = useChat({
    id: chatId, // Use conversationId (or campaignId for backward compat)
    messages: initialMessages,  // AI SDK v5 prop name
    transport,
  });
  
  const { messages, sendMessage, addToolResult, status, stop, setMessages } = chatHelpers as {
    messages: UIMessage[];
    sendMessage: (input: { text?: string; files?: File[]; metadata?: Record<string, unknown> }) => void;
    addToolResult: (r: { tool: string; toolCallId: string; output?: unknown; errorText?: string }) => void;
    status: 'idle' | 'streaming' | 'submitted';
    stop: () => void;
    setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void;
  };


  // Store latest sendMessage in ref (doesn't cause re-renders)
  const sendMessageRef = useRef(sendMessage);
  
  // Update ref when sendMessage changes (no deps needed elsewhere)
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // Process location tool call (stable function with proper dependencies)
  const processLocationToolCall = useCallback(async (
    toolCallId: string,
    input: LocationToolInput
  ) => {
    // Skip if already processed
    if (processedLocationCalls.current.has(toolCallId)) {
      return;
    }
    
    // Mark as processing immediately
    processedLocationCalls.current.add(toolCallId);
    
    try {
      updateLocationStatus('setup-in-progress');
      
      // Geocode all locations
      const processed = await Promise.all(
        input.locations.map(async (loc) => {
          // Step 1: Geocoding
          const geoResult = await searchLocations(loc.name);
          
          if (!geoResult.success || !geoResult.data) {
            console.error(`Failed to geocode: ${loc.name}`, geoResult.error);
            return null;
          }
          
          const { place_name, center, bbox } = geoResult.data as {
            place_name: string;
            center: [number, number];
            bbox?: [number, number, number, number];
          };
          
          // Step 2: Boundary fetching
          let geometry = undefined;
          if (loc.type !== 'radius') {
            try {
              const boundaryData = await getLocationBoundary(center, place_name);
              
              if (boundaryData && boundaryData.geometry) {
                geometry = boundaryData.geometry;
              }
            } catch (error) {
              console.error(`Error fetching boundary for: ${place_name}`, error);
            }
          }
          
          // Step 3: Meta key lookup
          const metaType = loc.type === 'radius' ? 'city' : loc.type;
          const metaResult = await searchMetaLocation(place_name, center, metaType);
          
          // Step 4: Build final location object
          return {
            id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: place_name,
            coordinates: center,
            radius: loc.radius || 30,
            type: loc.type,
            mode: loc.mode,
            bbox: bbox || undefined,
            geometry,
            key: metaResult?.key,
            country_code: metaResult?.country_code,
          };
        })
      );
      
      const validLocations = processed.filter((loc): loc is NonNullable<typeof loc> => loc !== null);
      
      if (validLocations.length === 0) {
        throw new Error('Failed to geocode locations');
      }
      
      // Update context (triggers map update via React state flow) with error handling
      try {
        await addLocations(validLocations, true); // true = ADD mode (merge with existing)
        updateLocationStatus('completed');
        
        // Trigger immediate autosave after adding locations
        console.log('[LocationProcessor] Triggering autosave...');
        await triggerSave(true);
        console.log('[LocationProcessor] ✅ Autosave completed');
        
        // Show success toast
        const locationNames = validLocations.map(l => l.name).join(', ');
        toast.success(
          validLocations.length === 1 
            ? `Location set to ${locationNames}` 
            : `Locations set to ${locationNames}`
        );
        
        // Report success to AI
        addToolResult({
          tool: 'locationTargeting',
          toolCallId,
          output: {
            locations: validLocations.map(l => ({
              id: l.id,
              name: l.name,
              type: l.type,
              mode: l.mode,
            })),
            failedCount: input.locations.length - validLocations.length,
          },
        });
      } catch (error) {
        console.error('[LocationProcessor] Failed to add locations:', error);
        updateLocationStatus('error');
        toast.error('Failed to save location data');
        throw error;
      }
      
    } catch (error) {
      console.error('[LocationProcessor] Error:', error);
      
      updateLocationStatus('error');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to set location';
      toast.error(errorMessage);
      
      addToolResult({
        tool: 'locationTargeting',
        toolCallId,
        output: undefined,
        errorText: errorMessage,
      } as ToolResult);
    }
  }, [addLocations, updateLocationStatus, addToolResult, triggerSave]);

  // Alias for backward compatibility with confirmation flow
  const handleLocationTargetingCall = processLocationToolCall;

  // AUTO-SUBMIT INITIAL PROMPT (AI SDK Native Pattern)
  useEffect(() => {
    // Only run once when component mounts with campaign metadata
    if (!campaignId || !campaignMetadata?.initialPrompt) return
    
    // Don't auto-submit if messages already exist
    if (initialMessages.length > 0) {
      return
    }
    
    // Don't auto-submit if already streaming
    if (status === 'streaming') return
    
    // Check if we've already auto-submitted for this campaign
    const autoSubmitKey = `auto-submitted-${campaignId}`
    if (sessionStorage.getItem(autoSubmitKey)) {
      return
    }
    
    // Mark as submitted BEFORE calling sendMessage
    sessionStorage.setItem(autoSubmitKey, 'true')
    
    // Use AI SDK's sendMessage() to submit the message
    sendMessage({
      text: campaignMetadata.initialPrompt,
    })
  }, [campaignId, campaignMetadata, initialMessages.length, status, sendMessage]);

  // REMOVED: Duplicate auto-submit for new ad creation
  // This was causing premature "Generate this ad?" prompts before user could respond
  // The initial prompt auto-submit handles all cases now

  const handleSubmit = (message: PromptInputMessage, e: React.FormEvent) => {
    e.preventDefault();
    
    // If streaming, stop instead of sending
    if (status === 'streaming') {
      stop();
      return;
    }
    
    // Check if we have text or files
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    
    if (!(hasText || hasAttachments)) {
      return;
    }
    
    // Build metadata for message (AI SDK v5 native pattern)
    const messageMetadata: MessageMetadata = {
      timestamp: new Date().toISOString(),
      source: 'chat_input',
    };
    
    // CRITICAL: Inject location setup mode metadata to enforce AI tool calling
    if (locationSetupMode && message.text) {
      messageMetadata.locationSetupMode = true;
      messageMetadata.locationInput = message.text;
      setLocationSetupMode(false); // Clear flag after injecting metadata
    }
    
    if (adEditReference) {
      
      const normalizedIndexForMeta = toZeroBasedIndex({
        variationIndex: (adEditReference as unknown as { variationIndex?: number }).variationIndex,
        variationNumber: (adEditReference as unknown as { variationNumber?: number }).variationNumber,
      });
      messageMetadata.editingReference = {
        ...(adEditReference.type && { type: adEditReference.type }),
        ...(adEditReference.variationTitle && { variationTitle: adEditReference.variationTitle }),
        ...(typeof normalizedIndexForMeta === 'number' && { variationIndex: normalizedIndexForMeta }),
        ...(adEditReference.format && { format: adEditReference.format }),
        ...(adEditReference.imageUrl && { imageUrl: adEditReference.imageUrl }),
        ...(adEditReference.content && { content: adEditReference.content }),
        ...(adEditReference.gradient && { gradient: adEditReference.gradient }),
        ...(activeEditSession?.sessionId && typeof normalizedIndexForMeta === 'number' && {
          editSession: { sessionId: activeEditSession.sessionId, variationIndex: normalizedIndexForMeta }
        })
      };
      messageMetadata.editMode = true;
      
      
      // Set immediate feedback for image edits
      setIsSubmitting(true);
      setIsGenerating(true);
      setGenerationMessage("Editing image...");
    }
    
    // Send the message with metadata (AI SDK v5 native - preserved through entire flow)
    sendMessage({ 
      text: message.text || 'Sent with attachments',
      files: message.files?.map(f => ('file' in f ? (f as { file: File }).file : f as unknown as File)),
      metadata: messageMetadata as unknown as Record<string, unknown>, // ✅ This field is preserved by AI SDK v5
    });
    setInput("");
    
    // Clear the ad edit reference after sending the first edit message
    if (adEditReference) {
      setTimeout(() => {
        setAdEditReference(null);
        setCustomPlaceholder("Type your message...");
      }, 1000);
    }
  };

  const handleLike = (messageId: string) => {
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from disliked if present
        setDislikedMessages(prevDisliked => {
          const newDisliked = new Set(prevDisliked);
          newDisliked.delete(messageId);
          return newDisliked;
        });
      }
      return newSet;
    });
  };

  const handleDislike = (messageId: string) => {
    setDislikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from liked if present
        setLikedMessages(prevLiked => {
          const newLiked = new Set(prevLiked);
          newLiked.delete(messageId);
          return newLiked;
        });
      }
      return newSet;
    });
  };

  const handleCopy = (message: ChatMessage) => {
    const textParts = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
    navigator.clipboard.writeText(textParts);
  };

  const handleImageGeneration = async (toolCallId: string, prompt: string, confirmed: boolean) => {
    if (confirmed) {
      // Add to loading state
      setGeneratingImages(prev => new Set(prev).add(toolCallId));
      
      // Set generation message
      setIsGenerating(true);
      setGenerationMessage("Generating 3 AI-powered creative variations...");
      
      try {
        // Get current ad ID from URL
        // generateImage should ONLY be called when an ad already exists (created by createAd tool)
        const currentAdId = searchParams.get('adId');
        
        if (!currentAdId) {
          console.error('[AIChat] No adId found - generateImage requires existing ad');
          addToolResult({
            tool: 'generateImage',
            toolCallId,
            output: undefined,
            errorText: 'No ad draft found. Please create an ad first.',
          } as ToolResult);
          setIsGenerating(false);
          setGeneratingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(toolCallId);
            return newSet;
          });
          return;
        }
        
        const targetAdId = currentAdId;
        
        // Generate 3 unique AI variations in one call
        setGenerationMessage("Generating 3 AI-powered creative variations...");
        const imageUrls = await generateImage(prompt, campaignId, 3);
        
        
        // Set all 3 variations immediately
        const newContent = {
          headline: adContent?.headline || '',
          body: adContent?.body || '',
          cta: adContent?.cta || 'Learn More',
          baseImageUrl: imageUrls[0],
          imageVariations: imageUrls, // All 3 URLs
        };
        
        setAdContent(newContent);
        
        // Save to ad's snapshot if we have a targetAdId
        if (targetAdId && campaignId) {
          setGenerationMessage("Saving creative to ad...");
          
          try {
            await fetch(`/api/campaigns/${campaignId}/ads/${targetAdId}/snapshot`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creative: {
                  imageUrl: imageUrls[0],
                  imageVariations: imageUrls,
                  baseImageUrl: imageUrls[0],
                  selectedImageIndex: null, // Start with no selection
                  selectedCreativeVariation: null
                }
              })
            });
            
            console.log('[AIChat] Saved creative to ad snapshot:', targetAdId);
          } catch (saveError) {
            console.error('[AIChat] Failed to save to ad snapshot:', saveError);
            // Continue anyway - user can still see the images in memory
          }
        }
        
        // Clear generating state - no navigation needed (already in builder)
        setIsGenerating(false);
        
        console.log('[AIChat] ✅ Generated 3 creative variations for ad:', targetAdId);
        
        addToolResult({
          tool: 'generateImage',
          toolCallId,
          output: {
            success: true,
            variations: imageUrls,
            count: imageUrls.length
          },
        });
      } catch (error) {
        console.error('Image generation error:', error);
        addToolResult({
          tool: 'generateImage',
          toolCallId,
          output: undefined,
          errorText: 'Failed to generate images',
        } as ToolResult);
        // Clear generating state on error
        setIsGenerating(false);
      } finally {
        // Remove from loading state
        setGeneratingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(toolCallId);
          return newSet;
        });
        // Don't call setIsGenerating(false) here - handled in navigation flow or error handler
      }
    } else {
      // User cancelled - send cancellation result
      // The AI will respond with text confirmation
      addToolResult({
        tool: 'generateImage',
        toolCallId,
        output: {
          cancelled: true,
          message: 'User cancelled the image generation'
        },
      } as ToolResult);
    }
  };

  // Listen for goal setup trigger from canvas
  useEffect(() => {
    const handleGoalSetup = (event: CustomEvent<{ goalType: string }>) => {
      const { goalType } = event.detail;
      
      sendMessageRef.current({
        text: `I want to set up ${goalType} goal with instant forms`,
      });
    };

    window.addEventListener('triggerGoalSetup', handleGoalSetup as EventListener);
    return () => window.removeEventListener('triggerGoalSetup', handleGoalSetup as EventListener);
  }, []);

  // NEW: Handle location setup requests from canvas
  useEffect(() => {
    const handleLocationSetupRequest = () => {
      try {
        // Validate via context (throws if no ad)
        startLocationSetup()
        
        // Stop AI if busy (interrupt)
        if (status === 'streaming' || status === 'submitted') {
          stop()
        }
        
        // Set flag to enforce tool calling
        setLocationSetupMode(true)
        
        // Ask location question
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: `location-setup-${Date.now()}`,
            role: 'assistant',
            parts: [
              {
                type: 'text',
                text: 'What location would you like to target?'
              }
            ]
          } as UIMessage
        ]);
        
      } catch (error) {
        // Error already handled by context (throws if no ad)
        toast.error(error instanceof Error ? error.message : 'Cannot set up location')
      }
    };

    window.addEventListener('requestLocationSetup', handleLocationSetupRequest);
    return () => window.removeEventListener('requestLocationSetup', handleLocationSetupRequest);
  }, [status, startLocationSetup, stop, setMessages]);

  // Process location tool calls (one-time processing with idempotency)
  useEffect(() => {
    messages.forEach((msg) => {
      const parts = (msg as { parts?: MessagePart[] }).parts || [];

      parts.forEach((part) => {
        if (
          part.type === 'tool-call' &&
          (part as { toolName?: string }).toolName === 'locationTargeting'
        ) {
          const callId = (part as { toolCallId?: string }).toolCallId;
          const input = (part as { input?: LocationToolInput }).input;

          // RELAXED DETECTION: Process if has callId and input, regardless of state
          // Only check idempotency via processedLocationCalls ref
          if (
            callId &&
            input &&
            !processedLocationCalls.current.has(callId)
          ) {
            processLocationToolCall(callId, input);
          }
        }
      });
    });
  }, [messages, processLocationToolCall]);

  // Listen for ad edit events from preview panel
  useEffect(() => {
    const handleOpenEditInChat = (event: CustomEvent<EditReferenceContext>) => {
      const context = event.detail;
      
      // Store as ad edit reference (for ad copy/creative) with normalized index
        const normalizedIndex = toZeroBasedIndex({
          variationIndex: (context as unknown as { variationIndex?: number }).variationIndex,
          variationNumber: (context as unknown as { variationNumber?: number }).variationNumber,
        });
        setAdEditReference({
          ...context,
          variationIndex: normalizedIndex,
        } as unknown as EditReferenceContext);
        if ((context as unknown as { editSession?: { sessionId?: string } }).editSession?.sessionId && typeof normalizedIndex === 'number') {
          setActiveEditSession({ sessionId: (context as unknown as { editSession?: { sessionId?: string } }).editSession!.sessionId!, variationIndex: normalizedIndex });
        }
        setCustomPlaceholder(`Describe the changes you'd like to make to ${context.variationTitle}...`);
      
      // Focus chat input
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    };

    const handleSendMessageToAI = (event: CustomEvent<{ message: string; reference?: { action?: string } }>) => {
      const { message, reference } = event.detail;
      
      // Only used for other purposes, not for edit button
      // Edit button only uses openEditInChat event
      if (message && !reference?.action) {
        sendMessageRef.current({ text: message });
      }
    };

    window.addEventListener('openEditInChat', handleOpenEditInChat as EventListener);
    window.addEventListener('sendMessageToAI', handleSendMessageToAI as EventListener);
    
    return () => {
      window.removeEventListener('openEditInChat', handleOpenEditInChat as EventListener);
      window.removeEventListener('sendMessageToAI', handleSendMessageToAI as EventListener);
    };
  }, []);

  // Listen for step navigation to clear editing references
  useEffect(() => {
    const handleStepNavigation = () => {
      // Clear ad edit reference when navigating between steps
      if (adEditReference) {
        setAdEditReference(null);
        setCustomPlaceholder("Type your message...");
      }
    };

    window.addEventListener('stepNavigation', handleStepNavigation);
    
    return () => {
      window.removeEventListener('stepNavigation', handleStepNavigation);
    };
  }, [adEditReference]);

  // Track generation state for showing animations on ad mockups
  useEffect(() => {
    // Check if AI just asked a question (last message is from assistant)
    if (messages.length > 0) {
      
      // Or if AI is actively streaming/processing
      const isActivelyGenerating = status === 'streaming' || status === 'submitted';
      
      // Or if generating images
      const isGeneratingImage = generatingImages.size > 0;
      
      // Or if processing locations
      // Only show global generating overlay during active work; do not block UI when merely awaiting user input
      const shouldShowGenerating = isActivelyGenerating || isGeneratingImage;
      
      setIsGenerating(shouldShowGenerating);
      
      // Set appropriate message
      if (isGeneratingImage) {
        setGenerationMessage("Generating creative...");
      } else if (isActivelyGenerating) {
        setGenerationMessage("AI is thinking...");
      }
    } else {
      setIsGenerating(false);
    }
  }, [messages, status, generatingImages, setIsGenerating, setGenerationMessage]);

  // Deduplicate messages to prevent showing duplicate content
  const deduplicatedMessages = useMemo(() => {
    return messages.filter((msg, index) => {
      // Always keep user messages
      if (msg.role === 'user') return true;
      
      // For assistant messages, check for duplicates
      if (msg.role === 'assistant') {
        const textPart = msg.parts?.find(p => p.type === 'text') as { text?: string } | undefined;
        const textContent = textPart?.text?.trim() || '';
        
        // Skip empty messages
        if (!textContent && (!msg.parts || msg.parts.length === 0)) {
          return false;
        }
        
        // Check if this exact text was in the previous message
        if (index > 0) {
          const prevMsg = messages[index - 1];
          if (prevMsg?.role === 'assistant') {
            const prevTextPart = prevMsg.parts?.find(p => p.type === 'text') as { text?: string } | undefined;
            const prevTextContent = prevTextPart?.text?.trim() || '';
            
            if (textContent === prevTextContent && textContent.length > 0) {
              return false;
            }
          }
        }
      }
      
      return true;
    });
  }, [messages]);

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      
      <Conversation>
        <ConversationContent>
            {deduplicatedMessages.map((message, messageIndex) => {
              const isLastMessage = messageIndex === messages.length - 1;
              const isLiked = likedMessages.has(message.id);
              const isDisliked = dislikedMessages.has(message.id);
              
              return (
                <Fragment key={message.id}>
                  <div>
                    {message.role === "assistant" && (
                      <Sources>
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case "source-url":
                              return (
                                <Fragment key={`${message.id}-${i}`}>
                                  <SourcesTrigger
                                    count={
                                      message.parts.filter(
                                        (part) => part.type === "source-url"
                                      ).length
                                    }
                                  />
                                  <SourcesContent>
                                    <Source
                                      href={part.url}
                                      title={part.url}
                                    />
                                  </SourcesContent>
                                </Fragment>
                              );
                          }
                        })}
                      </Sources>
                    )}
                    <Message from={message.role}>
                      <MessageContent>
                        {(
                          message.parts
                            // Filter out cancelled tool invocations (AI SDK best practice)
                            .filter((part) => {
                              const partAny = part as { type: string; toolCallId?: string; output?: { cancelled?: boolean } };
                              
                              // Hide tool-result parts that indicate cancellation
                              if (part.type === 'tool-result') {
                                const output = partAny.output;
                                if (output && typeof output === 'object' && output.cancelled === true) {
                                  return false; // Don't render cancelled tool results
                                }
                              }
                              
                              // Hide tool-call parts if their corresponding result was cancelled
                              if (part.type === 'tool-call') {
                                const toolCallId = partAny.toolCallId;
                                // Check if there's a cancelled result for this tool call
                                const hasCancelledResult = message.parts.some(p => 
                                  p.type === 'tool-result' && 
                                  'toolCallId' in p && p.toolCallId === toolCallId &&
                                  'output' in p && typeof p.output === 'object' && p.output && 'cancelled' in p.output && (p.output as { cancelled?: boolean }).cancelled === true
                                );
                                if (hasCancelledResult) {
                                  return false; // Don't render tool call if it was cancelled
                                }
                              }
                              
                              return true; // Render all other parts
                            })
                            .map((part, i, allParts) => {
                            switch (part.type) {
                            case "text": {
                                // Suppress assistant text only when there is a rendered tool OUTPUT
                                // Allow text alongside bare tool-call parts (AI SDK v5 generic tool-call)
                                const hasRenderedToolOutput = allParts?.some((p: { type?: string; state?: string }) => {
                                  if (!p || typeof p.type !== 'string') return false;
                                  // Old specific types like tool-xxx with output states
                                  const isSpecificToolOutput = (p.type as string).startsWith('tool-') &&
                                    (p as { state?: string }).state === 'output-available';
                                  // Generic v5 part type
                                  const isGenericToolResult = p.type === 'tool-result';
                                  return isSpecificToolOutput || isGenericToolResult;
                                });
                                if (message.role === 'assistant' && hasRenderedToolOutput) {
                                  return null;
                                }
                                return (
                                  <Response 
                                    key={`${message.id}-${i}`}
                                    isAnimating={status === "streaming" && isLastMessage}
                                  >
                                    {part.text}
                                  </Response>
                                );
                              }
                            case "reasoning":
                              return (
                                <Reasoning
                                  key={`${message.id}-${i}`}
                                  className="w-full"
                                  isStreaming={status === "streaming"}
                                >
                                  <ReasoningTrigger />
                                  <ReasoningContent>{part.text}</ReasoningContent>
                                </Reasoning>
                              );
                            case "tool-call": {
                              // AI SDK v5 generic tool invocation part
                              const callId = (part as unknown as { toolCallId?: string }).toolCallId || `${message.id}-${i}`;
                              const toolName = (part as unknown as { toolName?: string; name?: string }).toolName || (part as unknown as { name?: string }).name || '';
                              const rawInput = (part as unknown as { input?: unknown; args?: unknown; arguments?: unknown }).input ??
                                               (part as unknown as { args?: unknown }).args ??
                                               (part as unknown as { arguments?: unknown }).arguments;

                              // Handle createAd client-side execution
                              if (toolName === 'createAd') {
                                // Show loading state while being processed
                                return (
                                  <div key={callId} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                                    <Loader size={16} />
                                    <span className="text-sm text-muted-foreground">Preparing to create ad...</span>
                                  </div>
                                );
                              }

                              // Unknown tool-call → render nothing (handled by specific tool cases below)
                              return null;
                            }
                            case "tool-result": {
                              // AI SDK v5 generic tool result part
                              const callId = (part as unknown as { toolCallId?: string }).toolCallId || `${message.id}-${i}`;
                              const toolName = (part as unknown as { toolName?: string; name?: string }).toolName || (part as unknown as { name?: string }).name || '';

                              if (toolName === 'locationTargeting') {
                                const output = (part as unknown as { output?: unknown }).output as { 
                                  locations?: LocationOutput[]; 
                                  explanation?: string;
                                  cancelled?: boolean;
                                } | undefined;
                                
                                // Don't show cancelled results
                                if (output?.cancelled) return null;
                                
                                if (!output || !Array.isArray(output.locations) || output.locations.length === 0) {
                                  return null;
                                }

                                return (
                                  <div key={callId} className="w-full my-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <MapPin className="h-4 w-4 text-blue-600" />
                                      <p className="text-sm font-medium">Target Locations</p>
                                      <Badge variant="outline" className="text-xs">{output.locations.length}</Badge>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {output.locations.map((loc, idx: number) => {
                                        const isExcluded = loc.mode === "exclude";
                                        const typeLabel = loc.type === 'radius' && loc.radius 
                                          ? `${loc.radius} mile radius` 
                                          : loc.type === 'city' ? 'City'
                                          : loc.type === 'region' ? 'Province/Region'
                                          : loc.type === 'country' ? 'Country'
                                          : loc.type;
                                        
                                        return (
                                          <button
                                            key={`${callId}-${idx}`}
                                            onClick={() => window.dispatchEvent(new CustomEvent('switchToTab', { detail: { id: 'location' } }))}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                                              isExcluded 
                                                ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" 
                                                : "panel-surface hover:border-blue-500/40"
                                            }`}
                                          >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                              <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                                                isExcluded ? 'bg-red-500/10' : 'bg-green-500/10'
                                              }`}>
                                                {isExcluded ? (
                                                  <X className="h-3.5 w-3.5 text-red-600" />
                                                ) : (
                                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                                )}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{loc.name}</p>
                                                <p className="text-xs text-muted-foreground">{typeLabel}</p>
                                              </div>
                                              {isExcluded && (
                                                <Badge variant="destructive" className="text-[10px] h-5 flex-shrink-0">
                                                  Excluded
                                                </Badge>
                                              )}
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }

                              // Unknown tool result → let specific handlers (below) or default handle it
                              return null;
                            }
                            case "tool-createAd": {
                              const callId = part.toolCallId;
                              const input = part.input as { confirmationMessage?: string };
                              
                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Preparing...</div>;
                                
                                case 'input-available':
                                  return (
                                    <ConfirmationCard
                                      key={callId}
                                      title="Create New Ad?"
                                      message={input.confirmationMessage || "This will open Ad Builder and create a new ad draft. Any unsaved changes will be lost."}
                                      variant={context === 'build' ? 'warning' : 'default'}
                                      onConfirm={async () => {
                                        try {
                                          // Create draft ad
                                          const response = await fetch(`/api/campaigns/${campaignId}/ads/draft`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                          });
                                          
                                          if (!response.ok) {
                                            throw new Error('Failed to create draft ad');
                                          }
                                          
                                          const data = await response.json();
                                          const newAdId = data.ad.id;
                                          
                                          // Navigate to Ad Builder
                                          router.push(`/${campaignId}?view=build&adId=${newAdId}&step=creative`);
                                          
                                          // Send success result
                                          addToolResult({
                                            tool: 'createAd',
                                            toolCallId: callId,
                                            output: {
                                              success: true,
                                              adId: newAdId,
                                              message: 'Ad Builder opened - start with Step 1: Creative'
                                            },
                                          });
                                        } catch (error) {
                                          console.error('Failed to create ad:', error);
                                          addToolResult({
                                            tool: 'createAd',
                                            toolCallId: callId,
                                            output: undefined,
                                            errorText: 'Failed to create ad draft',
                                          } as ToolResult);
                                        }
                                      }}
                                      onCancel={() => {
                                        // Send cancellation result
                                        addToolResult({
                                          tool: 'createAd',
                                          toolCallId: callId,
                                          output: {
                                            cancelled: true,
                                            message: 'User cancelled ad creation'
                                          },
                                        });
                                      }}
                                    />
                                  );
                                
                                case 'output-available': {
                                  const output = part.output as { success?: boolean; cancelled?: boolean; message?: string };
                                  
                                  // Don't show anything if cancelled
                                  if (output?.cancelled) {
                                    return null;
                                  }
                                  
                                  // Show success message
                                  if (output?.success) {
                                    return (
                                      <SuccessCard
                                        key={callId}
                                        message={output.message || "Ad Builder opened - start with Step 1: Creative"}
                                      />
                                    );
                                  }
                                  
                                  return null;
                                }
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive border border-destructive/50 rounded-lg p-4 my-2">
                                      <p className="font-medium mb-1">Failed to Create Ad</p>
                                      <p className="text-xs">{part.errorText}</p>
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                            case "tool-generateImage": {
                              const callId = part.toolCallId;
                              const isGenerating = generatingImages.has(callId);
                              const input = part.input as { prompt: string; brandName?: string; caption?: string };
                              
                              // 🚨 CRITICAL: Prevent showing generateImage tool UI on non-ads steps
                              // Only show confirmation UI if we're on the 'ads' step OR if the tool is already generating
                              // This prevents stale tool calls from previous steps from showing up
                              if (part.state === 'input-available' && !isGenerating && currentStep !== 'ads') {
                                console.log(`[AIChat] Skipping generateImage UI - current step is '${currentStep}', not 'ads'`);
                                return null;
                              }
                              
                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Preparing...</div>;
                                
                                case 'input-available':
                                  // Show native Loader when generating
                                  if (isGenerating) {
                                    return (
                                      <div key={callId} className="flex flex-col items-center gap-3 justify-center p-6 my-2 border rounded-lg bg-card max-w-md mx-auto">
                                        <div className="relative">
                                          <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
                                          <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-transparent border-r-blue-300 animate-spin" style={{ animationDelay: '150ms' }} />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="text-sm font-medium text-foreground">{generationMessage}</span>
                                          <div className="flex gap-1">
                                            <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <ImageGenerationConfirmation
                                      key={callId}
                                      prompt={input.prompt}
                                      isGenerating={isGenerating}
                                      onConfirm={(editedPrompt) => handleImageGeneration(callId, editedPrompt, true)}
                                      onCancel={() => handleImageGeneration(callId, input.prompt, false)}
                                    />
                                  );
                                
                                case 'output-available': {
                                  const output = part.output as { success?: boolean; variations?: string[]; count?: number; cancelled?: boolean };
                                  
                                  // Don't show anything if cancelled
                                  if (output?.cancelled) {
                                    return null;
                                  }
                                  
                                  // Only show success if we actually have generated images
                                  if (output?.success && output?.variations && output.variations.length > 0) {
                                    return (
                                      <div key={callId} className="border rounded-lg p-4 my-2 bg-green-500/5 border-green-500/30 max-w-md mx-auto">
                                        <div className="flex items-center gap-2 mb-2">
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                          <p className="font-medium text-green-600">✨ 3 creative variations generated!</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          Pick your favorite on the canvas →
                                        </p>
                                      </div>
                                    );
                                  }
                                  
                                  // If output exists but no variations yet, don't show anything (still processing)
                                  return null;
                                }
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive border border-destructive/50 rounded-lg p-4 my-2">
                                      <p className="font-medium mb-1">Generation Failed</p>
                                      <p className="text-xs">{part.errorText}</p>
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                            case "tool-editImage": {
                              const callId = part.toolCallId;
                              const input = part.input as { imageUrl?: string; variationIndex?: number; prompt?: string };
                              
                              const hasOutput = typeof (part as { output?: unknown }).output !== 'undefined';
                              const hasResult = typeof (part as { result?: unknown }).result !== 'undefined';
                              
                              switch (part.state) {
                                case 'input-streaming':
                                case 'input-available':
                                  // Server-side execution - keep animated progress loader visible until output arrives
                                  return <ImageEditProgressLoader key={callId} type="edit" />;
                                
                                case 'output-available': {
                                  // AI SDK v5: Server-executed tools might use 'result' instead of 'output'
                                  const output = ((part as unknown as { output?: unknown; result?: unknown }).output || (part as unknown as { output?: unknown; result?: unknown }).result) as { 
                                    success?: boolean; 
                                    editedImageUrl?: string; 
                                    variationIndex?: number; 
                                    error?: string 
                                  };
                                  
                                  // DEBUG: Log the entire output to see what we're receiving
                                  
                                  // Reset submitting state
                                  if (isSubmitting) {
                                    setTimeout(() => {
                                      setIsSubmitting(false);
                                      setIsGenerating(false);
                                    }, 0);
                                  }
                                  
                                  if (!output.success || output.error) {
                                    return (
                                      <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                        Error: {output.error || 'Failed to edit image'}
                                      </div>
                                    );
                                  }
                                  
                                  // Dispatch event to update canvas with edited image
                                  // 4-tier fallback strategy for variationIndex (AI SDK pattern)
                                  if (output.editedImageUrl) {
                                    // Determine index strictly from part (result → input). Do NOT use activeEditSession.
                                    const finalVariationIndex = output.variationIndex ?? input.variationIndex;
                                    if (typeof finalVariationIndex === 'number' && finalVariationIndex >= 0) {
                                      const eventKey = `${callId}-${finalVariationIndex}`;
                                      
                                      if (!dispatchedEvents.current.has(eventKey)) {
                                        dispatchedEvents.current.add(eventKey);
                                        
                                        setTimeout(() => {
                                          emitBrowserEvent('imageEdited', { 
                                            sessionId: (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).output?.sessionId || (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).result?.sessionId,
                                            variationIndex: finalVariationIndex,
                                            newImageUrl: output.editedImageUrl 
                                          });
                                        }, 0);
                                      }
                                    } else {
                                      console.error(`[EDIT-COMPLETE] ❌ Could not determine variationIndex for canvas update`);
                                    }
                                  }
                                  
                                  // Centralized renderer: success card + one-liner + mockup preview
                                  return renderEditImageResult({
                                    callId,
                                    keyId: `${callId}-output-available`,
                                    input,
                                    output,
                                    isSubmitting,
                                  });
                                }
                                
                                case 'output-error':
                                  // Reset submitting state on error
                                  if (isSubmitting) {
                                    setTimeout(() => {
                                      setIsSubmitting(false);
                                      setIsGenerating(false);
                                    }, 0);
                                  }
                                  
                                  return (
                                    <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                      Error: {part.errorText || 'Failed to edit image'}
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                            case "tool-regenerateImage": {
                              const callId = part.toolCallId;
                              const input = part.input as { variationIndex?: number };
                              
                              // DEBUG: Log all states to see execution flow
                              const hasOutput2 = typeof (part as { output?: unknown }).output !== 'undefined';
                              const hasResult2 = typeof (part as { result?: unknown }).result !== 'undefined';
                              
                              switch (part.state) {
                                case 'input-streaming':
                                case 'input-available':
                                  // Server-side execution - keep animated progress loader visible until output arrives
                                  return <ImageEditProgressLoader key={callId} type="regenerate" />;
                                
                                case 'output-available': {
                                  // AI SDK v5: Server-executed tools might use 'result' instead of 'output'
                                  const output = ((part as unknown as { output?: unknown; result?: unknown }).output || (part as unknown as { output?: unknown; result?: unknown }).result) as { 
                                    success?: boolean; 
                                    imageUrl?: string; 
                                    imageUrls?: string[]; 
                                    variationIndex?: number; 
                                    count?: number; 
                                    error?: string 
                                  };
                                  
                                  // DEBUG: Log the entire output to see what we're receiving
                                  
                                  // Reset submitting state
                                  if (isSubmitting) {
                                    setTimeout(() => {
                                      setIsSubmitting(false);
                                      setIsGenerating(false);
                                    }, 0);
                                  }
                                  
                                  if (!output.success || output.error) {
                                    return (
                                      <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                        Error: {output.error || 'Failed to regenerate image'}
                                      </div>
                                    );
                                  }
                                  
                                  // Handle single variation regeneration (edit mode)
                                  // 4-tier fallback strategy for variationIndex (AI SDK pattern)
                                  if (output.imageUrl) {
                                    const finalVariationIndex = output.variationIndex ?? input.variationIndex;
                                    if (typeof finalVariationIndex === 'number' && finalVariationIndex >= 0) {
                                      const eventKey = `${callId}-regen-${finalVariationIndex}`;
                                      if (!dispatchedEvents.current.has(eventKey)) {
                                        dispatchedEvents.current.add(eventKey);
                                        setTimeout(() => {
                                          emitBrowserEvent('imageEdited', {
                                            sessionId: (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).output?.sessionId || (part as unknown as { output?: { sessionId?: string }; result?: { sessionId?: string } }).result?.sessionId,
                                            variationIndex: finalVariationIndex,
                                            newImageUrl: output.imageUrl,
                                          });
                                        }, 0);
                                      }
                                      return renderRegenerateImageResult({ callId, keyId: `${callId}-regen-output`, output });
                                    } else {
                                      console.error(`[REGEN-COMPLETE] ❌ Could not determine variationIndex for canvas update`);
                                      return (
                                        <div key={callId} className="border rounded-lg p-3 my-2 bg-yellow-500/5 border-yellow-500/30">
                                          <p className="text-sm text-yellow-600">Image regenerated but couldn&apos;t update canvas position</p>
                                        </div>
                                      );
                                    }
                                  }
                                  
                                  // Handle multiple variations regeneration (batch regeneration)
                                  if (output.imageUrls && output.imageUrls.length > 0) {
                                    // Update ad content with regenerated variations
                                    // This ensures the new images are saved and persist across refreshes
                                    setTimeout(() => {
                                      setAdContent({
                                        headline: adContent?.headline || '',
                                        body: adContent?.body || '',
                                        cta: adContent?.cta || 'Learn More',
                                        imageVariations: output.imageUrls,
                                        baseImageUrl: output.imageUrls![0],
                                      });
                                    }, 0);
                                  
                                    return (
                                      <div key={callId} className="my-4">
                                        <p className="text-sm font-medium text-green-600 mb-3">
                                          ✨ Successfully generated {output.count || output.imageUrls.length} new variations!
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                          {output.imageUrls.map((url, idx) => (
                                            <img
                                              key={`${callId}-${idx}`}
                                              src={url}
                                              alt={`Variation ${idx + 1}`}
                                              className="rounded-lg shadow-md w-full h-auto"
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return null;
                                }
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                      Error: {part.errorText || 'Failed to regenerate images'}
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                          case "tool-editAdCopy": {
                            const callId = part.toolCallId;
                            const input = part.input as { prompt?: string; current?: { primaryText?: string; headline?: string; description?: string } };

                            switch (part.state) {
                              case 'input-streaming':
                              case 'input-available':
                                return <ImageEditProgressLoader key={callId} type="edit" />;
                              case 'output-available': {
                                const output = ((part as unknown as { output?: unknown; result?: unknown }).output || (part as unknown as { output?: unknown; result?: unknown }).result) as { 
                                  success?: boolean;
                                  variationIndex?: number;
                                  copy?: { primaryText: string; headline: string; description: string };
                                  error?: string;
                                };

                                if (isSubmitting) {
                                  setTimeout(() => {
                                    setIsSubmitting(false);
                                    setIsGenerating(false);
                                  }, 0);
                                }

                                if (!output?.success || output?.error) {
                                  return (
                                    <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                      Error: {output?.error || 'Failed to edit ad copy'}
                                    </div>
                                  );
                                }

                                // Dispatch adCopyEdited event
                                if (output.copy && typeof output.variationIndex === 'number') {
                                  const eventKey = `${callId}-${output.variationIndex}`;
                                  if (!dispatchedEvents.current.has(eventKey)) {
                                    dispatchedEvents.current.add(eventKey);
                                    setTimeout(() => {
                                      emitBrowserEvent('adCopyEdited', {
                                        variationIndex: output.variationIndex,
                                        newCopy: output.copy,
                                      });
                                    }, 0);
                                  }
                                }

                                // Resolve the correct image and format to mirror the preview mock-up
                                const variationIndex = output.variationIndex;
                                const resolvedFormat =
                                  (adEditReference as unknown as { format?: 'feed' | 'story' })?.format ?? 'feed';

                                const resolvedImageUrl =
                                  typeof variationIndex === 'number'
                                    ? (adContent?.imageVariations?.[variationIndex] ??
                                       (adEditReference as unknown as { imageUrl?: string })?.imageUrl ??
                                       adContent?.imageUrl)
                                    : (adEditReference as unknown as { imageUrl?: string })?.imageUrl ??
                                      adContent?.imageUrl;

                                return renderEditAdCopyResult({
                                  callId,
                                  keyId: `${callId}-output-available`,
                                  input,
                                  output,
                                  imageUrl: resolvedImageUrl,
                                  format: resolvedFormat,
                                });
                              }
                              case 'output-error':
                                if (isSubmitting) {
                                  setTimeout(() => {
                                    setIsSubmitting(false);
                                    setIsGenerating(false);
                                  }, 0);
                                }
                                return (
                                  <div key={callId} className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg my-2">
                                    Error: {part.errorText || 'Failed to edit ad copy'}
                                  </div>
                                );
                              default:
                                return null;
                            }
                          }
                            case "tool-locationTargeting": {
                              const callId = part.toolCallId;
                              const input = part.input as LocationToolInput;
                              const isProcessing = !processedLocationCalls.current.has(callId);
                              
                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Preparing location setup...</div>;
                                
                                case 'input-available':
                                  // Show confirmation card BEFORE processing
                                  if (isProcessing) {
                                    return (
                                      <LocationConfirmationCard
                                        key={callId}
                                        locations={input.locations}
                                        explanation={input.explanation}
                                        onConfirm={() => {
                                          // Mark as processing
                                          processedLocationCalls.current.add(callId);
                                          // Trigger geocoding
                                          void handleLocationTargetingCall(callId, input);
                                        }}
                                        onCancel={() => {
                                          // Mark as processed to prevent re-render
                                          processedLocationCalls.current.add(callId);
                                          // Send cancellation result
                                          addToolResult({
                                            tool: 'locationTargeting',
                                            toolCallId: callId,
                                            output: {
                                              cancelled: true,
                                              message: 'User cancelled location targeting'
                                            },
                                          });
                                        }}
                                      />
                                    );
                                  }
                                  
                                  // After confirmation, show processing card
                                  return (
                                    <LocationProcessingCard
                                      key={callId}
                                      locationCount={input.locations.length}
                                    />
                                  );
                                
                                case 'output-available': {
                                  const output = part.output as { locations?: unknown[]; cancelled?: boolean };
                                  
                                  // Don't show anything if cancelled
                                  if (output?.cancelled) {
                                    return null;
                                  }
                                  
                                  // Show success card
                                  return (
                                    <LocationSuccessCard
                                      key={callId}
                                      locationCount={output?.locations?.length || 0}
                                      onViewMap={() => {
                                        window.dispatchEvent(new CustomEvent('switchToTab', { detail: { id: 'location' } }));
                                      }}
                                    />
                                  );
                                }
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="border rounded-lg bg-red-500/5 border-red-500/20 p-4 my-3">
                                      <div className="flex items-center gap-3">
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        <div>
                                          <p className="text-sm font-medium text-red-600">Failed to set location</p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {part.errorText || 'Could not geocode location. Please try again.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                
                                default:
                                  return null;
                              }
                            }
                            
                            case "tool-setupGoal": {
                              const callId = part.toolCallId;
                              const input = part.input as GoalToolInput;

                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Setting up goal...</div>;
                                
                                case 'input-available':
                                  // Show interactive form selection UI instead of auto-processing
                                  // Direct users to the unified Goal step canvas instead of duplicating UI here
                                  return (
                                    <div key={callId} className="w-full my-4 space-y-3">
                                      <div className="rounded-lg border panel-surface p-4">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm">
                                            Use the canvas in the Goal step to create or select an Instant Form.
                                          </div>
                                          <button
                                            className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                            onClick={() => emitBrowserEvent('switchToTab', 'goal')}
                                          >
                                            Open Goal
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                
                                case 'output-available': {
                                  const output = part.output as { success?: boolean; formData?: { formId: string } } | undefined;
                                  
                                  // Handle cancellation or no selection (output is undefined or null)
                                  if (!output || output === null) {
                                    // Already reset in onCancel, no need to reset again
                                    return (
                                      <div key={callId} className="border rounded-lg p-4 my-2 bg-red-500/5 border-red-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                          <XCircle className="h-5 w-5 text-red-600" />
                                          <p className="font-medium text-red-600">Goal Setup Cancelled</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Feel free to try again or ask me anything else!</p>
                                      </div>
                                    );
                                  }
                                  
                                  // Update goal context with form data only if successful
                                  // Only update if we haven't already set this form data (prevents re-setting after reset)
                                  if (output.success) {
                                    const currentFormId = goalState.formData?.id;
                                    const newFormId = output.formData?.formId;
                                    
                                    // Only update if:
                                    // 1. We're in setup-in-progress state (actively setting up)
                                    // 2. OR the form is different and we're not in idle/completed state
                                    const isActiveSetup = goalState.status === 'setup-in-progress';
                                    const isNewForm = currentFormId !== newFormId && 
                                                     goalState.status !== 'idle' && 
                                                     goalState.status !== 'completed';
                                    
                                    if (isActiveSetup || isNewForm) {
                                      setTimeout(() => {
                                        setFormData({
                                          id: output.formData?.formId,
                                          name: "New Instant Form",
                                          type: undefined,
                                        });
                                      }, 100);
                                    }
                                  }
                                  
                                  // Show success message
                                  return (
                                    <div key={callId} className="border rounded-lg p-4 my-2 bg-green-500/5 border-green-500/30">
                                      <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <p className="font-medium text-green-600">Goal Setup Complete</p>
                                      </div>
                                      <p className="text-sm text-muted-foreground">Your goal has been set up successfully!</p>
                                    </div>
                                  );
                                }
                                
                                case 'output-error':
                                  // Check if it's a cancellation (not a real error)
                                  const isCancellation = part.errorText?.includes('cancelled');
                                  
                                  // Reset to idle for cancellation, or show error for real errors
                                  if (isCancellation) {
                                    // Already reset in onCancel, no additional action needed
                                  } else {
                                    setTimeout(() => {
                                      setError(part.errorText || "Failed to set up goal");
                                    }, 100);
                                  }
                                  
                                  // Show friendly message for cancellation, error message for real errors
                                  return (
                                    <div key={callId} className={`border rounded-lg p-4 my-2 ${
                                      isCancellation 
                                        ? 'bg-red-500/5 border-red-500/20' 
                                        : 'bg-destructive/5 border-destructive/50'
                                    }`}>
                                      {isCancellation ? (
                                        <>
                                          <div className="flex items-center gap-2 mb-2">
                                            <XCircle className="h-5 w-5 text-red-600" />
                                            <p className="font-medium text-red-600">Goal Setup Cancelled</p>
                                          </div>
                                          <p className="text-sm text-muted-foreground">Feel free to try again or ask me anything else!</p>
                                        </>
                                      ) : (
                                        <p className="text-sm text-destructive font-medium">
                                          {part.errorText || 'Failed to set up goal'}
                                        </p>
                                      )}
                                    </div>
                                  );
                              }
                              break;
                            }
                            case "tool-enableAIAdvantage": {
                              const callId = part.toolCallId;

                              switch (part.state) {
                                case 'input-streaming':
                                  return <div key={callId} className="text-sm text-muted-foreground">Enabling AI Advantage+ targeting...</div>;
                                
                                case 'input-available':
                                case 'output-available':
                                  return null;
                                
                                case 'output-error':
                                  return (
                                    <div key={callId} className="text-sm text-destructive border border-destructive/50 rounded-lg p-4">
                                      {part.errorText || 'Failed to enable AI Advantage+ targeting'}
                                    </div>
                                  );
                              }
                              break;
                            }
                            default:
                              return null;
                          }
                        })
                        )}
                      </MessageContent>
                    </Message>
                  </div>
                  
                  {/* Add Actions after assistant messages */}
                  {message.role === "assistant" && isLastMessage && (
                    <Actions className="ml-14 mt-2">
                      <Action
                        onClick={() => handleCopy(message as unknown as ChatMessage)}
                        label="Copy"
                        tooltip="Copy to clipboard"
                      >
                        <CopyIcon className="size-3" />
                      </Action>
                      <Action
                        onClick={() => handleLike(message.id)}
                        label="Like"
                        tooltip={isLiked ? "Unlike" : "Like"}
                        variant={isLiked ? "default" : "ghost"}
                      >
                        <ThumbsUpIcon className="size-3" />
                      </Action>
                      <Action
                        onClick={() => handleDislike(message.id)}
                        label="Dislike"
                        tooltip={isDisliked ? "Remove dislike" : "Dislike"}
                        variant={isDisliked ? "default" : "ghost"}
                      >
                        <ThumbsDownIcon className="size-3" />
                      </Action>
                    </Actions>
                  )}
                </Fragment>
              );
            })}
            
            {/* Show ad edit reference card if active - appears at bottom after all messages */}
            {adEditReference && (
              <AdReferenceCard 
                reference={adEditReference}
                onDismiss={() => {
                  setAdEditReference(null);
                  setCustomPlaceholder("Type your message...");
                }}
              />
            )}
            
            {status === "submitted" && <Loader />}
          </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="grid shrink-0 gap-4 pt-4">
        <div className="w-full px-4 pb-4">
          <PromptInput 
            onSubmit={handleSubmit}
            multiple
            globalDrop
            accept="image/*"
            maxFiles={5}
            maxFileSize={10 * 1024 * 1024}
            onError={(err) => {
              console.error('File upload error:', err);
            }}
          >
            <PromptInputBody>
              {/* Reference Badge - shows when editing */}
              {adEditReference && (
                <div className="w-full px-3 pt-3 pb-1">
                  <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 w-fit">
                    <Reply className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {`Editing: ${adEditReference.variationTitle}`}
                    </span>
                    <button
                      onClick={() => {
                        setAdEditReference(null);
                        setCustomPlaceholder("Type your message...");
                      }}
                      className="p-0.5 rounded hover:bg-blue-500/10 transition-colors"
                      aria-label="Clear reference"
                      type="button"
                    >
                      <X className="h-3 w-3 text-blue-500" />
                    </button>
                  </div>
                </div>
              )}
              
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                ref={chatInputRef}
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder={customPlaceholder}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit 
                disabled={!input && status !== 'streaming'} 
                status={status as ChatStatus}
                type={status === 'streaming' ? 'button' : 'submit'}
                onClick={status === 'streaming' ? stop : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default AIChat;

