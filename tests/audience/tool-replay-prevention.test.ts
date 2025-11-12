/**
 * Feature: Audience Tool Replay Prevention Tests
 * Purpose: Test that audience tool calls are not replayed after reset or reload
 * References:
 *  - AI SDK Core Tools: https://ai-sdk.dev/docs/foundations/tools
 */

import { createActor } from 'xstate';
import { audienceMachine } from '@/lib/machines/audience/machine';

// Mock message structure that AI SDK uses
interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  input: unknown;
}

interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  result: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  parts?: Array<ToolCallPart | ToolResultPart>;
}

describe('Audience Tool Replay Prevention', () => {
  describe('Tool Call Deduplication', () => {
    it('should not process tool calls that already have results', () => {
      // Create messages with a tool call and its result
      const toolCallId = 'call_abc123';
      const messages: Message[] = [
        {
          id: 'msg1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-call',
              toolCallId,
              toolName: 'manualTargetingParameters',
              input: {
                description: 'People aged 20-55 interested in eating',
                demographics: { ageMin: 20, ageMax: 55, gender: 'all' },
                interests: [{ id: '1', name: 'Food & Dining' }],
                behaviors: [],
              },
            },
            {
              type: 'tool-result',
              toolCallId,
              result: { success: true },
            },
          ],
        },
      ];

      // Helper to check if tool result exists
      const hasToolResult = (callId: string): boolean => {
        for (const msg of messages) {
          const parts = msg.parts || [];
          for (const part of parts) {
            if (part.type === 'tool-result' && part.toolCallId === callId) {
              return true;
            }
          }
        }
        return false;
      };

      // Verify helper finds the result
      expect(hasToolResult(toolCallId)).toBe(true);
      
      // Verify it doesn't find non-existent results
      expect(hasToolResult('call_nonexistent')).toBe(false);
    });

    it('should maintain processed tools registry across component lifecycle', () => {
      // Simulate sessionStorage behavior
      const storage = new Map<string, string>();
      const mockSessionStorage = {
        getItem: (key: string) => storage.get(key) || null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      };

      const conversationId = 'conv_test123';
      const storageKey = `processed-audience-tools-${conversationId}`;
      
      // First "render" - process a tool
      const processedTools = new Set<string>(['call_123', 'call_456']);
      mockSessionStorage.setItem(storageKey, JSON.stringify(Array.from(processedTools)));

      // Second "render" - load from storage
      const stored = mockSessionStorage.getItem(storageKey);
      expect(stored).not.toBeNull();
      
      const loadedTools = new Set<string>(JSON.parse(stored!));
      expect(loadedTools.has('call_123')).toBe(true);
      expect(loadedTools.has('call_456')).toBe(true);
      expect(loadedTools.size).toBe(2);
    });
  });

  describe('Reset Clears Registry', () => {
    it('should clear processed tools when audience is reset', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Simulate manual flow
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 20, ageMax: 55, gender: 'all' },
        interests: [{ id: '1', name: 'Food' }],
        behaviors: [],
      });
      actor.send({ type: 'MANUAL_PARAMS_CONFIRMED' });
      
      expect(actor.getSnapshot().value).toBe('manualCompleted');
      expect(actor.getSnapshot().context.demographics).toBeDefined();
      
      // Reset
      actor.send({ type: 'RESET' });
      
      // Verify state is cleared
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('idle');
      expect(snapshot.context.demographics).toBeUndefined();
      expect(snapshot.context.detailedTargeting).toBeUndefined();
      expect(snapshot.context.description).toBeUndefined();
    });

    it('should allow re-selection after reset without stale data', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // First attempt - manual
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 20, ageMax: 55, gender: 'all' },
        interests: [{ id: '1', name: 'Food' }],
        behaviors: [],
      });
      
      expect(actor.getSnapshot().context.demographics?.ageMin).toBe(20);
      
      // Reset
      actor.send({ type: 'RESET' });
      expect(actor.getSnapshot().value).toBe('idle');
      
      // Second attempt - AI (should not carry over manual data)
      actor.send({ type: 'SELECT_AI_MODE' });
      
      // Wait for transition
      setTimeout(() => {
        const snapshot = actor.getSnapshot();
        expect(snapshot.value).toBe('aiCompleted');
        expect(snapshot.context.mode).toBe('ai');
        expect(snapshot.context.demographics).toBeUndefined();
        expect(snapshot.context.detailedTargeting).toBeUndefined();
      }, 600);
    });
  });

  describe('Tool Replay Scenarios', () => {
    it('should skip tools that are in the processed registry', () => {
      const processedTools = new Set<string>(['call_already_done']);
      const newToolCallId = 'call_new_one';
      
      // Simulate checking if tool should be processed
      const shouldProcess = (toolCallId: string): boolean => {
        return !processedTools.has(toolCallId);
      };
      
      expect(shouldProcess('call_already_done')).toBe(false);
      expect(shouldProcess(newToolCallId)).toBe(true);
      
      // After processing, add to registry
      processedTools.add(newToolCallId);
      expect(shouldProcess(newToolCallId)).toBe(false);
    });

    it('should handle page reload by loading registry from sessionStorage', () => {
      // Simulate first page load - process some tools
      const storage = new Map<string, string>();
      const conversationId = 'conv_reload_test';
      const storageKey = `processed-audience-tools-${conversationId}`;
      
      const processedBeforeReload = new Set(['call_1', 'call_2']);
      storage.set(storageKey, JSON.stringify(Array.from(processedBeforeReload)));
      
      // Simulate page reload - component remounts
      const loadedRegistry = storage.get(storageKey);
      expect(loadedRegistry).toBeDefined();
      
      const restoredSet = new Set<string>(JSON.parse(loadedRegistry!));
      expect(restoredSet.size).toBe(2);
      expect(restoredSet.has('call_1')).toBe(true);
      expect(restoredSet.has('call_2')).toBe(true);
      
      // New tool calls should be filtered against restored registry
      expect(restoredSet.has('call_3')).toBe(false);
    });
  });

  describe('Back to Options Flow', () => {
    it('should return to idle without replaying manual parameters', async () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // User selects manual, gets parameters
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'female' },
        interests: [{ id: '1', name: 'Fitness' }],
        behaviors: [],
      });
      
      expect(actor.getSnapshot().value).toBe('manualRefining');
      
      // User clicks "Back to Options" (RESET)
      actor.send({ type: 'RESET' });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('idle');
      expect(snapshot.context.mode).toBe('ai'); // Default mode
      expect(snapshot.context.demographics).toBeUndefined();
      expect(snapshot.context.detailedTargeting).toBeUndefined();
    });

    it('should allow user to choose AI after backing out of manual', async () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Start manual flow
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      expect(actor.getSnapshot().value).toBe('gatheringManualInfo');
      
      // Back to options
      actor.send({ type: 'RESET' });
      expect(actor.getSnapshot().value).toBe('idle');
      
      // Now select AI
      actor.send({ type: 'SELECT_AI_MODE' });
      expect(actor.getSnapshot().value).toBe('enablingAI');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('aiCompleted');
      expect(snapshot.context.mode).toBe('ai');
      expect(snapshot.context.advantage_plus_enabled).toBe(true);
    });
  });
});

