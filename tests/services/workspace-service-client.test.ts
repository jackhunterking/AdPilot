/**
 * Test: Workspace Service Client
 * Purpose: Unit tests for workspace mode management
 */

import { describe, it, expect } from 'vitest';
import { workspaceServiceClient } from '@/lib/services/client/workspace-service-client';

describe('WorkspaceServiceClient', () => {
  describe('changeMode', () => {
    it('should change workspace mode', async () => {
      const result = await workspaceServiceClient.changeMode.execute({
        newMode: 'edit'
      });

      expect(result.success).toBe(true);
      expect(result.data?.mode).toBe('edit');
    });

    it('should validate mode', async () => {
      const result = await workspaceServiceClient.changeMode.execute({
        newMode: 'invalid' as never
      });

      expect(result.success).toBe(false);
    });
  });

  describe('canNavigateTo', () => {
    it('should allow valid navigation', async () => {
      const result = await workspaceServiceClient.canNavigateTo.execute({
        targetMode: 'results',
        activeAdId: 'ad-id'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('isPublishReady', () => {
    it('should check publish readiness', async () => {
      const result = await workspaceServiceClient.isPublishReady.execute({
        adId: 'ad-id',
        hasCreative: true,
        hasCopy: true,
        hasLocation: true,
        hasDestination: true,
        hasBudget: true
      });

      expect(result.success).toBe(true);
    });
  });
});

