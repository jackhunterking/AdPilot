import { supabaseServer } from '@/lib/supabase/server';
import { UIMessage } from 'ai';
// Sanitizer removed - AI SDK v5 manages message structure
import { Dashboard } from '@/components/dashboard';
import type { Database } from '@/lib/supabase/database.types';
import { notFound } from 'next/navigation';

// Database message row type (from generated types)
type MessageRow = Database['public']['Tables']['messages']['Row'];

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Convert DB storage to UIMessage (following AI SDK docs)
// Restores complete UIMessage format from storage
function dbToUIMessage(stored: MessageRow): UIMessage | null {
  // Load parts directly from database - trust AI SDK structure
  const parts = Array.isArray(stored.parts) 
    ? (stored.parts as Array<{ type: string; [k: string]: unknown }>) 
    : [];
  
  if (parts.length === 0) {
    console.error(`[SERVER] Skipping message with empty parts: ${stored.id}`);
    return null;
  }
  
  const uiMessage = {
    id: stored.id,
    role: stored.role,
    parts: parts,
    metadata: stored.metadata || {},
  } as UIMessage;
  
  console.log(`[SERVER] Loaded message ${stored.id}:`, {
    role: uiMessage.role,
    partsCount: uiMessage.parts?.length || 0,
    partTypes: parts.map(p => p.type),
  });
  
  return uiMessage;
}

export default async function CampaignPage({ 
  params 
}: { 
  params: Promise<{ campaignId: string }> 
}) {
  const { campaignId } = await params;
  
  console.log(`[SERVER] Incoming campaignId: ${campaignId}`, {
    timestamp: new Date().toISOString()
  });
  
  // Validate campaign ID format to prevent image requests and invalid IDs from hitting database
  if (!isValidUUID(campaignId)) {
    console.log(`[SERVER] ❌ Invalid campaign ID format (not a UUID): ${campaignId}`);
    notFound();
  }
  
  console.log(`[SERVER] ✅ Valid UUID format, loading campaign data for: ${campaignId}`);
  
  // Load campaign data with ads (no nested creatives until FKs are added)
  // Note: Foreign keys for selected_creative_id don't exist yet
  // TODO: After running SUPABASE_FK_MIGRATION.sql, we can add nested queries
  const { data: campaign, error: campaignError } = await supabaseServer
    .from('campaigns')
    .select(`
      *,
      ads (
        id,
        name,
        status,
        selected_creative_id,
        selected_copy_id,
        destination_type,
        created_at,
        updated_at
      )
    `)
    .eq('id', campaignId)
    .single();
  
  // Check if campaign exists
  if (!campaign || campaignError) {
    console.error(`[SERVER] ❌ Campaign not found or error loading campaign:`, {
      campaignId,
      error: campaignError?.message || 'Campaign is null',
      errorCode: (campaignError as unknown as { code?: string })?.code,
      errorDetails: (campaignError as unknown as { details?: string })?.details,
      timestamp: new Date().toISOString()
    });
    notFound();
  }
  
  console.log(`[SERVER] ✅ Campaign loaded successfully:`, {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    hasInitialGoal: !!campaign.initial_goal,
    adsCount: Array.isArray(campaign.ads) ? campaign.ads.length : 0,
    userId: campaign.user_id,
    timestamp: new Date().toISOString()
  });
  
  // Extract goal and metadata from campaign (new normalized structure)
  const rawInitialPrompt = (campaign?.metadata as unknown as { initialPrompt?: string } | null | undefined)?.initialPrompt;
  const campaignMetadata: { initialGoal: string | null; initialPrompt?: string } = {
    initialGoal: campaign.initial_goal ?? null,
    ...(typeof rawInitialPrompt === 'string' ? { initialPrompt: rawInitialPrompt } : {}),
  };
  
  console.log(`[SERVER] Campaign metadata:`, campaignMetadata);
  
  // Load messages server-side via conversation (correct table)
  // Step 1: Get conversation for this campaign
  const { data: conversation } = await supabaseServer
    .from('conversations')
    .select('id')
    .eq('campaign_id', campaignId)
    .single();
  
  const conversationId = conversation?.id || null;
  
  console.log(`[SERVER] Conversation ID for chat:`, conversationId);
  
  // Step 2: Load messages from that conversation
  let dbMessages: MessageRow[] | null = null;
  let error = null;
  
  if (conversation) {
    const result = await supabaseServer
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('seq', { ascending: true });
    
    dbMessages = (result.data as MessageRow[] | null);
    error = result.error;
  }

  if (error) {
    console.error(`[SERVER] Error loading messages:`, error);
  }

  if (dbMessages && dbMessages.length > 0) {
    console.log(`[SERVER] Found ${dbMessages.length} raw messages in DB`);
    const [first] = dbMessages;
    if (first) {
      console.log(`[SERVER] First message:`, { id: first.id, role: first.role, has_parts: !!first.parts });
    }
  }

  // Convert messages, filter out any broken ones (null return from dbToUIMessage)
  const messages: UIMessage[] = (dbMessages || [])
    .map(dbToUIMessage)
    .filter((msg): msg is UIMessage => msg !== null);
  
  console.log(`[SERVER] Loaded ${messages.length} messages`);

  return (
    <Dashboard 
      messages={messages}
      campaignId={campaignId}
      conversationId={conversationId}
      campaignMetadata={campaignMetadata}
    />
  );
}
