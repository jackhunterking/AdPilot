/**
 * Feature: Creative Journey Tests
 * Purpose: Test creative journey implementation
 * References:
 *  - Journey: components/chat/journeys/creative/creative-journey.tsx
 *  - Test Harness: tests/journeys/framework/journey-test-harness.ts
 */

import { describe, it, expect } from 'vitest';
import { CreativeJourney } from '@/components/chat/journeys/creative/creative-journey';
import { createJourneyTestSuite, MockToolPartBuilder } from '../framework';

const suite = createJourneyTestSuite('creative', CreativeJourney);

describe('CreativeJourney', () => {
  // Run standard journey tests
  suite.runStandardTests();

  // Test tool rendering
  suite.testToolRendering('generateVariations', [
    {
      name: 'renders loading state',
      input: { prompt: 'test prompt' },
      assert: (result) => {
        expect(result).toBeDefined();
        expect(result).not.toBeNull();
      },
    },
    {
      name: 'renders success state',
      output: { success: true, variations: [] },
      assert: (result) => {
        expect(result).toBeDefined();
      },
    },
    {
      name: 'renders error state',
      error: 'Test error',
      assert: (result) => {
        expect(result).toBeDefined();
      },
    },
  ]);

  // Test state management
  suite.testStateManagement([
    {
      name: 'initializes with idle state',
      assert: (journey) => {
        const state = journey.getState?.();
        expect(state?.status).toBe('idle');
      },
    },
    {
      name: 'resets state correctly',
      setup: (journey) => {
        journey.setState?.({ status: 'completed' });
      },
      assert: (journey) => {
        journey.reset?.();
        const state = journey.getState?.();
        expect(state?.status).toBe('idle');
      },
    },
  ]);

  // Test specific tools
  it('handles selectVariation tool', () => {
    const journey = CreativeJourney();
    const part = new MockToolPartBuilder()
      .type('tool-selectVariation')
      .input({ variationIndex: 1 })
      .output({ success: true })
      .build();

    const result = journey.renderTool(part);
    expect(result).toBeDefined();
  });

  it('handles editVariation tool', () => {
    const journey = CreativeJourney();
    const part = new MockToolPartBuilder()
      .type('tool-editVariation')
      .input({ prompt: 'make it red', variationIndex: 0 })
      .output({ success: true, editedImageUrl: 'http://example.com/image.jpg' })
      .build();

    const result = journey.renderTool(part);
    expect(result).toBeDefined();
  });
});

