/**
 * Feature: Client Services Index
 * Purpose: Export all client-side service implementations
 * Microservices: Client service layer aggregator
 * References:
 *  - Service Pattern: /journey-ui.plan.md
 *  - Service Contracts: lib/services/contracts/
 */

// ============================================================================
// Client Service Implementations
// ============================================================================

export { campaignServiceClient } from './campaign-service-client';
export { adServiceClient } from './ad-service-client';
export { workspaceServiceClient, type WorkspaceMode, type WorkspaceState } from './workspace-service-client';
export { saveServiceClient, type SaveAdInput, type SaveAdResult } from './save-service-client';
export { publishServiceClient, type PublishAdInput, type PublishAdResult, type ValidationError } from './publish-service-client';
export { creativeServiceClient } from './creative-service-client';
export { copyServiceClient } from './copy-service-client';
export { targetingServiceClient } from './targeting-service-client';
export { destinationServiceClient } from './destination-service-client';
export { budgetServiceClient } from './budget-service-client';
export { analyticsServiceClient } from './analytics-service-client';
export { metaServiceClient } from './meta-service-client';

// ============================================================================
// Re-export Service Contracts (for convenience)
// ============================================================================

export type {
  CampaignService,
  AdService,
  CreativeService,
  CopyService,
  TargetingService,
  DestinationService,
  BudgetService,
  AnalyticsService,
  MetaService,
} from '../contracts';

