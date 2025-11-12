/**
 * Feature: Audience Machine Context Provider
 * Purpose: XState-backed context with backward-compatible API
 * References:
 *  - XState v5: https://stately.ai/docs/xstate
 *  - React Context: https://react.dev/reference/react/createContext
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAudienceMachine as useAudienceMachineHook, type UseAudienceMachineReturn } from '@/lib/hooks/use-audience-machine';
import { useCampaignContext } from './campaign-context';
import type {
  Demographics,
  TargetingOption,
  AudienceMode,
} from '@/lib/machines/audience/types';
import { STATE_TO_LEGACY_STATUS } from '@/lib/machines/audience/constants';

// ============================================
// Context Type (Backward Compatible)
// ============================================

/**
 * Backward-compatible context type that matches the old API
 * while being powered by XState under the hood
 */
export interface AudienceMachineContextType {
  // Legacy-compatible state structure
  audienceState: {
    status: 'idle' | 'generating' | 'gathering-info' | 'setup-in-progress' | 'switching' | 'completed' | 'error';
    targeting: {
      mode: AudienceMode;
      advantage_plus_enabled?: boolean;
      description?: string;
      demographics?: Demographics;
      detailedTargeting?: {
        interests: TargetingOption[];
        behaviors: TargetingOption[];
        connections: TargetingOption[];
      };
    };
    errorMessage?: string;
    isSelected: boolean;
  };

  // New XState-specific properties
  machineState: string;
  isLoading: boolean;
  isSwitching: boolean;

  // Legacy-compatible actions
  setAudienceTargeting: (targeting: Partial<AudienceMachineContextType['audienceState']['targeting']>) => void;
  updateStatus: (status: AudienceMachineContextType['audienceState']['status']) => void;
  setError: (message: string) => void;
  resetAudience: () => Promise<void>;
  switchTargetingMode: (newMode: 'ai' | 'manual') => Promise<void>;

  // Additional helpers
  setSelected: (selected: boolean) => void;
  setManualDescription: (description: string) => void;
  setDemographics: (demographics: Partial<Demographics>) => void;
  setDetailedTargeting: (detailedTargeting: Partial<AudienceMachineContextType['audienceState']['targeting']['detailedTargeting']>) => void;
  setConfirmedParameters: (demographics: Demographics, interests: TargetingOption[], behaviors: TargetingOption[]) => void;
  addInterest: (interest: TargetingOption) => void;
  removeInterest: (interestId: string) => void;
  addBehavior: (behavior: TargetingOption) => void;
  removeBehavior: (behaviorId: string) => void;
  addConnection: (connection: TargetingOption) => void;
  removeConnection: (connectionId: string) => void;
}

const AudienceMachineContext = createContext<AudienceMachineContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

export function AudienceMachineProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext();
  const campaignId = campaign?.id || '';

  // Use XState machine hook
  const machine = useAudienceMachineHook(campaignId);

  // Build backward-compatible API with memoization
  const value: AudienceMachineContextType = useMemo(() => ({
    // Map XState state to legacy state structure
    audienceState: {
      status: STATE_TO_LEGACY_STATUS[machine.state] || 'idle',
      targeting: {
        mode: machine.context.mode,
        advantage_plus_enabled: machine.context.advantage_plus_enabled,
        description: machine.context.description,
        demographics: machine.context.demographics as Demographics | undefined,
        detailedTargeting: machine.context.detailedTargeting as {
          interests: TargetingOption[];
          behaviors: TargetingOption[];
          connections: TargetingOption[];
        } | undefined,
      },
      errorMessage: machine.context.errorMessage,
      isSelected: machine.isAICompleted || machine.isManualCompleted,
    },

    // XState-specific properties
    machineState: machine.state,
    isLoading: machine.isLoading,
    isSwitching: machine.isSwitching,

    // Backward-compatible actions
    setAudienceTargeting: (targeting) => {
      // Handle mode setting
      if (targeting.mode === 'ai' && !machine.isAIMode) {
        machine.selectAIMode();
      } else if (targeting.mode === 'manual' && !machine.isManualMode) {
        machine.selectManualMode();
      }

      // Handle demographics update
      if (targeting.demographics) {
        machine.updateDemographics(targeting.demographics);
      }

      // Handle detailed targeting updates
      if (targeting.detailedTargeting?.interests) {
        // Clear existing and add new interests
        // This is a simplified approach - in practice you'd diff the arrays
        targeting.detailedTargeting.interests.forEach(interest => {
          machine.addInterest(interest);
        });
      }
    },

    updateStatus: (status) => {
      // Map legacy status updates to machine events
      if (status === 'completed' && machine.isManualRefining) {
        machine.confirmManualParameters();
      }
      // Other status updates are handled by the machine automatically
    },

    setError: (message) => {
      // Errors are managed by the machine
      // This is mainly for backward compatibility
      console.warn('[AudienceMachineContext] setError called:', message);
    },

    resetAudience: async () => {
      machine.reset();
      
      // Emit event to notify AI chat to clear processed tools and UI flags
      window.dispatchEvent(new CustomEvent('audienceReset'));
    },

    switchTargetingMode: async (newMode) => {
      const currentMode = machine.context.mode;
      
      // Don't switch if already in target mode
      if (currentMode === newMode) {
        console.log('[AudienceMachineContext] Already in target mode:', newMode);
        return;
      }
      
      console.log(`[AudienceMachineContext] Switching mode: ${currentMode} → ${newMode}`);
      
      // Dispatch audienceModeSwitch event to clear tool registry and UI flags
      window.dispatchEvent(new CustomEvent('audienceModeSwitch', {
        detail: { newMode, fromMode: currentMode }
      }));
      
      // Trigger machine transition
      if (newMode === 'ai') {
        machine.switchToAI();
      } else {
        machine.switchToManual();
      }
      
      // Wait for state transition to complete
      // The machine handles the delay through the switching state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger appropriate AI chat messages based on journey
      if (newMode === 'manual') {
        // Journey 1: AI → Manual
        // Wait for machine to reach gatheringManualInfo state, then send transition message
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('triggerManualTargetingTransition'));
        }, 600); // After switching state delay
      } else {
        // Journey 2: Manual → AI
        // Send confirmation message after AI card display
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('triggerAIAdvantageConfirmation'));
        }, 900); // After AI card display
      }
    },

    // Additional helpers
    setSelected: (selected) => {
      if (selected && machine.isManualRefining) {
        machine.confirmManualParameters();
      }
    },

    setManualDescription: (description) => {
      // Store description in context
      // Note: This would require adding description to the machine context
      console.log('[AudienceMachineContext] setManualDescription:', description);
    },

    setDemographics: (demographics) => {
      machine.updateDemographics(demographics);
    },

    setDetailedTargeting: (detailedTargeting) => {
      // Handle interests
      if (detailedTargeting?.interests) {
        detailedTargeting.interests.forEach(interest => {
          machine.addInterest(interest);
        });
      }

      // Handle behaviors
      if (detailedTargeting?.behaviors) {
        detailedTargeting.behaviors.forEach(behavior => {
          machine.addBehavior(behavior);
        });
      }
    },

    setConfirmedParameters: (demographics, interests, behaviors) => {
      // Update demographics
      machine.updateDemographics(demographics);

      // Add interests
      interests.forEach(interest => machine.addInterest(interest));

      // Add behaviors
      behaviors.forEach(behavior => machine.addBehavior(behavior));

      // Confirm parameters
      machine.confirmManualParameters();
    },

    addInterest: machine.addInterest,
    removeInterest: machine.removeInterest,
    addBehavior: machine.addBehavior,
    removeBehavior: machine.removeBehavior,
    addConnection: (connection) => {
      console.log('[AudienceMachineContext] addConnection:', connection);
      // Connections not implemented in machine yet
    },
    removeConnection: (connectionId) => {
      console.log('[AudienceMachineContext] removeConnection:', connectionId);
      // Connections not implemented in machine yet
    },
  }), [
    machine.state,
    machine.context,
    machine.isAICompleted,
    machine.isManualCompleted,
    machine.isLoading,
    machine.isSwitching,
    machine.selectAIMode,
    machine.selectManualMode,
    machine.switchToAI,
    machine.switchToManual,
    machine.confirmManualParameters,
    machine.updateDemographics,
    machine.addInterest,
    machine.removeInterest,
    machine.addBehavior,
    machine.removeBehavior,
    machine.reset,
  ]);

  return (
    <AudienceMachineContext.Provider value={value}>
      {children}
    </AudienceMachineContext.Provider>
  );
}

// ============================================
// Hook to use the context
// ============================================

export function useAudienceMachine() {
  const context = useContext(AudienceMachineContext);
  if (context === undefined) {
    throw new Error('useAudienceMachine must be used within an AudienceMachineProvider');
  }
  return context;
}

// Export for backward compatibility with old imports
export { useAudienceMachine as useAudience };

