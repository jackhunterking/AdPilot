/**
 * Feature: Lovable Integration - Type Exports
 * Purpose: Central export point for all Lovable types
 */

// Project types
export type {
  LovableProjectLink,
  LovableProjectMetadata,
  LinkProjectInput,
  LovableProjectContext,
  LovableImage,
  CampaignSnapshot,
  ServiceResult,
  ValidationResult,
} from './project';

// Bridge message types
export {
  BridgeMessageType,
  isBridgeMessage,
  isProjectContextMessage,
  isNewImagesMessage,
  isStartMonitoringMessage,
  isImportImageMessage,
  isErrorMessage,
} from './bridge-messages';

export type {
  BridgeMessage,
  ProjectContextMessage,
  NewImagesMessage,
  SupabaseDetectedMessage,
  SyncEventMessage,
  RequestContextMessage,
  StartMonitoringMessage,
  StopMonitoringMessage,
  ImportImageMessage,
  ErrorMessage,
  PingMessage,
  PongMessage,
} from './bridge-messages';

// Conversion types
export type {
  LovableConversion,
  ConversionType,
  ConversionSource,
  ConversionData,
  ConversionInput,
  WebhookConversionData,
  ConversionQueryOptions,
  ConversionRate,
  DateRange,
  EdgeFunctionTemplate,
  ConversionSummary,
} from './conversions';

// Sync state types
export type {
  SyncState,
  SyncStatus,
  PendingChange,
  ChangeType,
  EntityType,
  SyncConflict,
  ConflictResolution,
  SyncMetadata,
  ImageImportRecord,
  ImportStatus,
  ImageImportMetadata,
  SyncResult,
  ImageExistenceCheck,
} from './sync-state';

