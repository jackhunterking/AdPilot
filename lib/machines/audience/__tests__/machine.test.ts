/**
 * Feature: Audience State Machine Tests
 * Purpose: Unit tests for XState audience targeting machine
 * References:
 *  - XState Testing: https://stately.ai/docs/testing
 */

import { createActor } from 'xstate';
import { audienceMachine } from '../machine';
import type { AudienceMachineContext } from '../types';

describe('Audience State Machine', () => {
  describe('Initial State', () => {
    it('should start in idle state', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      expect(actor.getSnapshot().value).toBe('idle');
      expect(actor.getSnapshot().context.mode).toBe('ai');
    });
  });

  describe('AI Advantage+ Flow', () => {
    it('should transition from idle to enablingAI', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_AI_MODE' });
      
      expect(actor.getSnapshot().value).toBe('enablingAI');
      expect(actor.getSnapshot().context.mode).toBe('ai');
      expect(actor.getSnapshot().context.advantage_plus_enabled).toBe(true);
    });

    it('should clear manual data when enabling AI', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_AI_MODE' });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.demographics).toBeUndefined();
      expect(snapshot.context.detailedTargeting).toBeUndefined();
    });
  });

  describe('Manual Targeting Flow', () => {
    it('should transition from idle to gatheringManualInfo', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      
      expect(actor.getSnapshot().value).toBe('gatheringManualInfo');
      expect(actor.getSnapshot().context.mode).toBe('manual');
    });

    it('should handle manual params generation', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [{ id: '1', name: 'Fitness' }],
        behaviors: [],
      });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('manualRefining');
      expect(snapshot.context.demographics?.ageMin).toBe(25);
      expect(snapshot.context.detailedTargeting?.interests).toHaveLength(1);
    });

    it('should allow confirming manual parameters', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [],
        behaviors: [],
      });
      actor.send({ type: 'MANUAL_PARAMS_CONFIRMED' });
      
      expect(actor.getSnapshot().value).toBe('manualCompleted');
    });
  });

  describe('Mode Switching', () => {
    it('should switch from AI to manual', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Enable AI first
      actor.send({ type: 'SELECT_AI_MODE' });
      
      // Switch to manual
      actor.send({ type: 'SWITCH_TO_MANUAL' });
      
      expect(actor.getSnapshot().value).toBe('switching');
    });

    it('should switch from manual to AI', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      // Set up manual first
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [],
        behaviors: [],
      });
      actor.send({ type: 'MANUAL_PARAMS_CONFIRMED' });
      
      // Now switch to AI
      actor.send({ type: 'SWITCH_TO_AI' });
      
      expect(actor.getSnapshot().value).toBe('switching');
    });
  });

  describe('Interest Management', () => {
    it('should add interests in manual mode', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [],
        behaviors: [],
      });
      
      actor.send({ type: 'ADD_INTEREST', interest: { id: '1', name: 'Fitness' } });
      actor.send({ type: 'ADD_INTEREST', interest: { id: '2', name: 'Health' } });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.detailedTargeting?.interests).toHaveLength(2);
    });

    it('should remove interests', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_MANUAL_MODE' });
      actor.send({
        type: 'MANUAL_PARAMS_GENERATED',
        demographics: { ageMin: 25, ageMax: 45, gender: 'all' },
        interests: [{ id: '1', name: 'Fitness' }],
        behaviors: [],
      });
      
      actor.send({ type: 'REMOVE_INTEREST', interestId: '1' });
      
      expect(actor.getSnapshot().context.detailedTargeting?.interests).toHaveLength(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset from any state to idle', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      actor.send({ type: 'SELECT_AI_MODE' });
      actor.send({ type: 'RESET' });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('idle');
      expect(snapshot.context.mode).toBe('ai');
      expect(snapshot.context.demographics).toBeUndefined();
    });
  });

  describe('Metadata Tracking', () => {
    it('should increment transition count on mode changes', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      const initialCount = actor.getSnapshot().context.metadata.transitionCount;
      
      actor.send({ type: 'SELECT_AI_MODE' });
      
      expect(actor.getSnapshot().context.metadata.transitionCount).toBe(initialCount + 1);
    });

    it('should update lastModified timestamp', () => {
      const actor = createActor(audienceMachine);
      actor.start();
      
      const before = new Date(actor.getSnapshot().context.metadata.lastModified);
      
      actor.send({ type: 'SELECT_AI_MODE' });
      
      const after = new Date(actor.getSnapshot().context.metadata.lastModified);
      expect(after.getTime()).toBeGreaterThan(before.getTime());
    });
  });
});

