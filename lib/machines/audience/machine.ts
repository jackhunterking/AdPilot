/**
 * Feature: Audience State Machine
 * Purpose: XState v5 state machine for audience targeting flow
 * References:
 *  - XState v5: https://stately.ai/docs/xstate
 *  - AI SDK Core: https://sdk.vercel.ai/docs
 */

import { setup, fromPromise, assign } from 'xstate';
import type {
  AudienceMachineContext,
  AudienceMachineEvent,
  AudienceMachineState,
} from './types';
import {
  isNotAlreadyInMode,
  isAIMode,
  isManualMode,
  hasCompleteDemographics,
  hasTargetingCriteria,
  canRetry,
  areValidDemographics,
} from './guards';
import {
  logTransition,
  logError,
  setAIMode,
  setManualMode,
  clearManualData,
  setGeneratedDemographics,
  updateDemographics,
  addInterest,
  removeInterest,
  addBehavior,
  removeBehavior,
  setError,
  clearError,
  incrementTransitionCount,
  resetToInitial,
  updateModeFromEvent,
} from './actions';
import { INITIAL_CONTEXT, TIMING, MACHINE_CONFIG } from './constants';

// ============================================
// Actors (Async Operations)
// ============================================

/**
 * Delay actor for loading states
 * Ensures UI shows visual feedback during transitions
 */
const delayTransition = fromPromise(async () => {
  await new Promise(resolve => setTimeout(resolve, TIMING.TRANSITION_DELAY_MS));
});

/**
 * Persistence actor - saves state to database
 * Integrated with AudienceStatePersistence service
 */
const persistState = fromPromise(async ({ input }: { input: { campaignId?: string; machineState: string; context: AudienceMachineContext } }) => {
  const { audienceStatePersistence } = await import('@/lib/services/audience-state-persistence');
  
  if (!input.campaignId) {
    console.warn('[AudienceMachine] No campaignId provided for persistence');
    return { success: false };
  }

  const success = await audienceStatePersistence.saveState({
    campaignId: input.campaignId,
    machineState: input.machineState as any,
    context: input.context,
  });

  return { success };
});

/**
 * Load state actor - loads state from database
 * Integrated with AudienceStatePersistence service
 */
const loadState = fromPromise(async ({ input }: { input: { campaignId: string } }) => {
  const { audienceStatePersistence } = await import('@/lib/services/audience-state-persistence');
  
  const result = await audienceStatePersistence.loadState(input.campaignId);
  return result;
});

// ============================================
// State Machine Setup
// ============================================

export const audienceMachine = setup({
  types: {} as {
    context: AudienceMachineContext;
    events: AudienceMachineEvent;
    value: AudienceMachineState;
  },
  actors: {
    delayTransition,
    persistState,
    loadState,
  },
  guards: {
    isNotAlreadyInMode,
    isAIMode,
    isManualMode,
    hasCompleteDemographics,
    hasTargetingCriteria,
    canRetry,
    areValidDemographics,
  },
  actions: {
    // @ts-ignore - XState v5 action type inference limitations; all actions work correctly at runtime
    logTransition,
    // @ts-ignore - XState v5 action type inference limitations
    logError,
    // @ts-ignore - XState v5 action type inference limitations
    setAIMode,
    // @ts-ignore - XState v5 action type inference limitations
    setManualMode,
    // @ts-ignore - XState v5 action type inference limitations
    clearManualData,
    // @ts-ignore - XState v5 action type inference limitations
    setGeneratedDemographics,
    // @ts-ignore - XState v5 action type inference limitations
    updateDemographics,
    // @ts-ignore - XState v5 action type inference limitations
    addInterest,
    // @ts-ignore - XState v5 action type inference limitations
    removeInterest,
    // @ts-ignore - XState v5 action type inference limitations
    addBehavior,
    // @ts-ignore - XState v5 action type inference limitations
    removeBehavior,
    // @ts-ignore - XState v5 action type inference limitations
    setError,
    // @ts-ignore - XState v5 action type inference limitations
    clearError,
    // @ts-ignore - XState v5 action type inference limitations
    incrementTransitionCount,
    // @ts-ignore - XState v5 action type inference limitations
    resetToInitial,
    // @ts-ignore - XState v5 action type inference limitations
    updateModeFromEvent,
  },
}).createMachine({
  /** @xstate-layout N8IgpgJg5mDOIC5QBsD2UDKAXATmAxgBYCWAdmAHQAqAKgMoDKAogPICCAogNoAMAuoqAAcA9rFwBLaqh4gAHogC0ANgAsADnkBmAEwA2RfIC 
   * This is a placeholder layout annotation that will be generated after full implementation
   */
  id: MACHINE_CONFIG.ID,
  initial: 'idle',
  context: INITIAL_CONTEXT,
  
  states: {
    // ========================================
    // IDLE - Initial Selection Screen
    // ========================================
    idle: {
      entry: ['logTransition'],
      on: {
        SELECT_AI_MODE: {
          target: 'enablingAI',
        },
        SELECT_MANUAL_MODE: {
          target: 'gatheringManualInfo',
        },
        RESET: {
          target: 'idle',
          actions: ['resetToInitial'],
        },
      },
    },

    // ========================================
    // AI ADVANTAGE+ FLOW
    // ========================================
    enablingAI: {
      entry: ['setAIMode', 'logTransition'],
      invoke: {
        id: 'enable-ai-delay',
        src: 'delayTransition',
        onDone: {
          target: 'aiCompleted',
        },
        onError: {
          target: 'error',
          actions: assign({ errorMessage: 'Failed to enable AI Advantage+' }),
        },
      },
    },

    aiCompleted: {
      entry: ['logTransition'],
      on: {
        SWITCH_TO_MANUAL: {
          target: 'switching',
        },
        RESET: {
          target: 'idle',
          actions: ['resetToInitial'],
        },
      },
    },

    // ========================================
    // MANUAL TARGETING FLOW
    // ========================================
    gatheringManualInfo: {
      entry: ['setManualMode', 'logTransition'],
      on: {
        MANUAL_PARAMS_GENERATED: {
          target: 'manualRefining',
          actions: ['setGeneratedDemographics'],
        },
        RESET: {
          target: 'idle',
          actions: ['resetToInitial'],
        },
      },
    },

    generatingManualParams: {
      entry: ['logTransition'],
      // This state can be used if AI needs time to generate parameters
      // For now, we'll transition immediately via MANUAL_PARAMS_GENERATED
      on: {
        MANUAL_PARAMS_GENERATED: {
          target: 'manualRefining',
          actions: ['setGeneratedDemographics'],
        },
      },
    },

    manualRefining: {
      entry: ['logTransition'],
      on: {
        UPDATE_DEMOGRAPHICS: {
          actions: ['updateDemographics'],
        },
        ADD_INTEREST: {
          actions: ['addInterest'],
        },
        REMOVE_INTEREST: {
          actions: ['removeInterest'],
        },
        ADD_BEHAVIOR: {
          actions: ['addBehavior'],
        },
        REMOVE_BEHAVIOR: {
          actions: ['removeBehavior'],
        },
        MANUAL_PARAMS_CONFIRMED: {
          target: 'manualCompleted',
        },
        RESET: {
          target: 'idle',
          actions: ['resetToInitial'],
        },
      },
    },

    manualCompleted: {
      entry: ['logTransition'],
      on: {
        SWITCH_TO_AI: {
          target: 'switching',
        },
        UPDATE_DEMOGRAPHICS: {
          target: 'manualRefining',
          actions: ['updateDemographics'],
        },
        ADD_INTEREST: {
          actions: ['addInterest'],
        },
        REMOVE_INTEREST: {
          actions: ['removeInterest'],
        },
        ADD_BEHAVIOR: {
          actions: ['addBehavior'],
        },
        REMOVE_BEHAVIOR: {
          actions: ['removeBehavior'],
        },
        RESET: {
          target: 'idle',
          actions: ['resetToInitial'],
        },
      },
    },

    // ========================================
    // SWITCHING - Mode Transition
    // ========================================
    switching: {
      entry: ['updateModeFromEvent', 'logTransition', 'incrementTransitionCount'],
      invoke: {
        id: 'switching-delay',
        src: 'delayTransition',
        onDone: [
          {
            target: 'aiCompleted',
            guard: 'isAIMode',
            actions: ['clearManualData'],
          },
          {
            target: 'gatheringManualInfo',
            guard: 'isManualMode',
            actions: [],
          },
        ],
        onError: {
          target: 'error',
          actions: assign({ errorMessage: 'Failed to switch targeting mode' }),
        },
      },
    },

    // ========================================
    // ERROR - Error State with Recovery
    // ========================================
    error: {
      entry: ['logError'],
      on: {
        RETRY_ERROR: [
          {
            target: 'idle',
            guard: 'canRetry',
            actions: ['clearError'],
          },
          {
            // Can't retry, stay in error
            actions: assign({ errorMessage: 'Maximum retry attempts reached' }),
          },
        ],
        RESET: {
          target: 'idle',
          actions: ['resetToInitial'],
        },
      },
    },
  },
});

// ============================================
// Export Types for External Use
// ============================================

export type { AudienceMachineContext, AudienceMachineEvent, AudienceMachineState };

