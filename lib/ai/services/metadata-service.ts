/**
 * Feature: Metadata Service
 * Purpose: Parse and build AI context metadata
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Microservices: Extracted from app/api/v1/chat/route.ts
 */

// ============================================================================
// Types
// ============================================================================

export interface MessageMetadata {
  activeTab?: 'setup' | 'results';
  campaignId?: string;
  currentStep?: string;
  goalType?: string;
  editMode?: boolean;
  locationSetupMode?: boolean;
  locationInput?: string;
  locationMode?: 'include' | 'exclude';
  editingReference?: {
    variationIndex?: number;
    imageUrl?: string;
    variationTitle?: string;
    format?: string;
    content?: Record<string, unknown>;
    metadata?: {
      fields?: string[];
    };
    editSession?: {
      sessionId?: string;
    };
  };
}

export interface ParsedMetadata {
  activeTab: 'setup' | 'results';
  isEditMode: boolean;
  isLocationSetupMode: boolean;
  locationInput: string;
  locationMode?: 'include' | 'exclude';
  editingReference?: MessageMetadata['editingReference'];
  currentStep?: string;
  goalType?: string;
  campaignId?: string;
}

// ============================================================================
// Metadata Service
// ============================================================================

export class MetadataService {
  /**
   * Parse metadata from AI SDK message
   */
  parseMessageMetadata(message: { metadata?: unknown; [key: string]: unknown }): ParsedMetadata {
    const metadata = (message.metadata as MessageMetadata) || {};

    return {
      activeTab: metadata.activeTab === 'results' ? 'results' : 'setup',
      isEditMode: Boolean(metadata.editMode),
      isLocationSetupMode: Boolean(metadata.locationSetupMode),
      locationInput: metadata.locationInput || '',
      locationMode: metadata.locationMode,
      editingReference: metadata.editingReference,
      currentStep: metadata.currentStep,
      goalType: metadata.goalType,
      campaignId: metadata.campaignId,
    };
  }

  /**
   * Extract reference context for editing
   */
  buildReferenceContext(editingReference: MessageMetadata['editingReference']): string {
    if (!editingReference) {
      return '';
    }

    let context = `\n\n[USER IS EDITING: ${editingReference.variationTitle}`;
    if (editingReference.format) {
      context += ` (${editingReference.format} format)`;
    }
    context += `]\n`;

    if (editingReference.imageUrl) {
      context += `Image URL: ${editingReference.imageUrl}\n`;
    }

    if (editingReference.variationIndex !== undefined) {
      context += `Variation Index: ${editingReference.variationIndex}\n`;
    }

    if (editingReference.content && typeof editingReference.content === 'object') {
      const content = editingReference.content as { 
        primaryText?: string; 
        headline?: string; 
        description?: string 
      };
      
      context += `Current content:\n`;
      if (content.primaryText) context += `- Primary Text: "${content.primaryText}"\n`;
      if (content.headline) context += `- Headline: "${content.headline}"\n`;
      if (content.description) context += `- Description: "${content.description}"\n`;
    }

    // Determine tool type
    const isCopyEdit = Array.isArray(editingReference.metadata?.fields)
      ? editingReference.metadata.fields.some(f => 
          ['primaryText', 'headline', 'description'].includes(f)
        )
      : Boolean(editingReference.content);

    if (isCopyEdit) {
      context += `\n**You MUST call editCopy tool**\n`;
      context += `Required parameters:\n`;
      context += `- variationIndex: ${editingReference.variationIndex}\n`;
      context += `- current: {primaryText, headline, description} from above\n`;
      context += `- prompt: User's instruction\n`;
    } else {
      context += `\n**You MUST use editVariation or regenerateVariation**\n`;
      context += `Required parameters:\n`;
      context += `- imageUrl: ${editingReference.imageUrl}\n`;
      context += `- variationIndex: ${editingReference.variationIndex}\n`;
    }

    return context;
  }

  /**
   * Build journey metadata from parsed data
   */
  buildJourneyMetadata(parsed: ParsedMetadata): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      activeTab: parsed.activeTab,
    };

    if (parsed.currentStep) {
      metadata.currentStep = parsed.currentStep;
    }

    if (parsed.goalType) {
      metadata.goalType = parsed.goalType;
    }

    if (parsed.campaignId) {
      metadata.campaignId = parsed.campaignId;
    }

    if (parsed.isEditMode) {
      metadata.editMode = true;
    }

    if (parsed.isLocationSetupMode) {
      metadata.locationSetupMode = true;
      metadata.locationInput = parsed.locationInput;
      
      if (parsed.locationMode) {
        metadata.locationMode = parsed.locationMode;
      }
    }

    return metadata;
  }
}

// Export singleton
export const metadataService = new MetadataService();

