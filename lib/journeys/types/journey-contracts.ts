/**
 * Feature: Journey Framework Type System
 * Purpose: Core type contracts for journey-based microservices architecture
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Microservices Architecture: /micro.plan.md
 */

// ============================================================================
// Core Journey Contracts
// ============================================================================

/**
 * ToolPart represents a tool invocation from the AI SDK
 * This is the bridge between AI tool calls and journey rendering
 */
export interface ToolPart {
  type: string; // e.g., 'tool-addLocations', 'tool-generateVariations'
  toolCallId: string;
  toolName: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  errorText?: string;
  [key: string]: unknown; // Allow additional AI SDK fields
}

/**
 * Journey State - Generic state container for any journey
 */
export interface JourneyState {
  status: 'idle' | 'setup-in-progress' | 'completed' | 'error';
  errorMessage?: string;
  [key: string]: unknown; // Allow journey-specific state fields
}

/**
 * Journey Metadata - Data passed to AI for context building
 */
export interface JourneyMetadata {
  journeyId: string;
  mode?: string; // e.g., 'include' | 'exclude' for location
  input?: string; // User input to process
  context?: Record<string, unknown>; // Additional context
  [key: string]: unknown;
}

/**
 * Journey Event - Cross-journey communication
 */
export interface JourneyEvent<TPayload = unknown> {
  type: string;
  journeyId: string;
  payload: TPayload;
  timestamp: number;
  source?: string;
}

/**
 * Journey - Core interface for all journey implementations
 * 
 * A Journey is a self-contained microservice that handles a specific user workflow.
 * Each journey is responsible for:
 * - Rendering tool invocations (AI responses)
 * - Building metadata for AI context
 * - Managing its own state
 * - Lifecycle management (activate/deactivate)
 */
export interface Journey<TState extends JourneyState = JourneyState> {
  /**
   * Unique identifier for this journey
   */
  id: string;

  /**
   * Render tool invocations from AI
   * @param part - Tool invocation to render
   * @returns React node to display in chat
   */
  renderTool: (part: ToolPart) => React.ReactNode;

  /**
   * Build metadata for AI context based on user input
   * @param input - User input string
   * @returns Metadata object to inject into AI request
   */
  buildMetadata?: (input: string) => JourneyMetadata;

  /**
   * Reset journey to initial state
   */
  reset?: () => void;

  /**
   * Get current journey state
   */
  getState?: () => TState;

  /**
   * Set journey state
   */
  setState?: (state: Partial<TState>) => void;

  /**
   * Called when journey becomes active
   */
  onActivate?: () => void;

  /**
   * Called when journey becomes inactive
   */
  onDeactivate?: () => void;

  /**
   * Current mode (for journeys that support modes)
   */
  mode?: string;

  /**
   * Whether journey is currently active
   */
  isActive?: boolean;
}

// ============================================================================
// Service Contracts
// ============================================================================

/**
 * Validation Result for service inputs/outputs
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

/**
 * Service Contract - Generic interface for service operations
 * 
 * Services are business logic modules that journeys depend on.
 * They follow a consistent execute pattern with optional validation.
 */
export interface ServiceContract<TInput = unknown, TOutput = unknown> {
  /**
   * Execute the service operation
   * @param input - Service input data
   * @returns Promise resolving to service output
   */
  execute: (input: TInput) => Promise<TOutput>;

  /**
   * Validate service input before execution
   * @param input - Input to validate
   * @returns Validation result
   */
  validate?: (input: TInput) => ValidationResult | Promise<ValidationResult>;
}

/**
 * Service Result - Standard return type for service operations
 */
export interface ServiceResult<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================================================
// Journey Hook Pattern
// ============================================================================

/**
 * Journey Hook - Custom hook interface for journey state management
 * 
 * Each journey can expose a custom hook for state management.
 * This follows React hooks patterns while maintaining type safety.
 */
export interface JourneyHook<TState extends JourneyState = JourneyState> {
  /**
   * Current state
   */
  state: TState;

  /**
   * Update state
   */
  setState: (state: Partial<TState>) => void;

  /**
   * Reset to initial state
   */
  reset: () => void;

  /**
   * Current mode (if applicable)
   */
  mode?: string;

  /**
   * Set mode
   */
  setMode?: (mode: string) => void;

  /**
   * Whether journey is active
   */
  isActive: boolean;

  /**
   * Activate journey
   */
  activate?: () => void;

  /**
   * Deactivate journey
   */
  deactivate?: () => void;
}

// ============================================================================
// Journey Registry Contracts
// ============================================================================

/**
 * Journey Registration Config
 */
export interface JourneyRegistration {
  id: string;
  factory: () => Journey;
  dependencies?: string[]; // IDs of service dependencies
  toolNames?: string[]; // Tool names this journey handles
  priority?: number; // Higher priority journeys handle tools first
}

/**
 * Journey Middleware - Intercepts journey operations
 */
export interface JourneyMiddleware {
  name: string;
  
  /**
   * Called before tool rendering
   */
  beforeRender?: (part: ToolPart, journey: Journey) => ToolPart | null;
  
  /**
   * Called after tool rendering
   */
  afterRender?: (part: ToolPart, journey: Journey, result: React.ReactNode) => React.ReactNode;
  
  /**
   * Called on journey activation
   */
  onActivate?: (journey: Journey) => void;
  
  /**
   * Called on journey deactivation
   */
  onDeactivate?: (journey: Journey) => void;
  
  /**
   * Called on journey error
   */
  onError?: (error: Error, journey: Journey, context?: unknown) => void;
}

/**
 * Journey Registry Interface
 */
export interface JourneyRegistry {
  /**
   * Register a journey
   */
  register(registration: JourneyRegistration): void;

  /**
   * Unregister a journey
   */
  unregister(journeyId: string): void;

  /**
   * Get journey by ID
   */
  getJourney(journeyId: string): Journey | undefined;

  /**
   * Get journey by tool name
   */
  getJourneyForTool(toolName: string): Journey | undefined;

  /**
   * Get all registered journeys
   */
  getAllJourneys(): Journey[];

  /**
   * Add middleware
   */
  addMiddleware(middleware: JourneyMiddleware): void;

  /**
   * Remove middleware
   */
  removeMiddleware(middlewareName: string): void;
}

// ============================================================================
// Event Bus Contracts
// ============================================================================

/**
 * Event Handler
 */
export type EventHandler<TPayload = unknown> = (event: JourneyEvent<TPayload>) => void | Promise<void>;

/**
 * Event Bus Interface - Cross-journey communication
 */
export interface EventBus {
  /**
   * Emit an event
   */
  emit<TPayload = unknown>(type: string, payload: TPayload, source?: string): void;

  /**
   * Subscribe to events
   */
  on<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): () => void;

  /**
   * Subscribe to events once
   */
  once<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): () => void;

  /**
   * Unsubscribe from events
   */
  off<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): void;

  /**
   * Clear all listeners
   */
  clear(): void;
}

// ============================================================================
// State Persistence Contracts
// ============================================================================

/**
 * State Storage Interface - Persist journey state
 */
export interface StateStorage {
  /**
   * Get state for a journey
   */
  get<TState extends JourneyState = JourneyState>(journeyId: string): TState | null;

  /**
   * Set state for a journey
   */
  set<TState extends JourneyState = JourneyState>(journeyId: string, state: TState): void;

  /**
   * Remove state for a journey
   */
  remove(journeyId: string): void;

  /**
   * Clear all stored states
   */
  clear(): void;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for ToolPart
 */
export function isToolPart(value: unknown): value is ToolPart {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as ToolPart).type === 'string' &&
    'toolCallId' in value &&
    typeof (value as ToolPart).toolCallId === 'string'
  );
}

/**
 * Type guard for JourneyState
 */
export function isJourneyState(value: unknown): value is JourneyState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as JourneyState).status === 'string'
  );
}

/**
 * Type guard for ServiceResult
 */
export function isServiceResult<TData = unknown>(value: unknown): value is ServiceResult<TData> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ServiceResult).success === 'boolean'
  );
}

