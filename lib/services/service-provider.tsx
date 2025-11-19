/**
 * Feature: Service Provider
 * Purpose: Dependency injection container for services
 * References:
 *  - Service Contracts: lib/services/contracts/
 *  - React Context API
 */

"use client";

import React, { createContext, useContext, type ReactNode } from 'react';
import {
  campaignServiceClient,
  adServiceClient,
  creativeServiceClient,
  copyServiceClient,
  targetingServiceClient,
  destinationServiceClient,
  budgetServiceClient,
  analyticsServiceClient,
  metaServiceClient,
} from './client';
import type {
  CampaignService,
  AdService,
  CreativeService,
  CopyService,
  TargetingService,
  DestinationService,
  BudgetService,
  AnalyticsService,
  MetaService,
} from './contracts';

// ============================================================================
// Service Context
// ============================================================================

interface ServiceContextValue {
  campaignService: CampaignService;
  adService: AdService;
  creativeService: CreativeService;
  copyService: CopyService;
  targetingService: TargetingService;
  destinationService: DestinationService;
  budgetService: BudgetService;
  analyticsService: AnalyticsService;
  metaService: MetaService;
}

const ServiceContext = createContext<ServiceContextValue | undefined>(undefined);

// ============================================================================
// Service Provider Component
// ============================================================================

interface ServiceProviderProps {
  children: ReactNode;
  /**
   * Override services for testing
   */
  services?: Partial<ServiceContextValue>;
}

/**
 * Service Provider
 * 
 * Provides all services to the application via React Context.
 * Services can be overridden for testing purposes.
 * 
 * @example
 * ```tsx
 * <ServiceProvider>
 *   <App />
 * </ServiceProvider>
 * ```
 * 
 * @example Testing with mocks
 * ```tsx
 * <ServiceProvider services={{ campaignService: mockCampaignService }}>
 *   <ComponentUnderTest />
 * </ServiceProvider>
 * ```
 */
export function ServiceProvider({ children, services = {} }: ServiceProviderProps) {
  const value: ServiceContextValue = {
    campaignService: services.campaignService || campaignServiceClient,
    adService: services.adService || adServiceClient,
    creativeService: services.creativeService || creativeServiceClient,
    copyService: services.copyService || copyServiceClient,
    targetingService: services.targetingService || targetingServiceClient,
    destinationService: services.destinationService || destinationServiceClient,
    budgetService: services.budgetService || budgetServiceClient,
    analyticsService: services.analyticsService || analyticsServiceClient,
    metaService: services.metaService || metaServiceClient,
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
}

// ============================================================================
// Service Hooks
// ============================================================================

/**
 * Get all services
 */
export function useServices(): ServiceContextValue {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

/**
 * Get campaign service
 */
export function useCampaignService(): CampaignService {
  const { campaignService } = useServices();
  return campaignService;
}

/**
 * Get ad service
 */
export function useAdService(): AdService {
  const { adService } = useServices();
  return adService;
}

/**
 * Get creative service
 */
export function useCreativeService(): CreativeService {
  const { creativeService } = useServices();
  return creativeService;
}

/**
 * Get copy service
 */
export function useCopyService(): CopyService {
  const { copyService } = useServices();
  return copyService;
}

/**
 * Get targeting service
 */
export function useTargetingService(): TargetingService {
  const { targetingService } = useServices();
  return targetingService;
}

/**
 * Get destination service
 */
export function useDestinationService(): DestinationService {
  const { destinationService } = useServices();
  return destinationService;
}

/**
 * Get budget service
 */
export function useBudgetService(): BudgetService {
  const { budgetService } = useServices();
  return budgetService;
}

/**
 * Get analytics service
 */
export function useAnalyticsService(): AnalyticsService {
  const { analyticsService } = useServices();
  return analyticsService;
}

/**
 * Get meta service
 */
export function useMetaService(): MetaService {
  const { metaService } = useServices();
  return metaService;
}

