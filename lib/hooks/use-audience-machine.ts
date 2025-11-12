/**
 * Feature: Audience Machine React Hook
 * Purpose: React integration for XState audience machine with DB persistence
 * References:
 *  - XState React: https://stately.ai/docs/xstate-react
 *  - React Hooks: https://react.dev/reference/react
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { audienceMachine } from '@/lib/machines/audience/machine';
import type {
  AudienceMachineContext,
  AudienceMachineEvent,
  AudienceMachineState,
  Demographics,
} from '@/lib/machines/audience/types';
import { audienceStatePersistence } from '@/lib/services/audience-state-persistence';
import { MACHINE_CONFIG, FEATURE_FLAGS } from '@/lib/machines/audience/constants';

// ============================================
// Hook Return Type
// ============================================

export interface UseAudienceMachineReturn {
  // Current state
  state: AudienceMachineState;
  context: AudienceMachineContext;
  
  // State checks
  isIdle: boolean;
  isEnablingAI: boolean;
  isAICompleted: boolean;
  isGatheringManualInfo: boolean;
  isGeneratingManualParams: boolean;
  isManualRefining: boolean;
  isManualCompleted: boolean;
  isSwitching: boolean;
  isError: boolean;
  
  // Mode checks
  isAIMode: boolean;
  isManualMode: boolean;
  
  // Actions (send events to machine)
  selectAIMode: () => void;
  selectManualMode: () => void;
  switchToAI: () => void;
  switchToManual: () => void;
  confirmManualParameters: () => void;
  updateDemographics: (demographics: Partial<Demographics>) => void;
  addInterest: (interest: { id: string; name: string }) => void;
  removeInterest: (interestId: string) => void;
  addBehavior: (behavior: { id: string; name: string }) => void;
  removeBehavior: (behaviorId: string) => void;
  reset: () => void;
  retryError: () => void;
  
  // Capability checks
  can: (event: AudienceMachineEvent) => boolean;
  
  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
}

// ============================================
// Hook Implementation
// ============================================

export function useAudienceMachine(campaignId: string): UseAudienceMachineReturn {
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialized = useRef(false);
  
  // Initialize machine with XState React hook
  const [snapshot, send, actorRef] = useMachine(audienceMachine, {
    inspect: (inspectionEvent) => {
      if (FEATURE_FLAGS.ENABLE_LOGGING) {
        console.log('[useAudienceMachine]', inspectionEvent.type, inspectionEvent);
      }
    },
  });

  // Load initial state from database
  useEffect(() => {
    if (hasInitialized.current || !campaignId) return;

    const loadInitialState = async () => {
      try {
        const result = await audienceStatePersistence.loadState(campaignId);
        
        if (result.state) {
          if (MACHINE_CONFIG.DEBUG) {
            console.log('[useAudienceMachine] Loaded state:', result.state.machineState);
          }
          
          // Restore machine to saved state
          // Note: In XState v5, we use snapshot.value to get current state
          // The machine will handle state restoration through the context
          // For now, we'll send appropriate events based on loaded state
          
          const { machineState, context } = result.state;
          
          // Update context with loaded data
          // This is a simplified approach - in production you'd want to
          // properly restore the exact machine state
          if (machineState === 'aiCompleted') {
            send({ type: 'SELECT_AI_MODE' });
          } else if (machineState === 'manualCompleted' || machineState === 'manualRefining') {
            send({ type: 'SELECT_MANUAL_MODE' });
            // Restore manual params if available
            if (context.demographics) {
              // Machine will handle this through context restoration
            }
          }
        }
      } catch (error) {
        console.error('[useAudienceMachine] Failed to load initial state:', error);
      } finally {
        setIsInitializing(false);
        hasInitialized.current = true;
      }
    };

    loadInitialState();
  }, [campaignId, send]);

  // Auto-persist state changes to database
  useEffect(() => {
    if (isInitializing || !campaignId) return;

    const persistCurrentState = async () => {
      const currentState = snapshot.value as AudienceMachineState;
      const currentContext = snapshot.context;

      // Don't persist during initialization or idle state
      if (currentState === 'idle' && !hasInitialized.current) return;

      await audienceStatePersistence.saveState({
        campaignId,
        machineState: currentState,
        context: currentContext,
      });
    };

    // Debounce persistence
    const timeoutId = setTimeout(() => {
      persistCurrentState();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [snapshot, campaignId, isInitializing]);

  // Extract current state and context
  const state = snapshot.value as AudienceMachineState;
  const context = snapshot.context;

  // State checks
  const isIdle = state === 'idle';
  const isEnablingAI = state === 'enablingAI';
  const isAICompleted = state === 'aiCompleted';
  const isGatheringManualInfo = state === 'gatheringManualInfo';
  const isGeneratingManualParams = state === 'generatingManualParams';
  const isManualRefining = state === 'manualRefining';
  const isManualCompleted = state === 'manualCompleted';
  const isSwitching = state === 'switching';
  const isError = state === 'error';

  // Mode checks
  const isAIMode = context.mode === 'ai';
  const isManualMode = context.mode === 'manual';

  // Loading state
  const isLoading = isEnablingAI || isSwitching || isGeneratingManualParams;

  // Action creators
  const selectAIMode = () => send({ type: 'SELECT_AI_MODE' });
  const selectManualMode = () => send({ type: 'SELECT_MANUAL_MODE' });
  const switchToAI = () => send({ type: 'SWITCH_TO_AI' });
  const switchToManual = () => send({ type: 'SWITCH_TO_MANUAL' });
  const confirmManualParameters = () => send({ type: 'MANUAL_PARAMS_CONFIRMED' });
  
  const updateDemographics = (demographics: Partial<Demographics>) => {
    send({ type: 'UPDATE_DEMOGRAPHICS', demographics });
  };
  
  const addInterest = (interest: { id: string; name: string }) => {
    send({ type: 'ADD_INTEREST', interest });
  };
  
  const removeInterest = (interestId: string) => {
    send({ type: 'REMOVE_INTEREST', interestId });
  };
  
  const addBehavior = (behavior: { id: string; name: string }) => {
    send({ type: 'ADD_BEHAVIOR', behavior });
  };
  
  const removeBehavior = (behaviorId: string) => {
    send({ type: 'REMOVE_BEHAVIOR', behaviorId });
  };
  
  const reset = () => send({ type: 'RESET' });
  const retryError = () => send({ type: 'RETRY_ERROR' });

  // Capability check
  const can = (event: AudienceMachineEvent) => {
    // In XState v5, we can check if a transition exists for an event
    // This is a simplified version
    return true; // Machine will handle invalid transitions gracefully
  };

  return {
    // State
    state,
    context,
    
    // State checks
    isIdle,
    isEnablingAI,
    isAICompleted,
    isGatheringManualInfo,
    isGeneratingManualParams,
    isManualRefining,
    isManualCompleted,
    isSwitching,
    isError,
    
    // Mode checks
    isAIMode,
    isManualMode,
    
    // Actions
    selectAIMode,
    selectManualMode,
    switchToAI,
    switchToManual,
    confirmManualParameters,
    updateDemographics,
    addInterest,
    removeInterest,
    addBehavior,
    removeBehavior,
    reset,
    retryError,
    
    // Capability checks
    can,
    
    // Loading states
    isLoading,
    isInitializing,
  };
}

