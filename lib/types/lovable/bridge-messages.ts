/**
 * Feature: Lovable Integration - Bridge Message Contract
 * Purpose: Type-safe postMessage communication between Chrome extension and iframe
 * References:
 *  - Chrome Extension: content scripts communicate with iframe
 *  - UI Service: iframe receives messages from extension
 *  - Contract-based communication for microservices
 */

import type { LovableProjectContext, LovableImage } from './project';

/**
 * Base message structure for postMessage communication
 */
export interface BridgeMessage<T = unknown> {
  type: BridgeMessageType;
  payload: T;
  timestamp: number;
  requestId?: string; // For request-response pattern
}

/**
 * All message types (extension ↔ iframe)
 */
export enum BridgeMessageType {
  // Extension → Iframe (UI)
  PROJECT_CONTEXT = 'ADPILOT_PROJECT_CONTEXT',
  NEW_IMAGES = 'ADPILOT_NEW_IMAGES',
  SUPABASE_DETECTED = 'ADPILOT_SUPABASE_DETECTED',
  SYNC_EVENT = 'ADPILOT_SYNC_EVENT',
  
  // Iframe (UI) → Extension
  REQUEST_CONTEXT = 'ADPILOT_REQUEST_CONTEXT',
  START_MONITORING = 'ADPILOT_START_MONITORING',
  STOP_MONITORING = 'ADPILOT_STOP_MONITORING',
  IMPORT_IMAGE = 'ADPILOT_IMPORT_IMAGE',
  
  // Bidirectional
  PING = 'ADPILOT_PING',
  PONG = 'ADPILOT_PONG',
  ERROR = 'ADPILOT_ERROR',
}

/**
 * Extension sends project context to iframe on load
 */
export interface ProjectContextMessage {
  lovableProjectId: string;
  lovableProjectUrl: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  timestamp: number;
}

/**
 * Extension detected new images in Lovable Storage
 */
export interface NewImagesMessage {
  images: LovableImage[];
  bucket: string;
  detectedAt: number;
}

/**
 * Extension detected Supabase configuration
 */
export interface SupabaseDetectedMessage {
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectRef: string;
}

/**
 * Sync event (for UI updates)
 */
export interface SyncEventMessage {
  event: 'creative_added' | 'creative_deleted' | 'campaign_updated' | 'sync_completed';
  data: Record<string, unknown>;
}

/**
 * Request project context from extension
 */
export interface RequestContextMessage {
  requestId: string;
}

/**
 * Start monitoring Lovable Storage for images
 */
export interface StartMonitoringMessage {
  supabaseUrl: string;
  supabaseAnonKey: string;
  buckets?: string[]; // Default: ['lead-photos', 'assets', 'generated-images']
}

/**
 * Stop monitoring
 */
export interface StopMonitoringMessage {
  reason?: string;
}

/**
 * Request to import specific image
 */
export interface ImportImageMessage {
  imageUrl: string;
  campaignId: string;
  metadata?: {
    prompt?: string;
    generatedBy?: string;
    [key: string]: unknown;
  };
}

/**
 * Error message
 */
export interface ErrorMessage {
  code: string;
  message: string;
  details?: unknown;
  originalMessageType?: BridgeMessageType;
}

/**
 * Ping/Pong for health check
 */
export interface PingMessage {
  sentAt: number;
}

export interface PongMessage {
  receivedAt: number;
  sentAt: number;
}

/**
 * Type guard for bridge messages
 */
export function isBridgeMessage(data: unknown): data is BridgeMessage {
  if (typeof data !== 'object' || data === null) return false;
  
  const msg = data as Record<string, unknown>;
  
  return (
    typeof msg.type === 'string' &&
    msg.type.startsWith('ADPILOT_') &&
    typeof msg.timestamp === 'number' &&
    'payload' in msg
  );
}

/**
 * Type guard for specific message types
 */
export function isProjectContextMessage(
  msg: BridgeMessage
): msg is BridgeMessage<ProjectContextMessage> {
  return msg.type === BridgeMessageType.PROJECT_CONTEXT;
}

export function isNewImagesMessage(
  msg: BridgeMessage
): msg is BridgeMessage<NewImagesMessage> {
  return msg.type === BridgeMessageType.NEW_IMAGES;
}

export function isStartMonitoringMessage(
  msg: BridgeMessage
): msg is BridgeMessage<StartMonitoringMessage> {
  return msg.type === BridgeMessageType.START_MONITORING;
}

export function isImportImageMessage(
  msg: BridgeMessage
): msg is BridgeMessage<ImportImageMessage> {
  return msg.type === BridgeMessageType.IMPORT_IMAGE;
}

export function isErrorMessage(
  msg: BridgeMessage
): msg is BridgeMessage<ErrorMessage> {
  return msg.type === BridgeMessageType.ERROR;
}

