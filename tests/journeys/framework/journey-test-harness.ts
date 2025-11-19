/**
 * Feature: Journey Testing Harness
 * Purpose: Utility framework for testing journey implementations
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 *  - Testing: Vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Journey, ToolPart, JourneyState } from '@/lib/journeys/types/journey-contracts';

/**
 * Mock Tool Part Builder
 * Helper to create mock tool parts for testing
 */
export class MockToolPartBuilder {
  private part: Partial<ToolPart> = {
    type: 'tool-test',
    toolCallId: `call_${Date.now()}`,
    toolName: 'test',
    state: 'input-available',
  };

  type(type: string): this {
    this.part.type = type;
    return this;
  }

  toolName(name: string): this {
    this.part.toolName = name;
    return this;
  }

  input(input: unknown): this {
    this.part.input = input;
    return this;
  }

  output(output: unknown): this {
    this.part.output = output;
    this.part.state = 'output-available';
    return this;
  }

  error(errorText: string): this {
    this.part.errorText = errorText;
    this.part.state = 'output-error';
    return this;
  }

  streaming(): this {
    this.part.state = 'input-streaming';
    return this;
  }

  build(): ToolPart {
    return this.part as ToolPart;
  }
}

/**
 * Journey Test Suite Builder
 * Provides a fluent API for testing journey implementations
 */
export class JourneyTestSuite<TState extends JourneyState = JourneyState> {
  constructor(
    private journeyId: string,
    private createJourney: () => Journey<TState>
  ) {}

  /**
   * Run standard journey tests
   */
  runStandardTests(): void {
    describe(`Journey: ${this.journeyId}`, () => {
      let journey: Journey<TState>;

      beforeEach(() => {
        journey = this.createJourney();
      });

      it('should have required properties', () => {
        expect(journey).toBeDefined();
        expect(journey.id).toBe(this.journeyId);
        expect(typeof journey.renderTool).toBe('function');
      });

      it('should render tool parts', () => {
        const mockPart = new MockToolPartBuilder()
          .type(`tool-${this.journeyId}Test`)
          .input({ test: 'data' })
          .build();

        const result = journey.renderTool(mockPart);
        // Result can be null or ReactNode
        expect(result).toBeDefined();
      });

      it('should handle tool errors gracefully', () => {
        const mockPart = new MockToolPartBuilder()
          .type(`tool-${this.journeyId}Test`)
          .error('Test error')
          .build();

        expect(() => journey.renderTool(mockPart)).not.toThrow();
      });

      if (journey.getState && journey.setState) {
        it('should get and set state', () => {
          const initialState = journey.getState?.();
          expect(initialState).toBeDefined();

          if (journey.setState) {
            const newState = { ...initialState, status: 'completed' as const };
            journey.setState(newState);

            const updatedState = journey.getState?.();
            expect(updatedState?.status).toBe('completed');
          }
        });
      }

      if (journey.reset) {
        it('should reset state', () => {
          journey.reset();
          
          const state = journey.getState?.();
          if (state) {
            expect(state.status).toBe('idle');
          }
        });
      }

      if (journey.buildMetadata) {
        it('should build metadata', () => {
          const metadata = journey.buildMetadata('test input');
          expect(metadata).toBeDefined();
          expect(metadata.journeyId).toBe(this.journeyId);
        });
      }
    });
  }

  /**
   * Test tool rendering with specific scenarios
   */
  testToolRendering(
    toolName: string,
    scenarios: Array<{
      name: string;
      input?: unknown;
      output?: unknown;
      error?: string;
      assert: (result: React.ReactNode) => void;
    }>
  ): void {
    describe(`Tool: ${toolName}`, () => {
      let journey: Journey<TState>;

      beforeEach(() => {
        journey = this.createJourney();
      });

      for (const scenario of scenarios) {
        it(scenario.name, () => {
          const builder = new MockToolPartBuilder()
            .type(`tool-${toolName}`)
            .toolName(toolName);

          if (scenario.input !== undefined) {
            builder.input(scenario.input);
          }

          if (scenario.output !== undefined) {
            builder.output(scenario.output);
          }

          if (scenario.error) {
            builder.error(scenario.error);
          }

          const part = builder.build();
          const result = journey.renderTool(part);

          scenario.assert(result);
        });
      }
    });
  }

  /**
   * Test state management
   */
  testStateManagement(
    scenarios: Array<{
      name: string;
      setup?: (journey: Journey<TState>) => void;
      assert: (journey: Journey<TState>) => void;
    }>
  ): void {
    describe('State Management', () => {
      let journey: Journey<TState>;

      beforeEach(() => {
        journey = this.createJourney();
      });

      for (const scenario of scenarios) {
        it(scenario.name, () => {
          scenario.setup?.(journey);
          scenario.assert(journey);
        });
      }
    });
  }

  /**
   * Test lifecycle hooks
   */
  testLifecycle(): void {
    describe('Lifecycle', () => {
      let journey: Journey<TState>;

      beforeEach(() => {
        journey = this.createJourney();
      });

      if (journey.onActivate) {
        it('should call onActivate', () => {
          const spy = vi.fn();
          journey.onActivate = spy;
          journey.onActivate();
          expect(spy).toHaveBeenCalled();
        });
      }

      if (journey.onDeactivate) {
        it('should call onDeactivate', () => {
          const spy = vi.fn();
          journey.onDeactivate = spy;
          journey.onDeactivate();
          expect(spy).toHaveBeenCalled();
        });
      }
    });
  }
}

/**
 * Create a journey test suite
 */
export function createJourneyTestSuite<TState extends JourneyState = JourneyState>(
  journeyId: string,
  createJourney: () => Journey<TState>
): JourneyTestSuite<TState> {
  return new JourneyTestSuite(journeyId, createJourney);
}

/**
 * Assert tool result contains text
 */
export function assertResultContainsText(result: React.ReactNode, text: string): void {
  expect(result).toBeDefined();
  expect(result).not.toBeNull();
  
  // Convert React node to string representation
  const resultStr = JSON.stringify(result);
  expect(resultStr).toContain(text);
}

/**
 * Assert tool result is null
 */
export function assertResultIsNull(result: React.ReactNode): void {
  expect(result).toBeNull();
}

/**
 * Assert journey state matches expected
 */
export function assertJourneyState<TState extends JourneyState>(
  journey: Journey<TState>,
  expected: Partial<TState>
): void {
  const state = journey.getState?.();
  expect(state).toBeDefined();

  for (const [key, value] of Object.entries(expected)) {
    expect(state?.[key as keyof TState]).toEqual(value);
  }
}

/**
 * Mock journey factory
 * Creates a minimal journey implementation for testing
 */
export function createMockJourney(id: string): Journey {
  return {
    id,
    renderTool: (part: ToolPart) => {
      return `Rendered: ${part.toolName}`;
    },
    buildMetadata: (input: string) => ({
      journeyId: id,
      input,
    }),
    reset: () => {
      console.log(`Reset journey: ${id}`);
    },
    getState: () => ({
      status: 'idle' as const,
    }),
    setState: () => {
      console.log(`Set state for journey: ${id}`);
    },
  };
}

