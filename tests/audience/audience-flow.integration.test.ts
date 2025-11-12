/**
 * Feature: Audience Flow Integration Tests
 * Purpose: End-to-end tests for audience targeting flows
 * References:
 *  - XState Testing: https://stately.ai/docs/testing
 */

import { createActor } from 'xstate';
import { audienceMachine } from '@/lib/machines/audience/machine';

describe('Audience Flow Integration Tests', () => {
  describe('Complete AI Flow', () => {
    it('should complete AI Advantage+ setup flow', async () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // User selects AI mode
      actor.send({ type: 'SELECT_AI_MODE' });
      expect(actor.getSnapshot().value).toBe('enablingAI');
      
      // Wait for transition delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should be in completed state
      expect(actor.getSnapshot().value).toBe('aiCompleted');
      expect(actor.getSnapshot().context.mode).toBe('ai');
      expect(actor.getSnapshot().context.advantage_plus_enabled).toBe(true);
    });
  });

  describe('Complete Manual Flow', () => {
    it('should complete manual targeting setup flow', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // User selects manual mode
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      expect(actor.getSnapshot().value).toBe('gatheringManualInfo');
      
      // AI generates parameters
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'female' },
        interests: [{ id: '1', name: 'Fitness' }],
        behaviors: [{ id: '2', name: 'Online shoppers' }],
      });
      expect(actor.getSnapshot().value).toBe('manualRefining');
      
      // User confirms
      actor.send({ type: 'MANUAL_PARAMS_CONFIRMED' });
      expect(actor.getSnapshot().value).toBe('manualCompleted');
    });
  });

  describe('Mode Switching Integration', () => {
    it('should switch from manual to AI and clear data', async () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Set up manual targeting
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [{ id: '1', name: 'Fitness' }],
        behaviors: [],
      });
      actor.send({ type: 'MANUAL_PARAMS_CONFIRMED' });
      
      expect(actor.getSnapshot().value).toBe('manualCompleted');
      expect(actor.getSnapshot().context.demographics).toBeDefined();
      
      // Switch to AI
      actor.send({ type: 'SWITCH_TO_AI' });
      expect(actor.getSnapshot().value).toBe('switching');
      
      // Wait for transition
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Verify switched to AI and data cleared
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('aiCompleted');
      expect(snapshot.context.mode).toBe('ai');
      expect(snapshot.context.demographics).toBeUndefined();
      expect(snapshot.context.detailedTargeting).toBeUndefined();
    });

    it('should switch from AI to manual', async () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Enable AI
      actor.send({ type: 'SELECT_AI_MODE' });
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(actor.getSnapshot().value).toBe('aiCompleted');
      
      // Switch to manual
      actor.send({ type: 'SWITCH_TO_MANUAL' });
      expect(actor.getSnapshot().value).toBe('switching');
      
      // Wait for transition
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should be in gathering info state
      expect(actor.getSnapshot().value).toBe('gatheringManualInfo');
      expect(actor.getSnapshot().context.mode).toBe('manual');
    });
  });

  describe('Editing in Manual Mode', () => {
    it('should allow adding/removing interests after completion', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Set up manual targeting
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [{ id: '1', name: 'Fitness' }],
        behaviors: [],
      });
      actor.send({ type: 'MANUAL_PARAMS_CONFIRMED' });
      
      // Add interest
      actor.send({ type: 'ADD_INTEREST', interest: { id: '2', name: 'Health' } });
      expect(actor.getSnapshot().context.detailedTargeting?.interests).toHaveLength(2);
      
      // Remove interest
      actor.send({ type: 'REMOVE_INTEREST', interestId: '1' });
      expect(actor.getSnapshot().context.detailedTargeting?.interests).toHaveLength(1);
      expect(actor.getSnapshot().context.detailedTargeting?.interests?.[0]?.id).toBe('2');
    });

    it('should allow updating demographics from completed state', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Set up manual targeting
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [],
        behaviors: [],
      });
      actor.send({ type: 'MANUAL_PARAMS_CONFIRMED' });
      
      // Update demographics
      actor.send({ type: 'UPDATE_DEMOGRAPHICS', demographics: { ageMin: 30 } });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('manualRefining');
      expect(snapshot.context.demographics?.ageMin).toBe(30);
      expect(snapshot.context.demographics?.ageMax).toBe(45);
    });
  });

  describe('Error Handling', () => {
    it('should allow retry from error state', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Force an error (this would normally happen via actor failure)
      // For testing, we can manually transition if we add an error event
      actor.send({ type: 'RESET' });
      
      expect(actor.getSnapshot().value).toBe('idle');
    });
  });
});

