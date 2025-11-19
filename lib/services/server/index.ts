/**
 * Feature: Server Services Index
 * Purpose: Export all server-side service implementations
 * Microservices: Server service layer aggregator
 * References:
 *  - Service Pattern: /journey-ui.plan.md
 */

// ============================================================================
// Server Service Implementations (use in API routes only)
// ============================================================================

// Existing services
export { campaignService } from './campaign-service-server';
export { WorkspaceService, type WorkspaceMode, type WorkspaceState } from './workspace-service-server';
export { SaveService, type SaveAdInput, type SaveAdResult } from './save-service-server';
export { PublishService, type PublishAdInput, type PublishAdResult, type ValidationError } from './publish-service-server';

// Newly implemented services (Phase 2 - Microservices Completion)
export { adServiceServer } from './ad-service-server';
export { metaServiceServer } from './meta-service-server';
export { targetingServiceServer } from './targeting-service-server';
export { creativeServiceServer } from './creative-service-server';
export { copyServiceServer } from './copy-service-server';
export { destinationServiceServer } from './destination-service-server';
export { budgetServiceServer } from './budget-service-server';
export { analyticsServiceServer } from './analytics-service-server';

