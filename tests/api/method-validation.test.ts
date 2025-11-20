/**
 * Feature: API v1 Method Validation Tests
 * Purpose: Integration tests to verify HTTP method enforcement across all routes
 * References:
 *  - API Contracts: lib/types/api-v1-contracts.ts
 *  - Middleware: app/api/v1/_middleware.ts
 *  - Route Inventory: API_METHOD_INVENTORY.md
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { API_V1_ROUTES, validateRouteMethod, apiV1 } from '@/lib/types/api-v1-contracts'

describe('API v1 Method Validation', () => {
  describe('Route Contract Registry', () => {
    it('should have all 43 routes defined', () => {
      const routeCount = Object.keys(API_V1_ROUTES).length
      expect(routeCount).toBe(43)
    })

    it('should define methods for critical routes', () => {
      // Campaigns
      expect(API_V1_ROUTES['/api/v1/campaigns']).toEqual(['GET', 'POST'])
      expect(API_V1_ROUTES['/api/v1/campaigns/[id]']).toEqual(['GET', 'PATCH', 'DELETE'])
      
      // Ads - especially the save endpoint that had the bug
      expect(API_V1_ROUTES['/api/v1/ads']).toEqual(['GET', 'POST'])
      expect(API_V1_ROUTES['/api/v1/ads/[id]']).toEqual(['GET', 'PATCH', 'DELETE'])
      expect(API_V1_ROUTES['/api/v1/ads/[id]/save']).toEqual(['GET', 'PUT']) // ✅ PUT, not POST!
      expect(API_V1_ROUTES['/api/v1/ads/[id]/publish']).toEqual(['POST'])
      
      // Meta
      expect(API_V1_ROUTES['/api/v1/meta/status']).toEqual(['GET'])
      expect(API_V1_ROUTES['/api/v1/meta/forms']).toEqual(['GET', 'POST'])
      
      // Chat
      expect(API_V1_ROUTES['/api/v1/chat']).toEqual(['POST'])
    })

    it('should not allow POST for /ads/[id]/save (the original bug)', () => {
      const allowedMethods = API_V1_ROUTES['/api/v1/ads/[id]/save']
      expect(allowedMethods).not.toContain('POST')
      expect(allowedMethods).toContain('PUT')
      expect(allowedMethods).toContain('GET')
    })
  })

  describe('Runtime Method Validation', () => {
    it('should validate correct methods without throwing', () => {
      expect(() => validateRouteMethod('/api/v1/ads/[id]/save', 'GET')).not.toThrow()
      expect(() => validateRouteMethod('/api/v1/ads/[id]/save', 'PUT')).not.toThrow()
    })

    it('should throw TypeError for incorrect methods', () => {
      expect(() => validateRouteMethod('/api/v1/ads/[id]/save', 'POST')).toThrow(TypeError)
      expect(() => validateRouteMethod('/api/v1/ads/[id]/save', 'PATCH')).toThrow(TypeError)
      expect(() => validateRouteMethod('/api/v1/ads/[id]/save', 'DELETE')).toThrow(TypeError)
    })

    it('should throw TypeError for non-existent routes', () => {
      expect(() => validateRouteMethod('/api/v1/ads/[id]/duplicate', 'POST')).toThrow(TypeError)
      expect(() => validateRouteMethod('/api/v1/fake/route', 'GET')).toThrow(TypeError)
    })

    it('should provide helpful error messages', () => {
      try {
        validateRouteMethod('/api/v1/ads/[id]/save', 'POST')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError)
        expect((error as Error).message).toContain('POST')
        expect((error as Error).message).toContain('not allowed')
        expect((error as Error).message).toContain('GET, PUT')
      }
    })

    it('should normalize dynamic routes correctly', () => {
      // Should recognize /api/v1/ads/abc-123/save as /api/v1/ads/[id]/save
      expect(() => validateRouteMethod('/api/v1/ads/abc-123/save', 'PUT')).not.toThrow()
      expect(() => validateRouteMethod('/api/v1/ads/abc-123/save', 'POST')).toThrow()
      
      // Should recognize UUIDs
      expect(() => validateRouteMethod('/api/v1/ads/550e8400-e29b-41d4-a716-446655440000/save', 'PUT')).not.toThrow()
      
      // Should recognize numeric IDs
      expect(() => validateRouteMethod('/api/v1/campaigns/123/state', 'GET')).not.toThrow()
    })
  })

  describe('Type-Safe Wrapper', () => {
    it('should handle success responses', async () => {
      // Mock successful response
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ success: true, data: { id: '123', name: 'Test' } }),
      } as Response)

      const result = await apiV1('/api/v1/campaigns', 'GET')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveProperty('id')
      }
    })

    it('should handle error responses', async () => {
      // Mock error response
      global.fetch = async () => ({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'not_found', message: 'Campaign not found' }
        }),
      } as Response)

      const result = await apiV1('/api/v1/campaigns/[id]', 'GET')
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('not_found')
        expect(result.error.message).toBe('Campaign not found')
      }
    })

    it('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = async () => {
        throw new Error('Network error')
      }

      const result = await apiV1('/api/v1/campaigns', 'GET')
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('client_error')
        expect(result.error.message).toContain('Network error')
      }
    })

    it('should add query parameters correctly', async () => {
      let capturedUrl = ''
      global.fetch = async (url: string) => {
        capturedUrl = url
        return {
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response
      }

      await apiV1('/api/v1/campaigns', 'GET', {
        params: { limit: 10, status: 'active' }
      })
      
      expect(capturedUrl).toContain('limit=10')
      expect(capturedUrl).toContain('status=active')
    })

    it('should serialize body as JSON', async () => {
      let capturedBody = ''
      global.fetch = async (_url: string, options?: RequestInit) => {
        capturedBody = options?.body as string
        return {
          ok: true,
          json: async () => ({ success: true, data: { id: '123' } }),
        } as Response
      }

      await apiV1('/api/v1/campaigns', 'POST', {
        body: { name: 'Test Campaign', goalType: 'leads' }
      })
      
      const parsed = JSON.parse(capturedBody)
      expect(parsed.name).toBe('Test Campaign')
      expect(parsed.goalType).toBe('leads')
    })

    it('should set correct headers', async () => {
      let capturedHeaders: HeadersInit | undefined
      global.fetch = async (_url: string, options?: RequestInit) => {
        capturedHeaders = options?.headers
        return {
          ok: true,
          json: async () => ({ success: true, data: {} }),
        } as Response
      }

      await apiV1('/api/v1/campaigns', 'POST', {
        body: { name: 'Test' }
      })
      
      const headers = capturedHeaders as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('Critical Route Method Enforcement', () => {
    // Test the routes that previously had issues
    const criticalRoutes = [
      { route: '/api/v1/ads/[id]/save', allowed: ['GET', 'PUT'], disallowed: ['POST', 'PATCH', 'DELETE'] },
      { route: '/api/v1/ads/[id]/publish', allowed: ['POST'], disallowed: ['GET', 'PUT', 'PATCH', 'DELETE'] },
      { route: '/api/v1/campaigns/[id]', allowed: ['GET', 'PATCH', 'DELETE'], disallowed: ['POST', 'PUT'] },
    ] as const

    criticalRoutes.forEach(({ route, allowed, disallowed }) => {
      describe(route, () => {
        allowed.forEach(method => {
          it(`should allow ${method}`, () => {
            expect(() => validateRouteMethod(route, method)).not.toThrow()
          })
        })

        disallowed.forEach(method => {
          it(`should reject ${method}`, () => {
            expect(() => validateRouteMethod(route, method)).toThrow(TypeError)
          })
        })
      })
    })
  })

  describe('Comprehensive Route Coverage', () => {
    it('should test all 43 routes have at least one allowed method', () => {
      Object.entries(API_V1_ROUTES).forEach(([route, methods]) => {
        expect(methods.length).toBeGreaterThan(0)
        expect(Array.isArray(methods)).toBe(true)
      })
    })

    it('should validate each route accepts its defined methods', () => {
      let testedCount = 0
      
      Object.entries(API_V1_ROUTES).forEach(([route, methods]) => {
        methods.forEach(method => {
          expect(() => validateRouteMethod(route, method)).not.toThrow()
          testedCount++
        })
      })
      
      // Should test at least 59 method combinations (sum of all methods across routes)
      expect(testedCount).toBeGreaterThanOrEqual(59)
    })
  })

  describe('TypeScript Type Safety', () => {
    it('should enforce correct methods at type level', () => {
      // These assertions verify TypeScript compilation
      // If they compile, type safety is working
      
      type SaveMethods = typeof API_V1_ROUTES['/api/v1/ads/[id]/save'][number]
      type PublishMethods = typeof API_V1_ROUTES['/api/v1/ads/[id]/publish'][number]
      
      const saveMethod: SaveMethods = 'GET' // ✅ Valid
      const publishMethod: PublishMethods = 'POST' // ✅ Valid
      
      // @ts-expect-error - POST not allowed for save
      const wrongSaveMethod: SaveMethods = 'POST' // ❌ Should fail compilation
      
      // @ts-expect-error - GET not allowed for publish
      const wrongPublishMethod: PublishMethods = 'GET' // ❌ Should fail compilation
      
      // Verify the types are correct
      expect(saveMethod).toBe('GET')
      expect(publishMethod).toBe('POST')
      // wrongSaveMethod and wrongPublishMethod intentionally fail compilation
    })
  })
})

describe('Regression Tests for Original Bug', () => {
  it('should prevent the original POST/PATCH → PUT bug from recurring', () => {
    const route = '/api/v1/ads/[id]/save'
    const allowedMethods = API_V1_ROUTES[route]
    
    // Original bug: clients were using POST
    expect(allowedMethods).not.toContain('POST')
    expect(() => validateRouteMethod(route, 'POST')).toThrow()
    
    // Original bug: some clients were using PATCH
    expect(allowedMethods).not.toContain('PATCH')
    expect(() => validateRouteMethod(route, 'PATCH')).toThrow()
    
    // Correct method
    expect(allowedMethods).toContain('PUT')
    expect(() => validateRouteMethod(route, 'PUT')).not.toThrow()
  })

  it('should prevent calling non-existent duplicate endpoint', () => {
    // This endpoint was being called but doesn't exist
    expect(() => validateRouteMethod('/api/v1/ads/[id]/duplicate', 'POST')).toThrow()
  })

  it('should enforce correct path for instant forms', () => {
    // Correct path
    expect(() => validateRouteMethod('/api/v1/meta/instant-forms/[id]', 'GET')).not.toThrow()
    
    // Wrong path (was used in client code)
    expect(() => validateRouteMethod('/api/v1/meta/forms/[id]', 'GET')).toThrow()
  })
})

