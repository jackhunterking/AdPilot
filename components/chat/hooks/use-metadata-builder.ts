/**
 * Feature: Metadata Builder
 * Purpose: Combine journey-specific metadata into message metadata
 * Microservices: Orchestration logic
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

interface MetadataBuilderProps {
  locationMode?: 'include' | 'exclude';
  locationActive?: boolean;
  editMode?: boolean;
  editReference?: unknown;
}

export function useMetadataBuilder(props: MetadataBuilderProps) {
  const build = (input: string): Record<string, unknown> => {
    const base = {
      timestamp: new Date().toISOString(),
      source: 'chat_input' as const
    };
    
    // Location journey metadata
    if (props.locationActive && input) {
      return {
        ...base,
        locationSetupMode: true,
        locationMode: props.locationMode || 'include',
        locationInput: input
      };
    }
    
    // Edit mode metadata
    if (props.editMode && props.editReference) {
      return {
        ...base,
        editMode: true,
        editingReference: props.editReference
      };
    }
    
    // Default metadata
    return base;
  };
  
  return { build };
}

