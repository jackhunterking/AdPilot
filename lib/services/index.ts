/**
 * Feature: Service Layer Export
 * Purpose: Central export point for all service implementations
 * References:
 *  - Service Contracts: lib/services/contracts/
 *  - Microservices Architecture: /micro.plan.md
 */

// Client service implementations (for use in client components)
// Note: This also re-exports all service contracts and types
export * from './client';

// Note: Server services should be imported directly from lib/services/server/
// to avoid ambiguous exports with client services

// Note: Additional service implementations (ad, creative, copy, targeting, destination, budget, analytics, meta)
// will be created as the refactoring progresses. For now, they will continue using existing
// patterns from contexts and API routes until Phase 2 is complete.

/**
 * Service Layer Architecture Notes:
 * 
 * - Each service is a singleton implementing its contract interface
 * - Services use Supabase for data persistence
 * - Services return ServiceResult<T> for consistent error handling
 * - Services can be injected into contexts via the Service Provider (Phase 2.4)
 * - Services are independent and can be tested in isolation
 * 
 * Migration Strategy:
 * 1. Create service implementation
 * 2. Update context to use service (thin wrapper)
 * 3. Test service independently
 * 4. Deploy incrementally
 */

