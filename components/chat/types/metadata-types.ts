/**
 * Feature: Journey Metadata Types
 * Purpose: Type definitions for journey-specific metadata
 * Microservices: Shared types (minimal shared kernel)
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

// Base metadata (AI SDK v5)
export interface ChatMetadata {
  timestamp: string;
  source: 'chat_input' | 'auto_submit' | 'tool_response';
}

// Location journey metadata
export interface LocationMetadata extends ChatMetadata {
  locationSetupMode: true;
  locationMode: 'include' | 'exclude';  // FIX: Mode explicitly typed
  locationInput: string;
}

// Creative journey metadata
export interface CreativeMetadata extends ChatMetadata {
  editMode?: boolean;
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
  };
}

// Goal journey metadata
export interface GoalMetadata extends ChatMetadata {
  goalSetupMode?: boolean;
  goalType?: string;
}

// Union type for all journey metadata
export type JourneyMetadata = 
  | LocationMetadata 
  | CreativeMetadata 
  | GoalMetadata
  | ChatMetadata;

