/**
 * Feature: Copy Journey Tests
 * Purpose: Test copy journey implementation
 * References:
 *  - Journey: components/chat/journeys/copy/copy-journey.tsx
 */

import { describe, it, expect } from 'vitest';
import { CopyJourney } from '@/components/chat/journeys/copy/copy-journey';
import { createJourneyTestSuite, MockToolPartBuilder } from '../framework';

const suite = createJourneyTestSuite('copy', CopyJourney);

describe('CopyJourney', () => {
  suite.runStandardTests();

  suite.testToolRendering('editCopy', [
    {
      name: 'renders loading state',
      input: { prompt: 'make it shorter', variationIndex: 0 },
      assert: (result) => {
        expect(result).toBeDefined();
      },
    },
    {
      name: 'renders success state',
      output: { 
        success: true, 
        copy: { 
          headline: 'New Headline',
          primaryText: 'New text',
          description: 'New desc',
        } 
      },
      assert: (result) => {
        expect(result).toBeDefined();
      },
    },
  ]);

  it('handles generateCopyVariations tool', () => {
    const journey = CopyJourney();
    const part = new MockToolPartBuilder()
      .type('tool-generateCopyVariations')
      .output({ success: true, variations: [] })
      .build();

    const result = journey.renderTool(part);
    expect(result).toBeDefined();
  });
});

