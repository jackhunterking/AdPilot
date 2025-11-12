/**
 * Feature: Audience State Machine Types
 * Purpose: TypeScript type definitions for XState audience targeting state machine
 * References:
 *  - XState v5: https://stately.ai/docs/xstate
 *  - AI SDK Core: https://sdk.vercel.ai/docs
 */

// ============================================
// State Machine States
// ============================================

export type AudienceMachineState =
  | 'idle'                      // Initial selection screen
  | 'enablingAI'               // AI Advantage+ activation in progress
  | 'aiCompleted'              // AI mode active and complete
  | 'gatheringManualInfo'      // Manual mode - AI asking questions
  | 'generatingManualParams'   // Manual mode - AI generating parameters
  | 'manualRefining'           // Manual mode - user reviewing/editing
  | 'manualCompleted'          // Manual mode active and complete
  | 'switching'                // Mode switch in progress
  | 'error';                   // Error state with recovery options

// ============================================
// Targeting Data Types
// ============================================

export interface TargetingOption {
  id: string;
  name: string;
}

export interface Demographics {
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  languages?: string[];
}

export interface DetailedTargeting {
  interests: TargetingOption[];
  behaviors: TargetingOption[];
  connections: TargetingOption[];
}

// ============================================
// State Machine Context
// ============================================

export interface AudienceMachineContext {
  // Current targeting mode
  mode: 'ai' | 'manual';
  
  // AI Advantage+ flag
  advantage_plus_enabled: boolean;
  
  // Manual targeting data
  description?: string;
  demographics?: Partial<Demographics>;
  detailedTargeting?: Partial<DetailedTargeting>;
  
  // Error handling
  errorMessage?: string;
  
  // Metadata
  metadata: {
    lastModified: string;
    transitionCount: number;
    campaignId?: string;
  };
}

// ============================================
// State Machine Events
// ============================================

export type AudienceMachineEvent =
  | { type: 'SELECT_AI_MODE' }
  | { type: 'SELECT_MANUAL_MODE' }
  | { type: 'SWITCH_TO_AI' }
  | { type: 'SWITCH_TO_MANUAL' }
  | { type: 'AI_ENABLE_SUCCESS' }
  | { type: 'MANUAL_PARAMS_GENERATED'; demographics: Demographics; interests: TargetingOption[]; behaviors: TargetingOption[] }
  | { type: 'MANUAL_PARAMS_CONFIRMED' }
  | { type: 'UPDATE_DEMOGRAPHICS'; demographics: Partial<Demographics> }
  | { type: 'ADD_INTEREST'; interest: TargetingOption }
  | { type: 'REMOVE_INTEREST'; interestId: string }
  | { type: 'ADD_BEHAVIOR'; behavior: TargetingOption }
  | { type: 'REMOVE_BEHAVIOR'; behaviorId: string }
  | { type: 'RETRY_ERROR' }
  | { type: 'RESET' };

// ============================================
// Persistence Types
// ============================================

export interface PersistedAudienceState {
  version: number;
  machineState: AudienceMachineState;
  context: AudienceMachineContext;
  timestamp: string;
}

// ============================================
// Legacy State Types (for migration)
// ============================================

export type LegacyAudienceStatus = 
  | 'idle' 
  | 'generating' 
  | 'gathering-info' 
  | 'setup-in-progress' 
  | 'switching' 
  | 'completed' 
  | 'error';

export interface LegacyAudienceTargeting {
  mode: 'ai' | 'manual';
  advantage_plus_enabled?: boolean;
  description?: string;
  demographics?: Partial<Demographics>;
  detailedTargeting?: Partial<DetailedTargeting>;
}

export interface LegacyAudienceState {
  status: LegacyAudienceStatus;
  targeting: LegacyAudienceTargeting;
  errorMessage?: string;
  isSelected: boolean;
}

// ============================================
// Actor Input/Output Types
// ============================================

export interface PersistStateInput {
  campaignId: string;
  state: PersistedAudienceState;
}

export interface LoadStateInput {
  campaignId: string;
}

export interface LoadStateOutput {
  state: PersistedAudienceState | null;
}

// ============================================
// Guard Parameters
// ============================================

export interface IsNotAlreadyInModeParams {
  targetMode: 'ai' | 'manual';
}

// ============================================
// Helper Types
// ============================================

export type AudienceMode = 'ai' | 'manual';

export interface AudienceStateSnapshot {
  value: AudienceMachineState;
  context: AudienceMachineContext;
  can: (event: AudienceMachineEvent) => boolean;
}

