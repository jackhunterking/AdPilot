/**
 * Test: Temp Prompt Route (v1)
 * Purpose: Unit tests for temp prompt storage API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-id' },
            error: null
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'test-id',
                prompt_text: 'Test prompt',
                goal_type: 'leads',
                expires_at: new Date(Date.now() + 3600000).toISOString(),
                used: false
              },
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

describe('v1 temp-prompt route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/temp-prompt', () => {
    it('should create temp prompt', async () => {
      const { POST } = await import('../../app/api/v1/temp-prompt/route');
      
      const request = new NextRequest('http://localhost/api/v1/temp-prompt', {
        method: 'POST',
        body: JSON.stringify({ promptText: 'Test prompt', goalType: 'leads' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tempId).toBe('test-id');
    });

    it('should reject empty prompt text', async () => {
      const { POST } = await import('../../app/api/v1/temp-prompt/route');
      
      const request = new NextRequest('http://localhost/api/v1/temp-prompt', {
        method: 'POST',
        body: JSON.stringify({ promptText: '', goalType: 'leads' })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/temp-prompt', () => {
    it('should retrieve temp prompt', async () => {
      const { GET } = await import('../../app/api/v1/temp-prompt/route');
      
      const request = new NextRequest('http://localhost/api/v1/temp-prompt?id=test-id', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.promptText).toBe('Test prompt');
      expect(data.goalType).toBe('leads');
    });

    it('should reject missing id', async () => {
      const { GET } = await import('../../app/api/v1/temp-prompt/route');
      
      const request = new NextRequest('http://localhost/api/v1/temp-prompt', {
        method: 'GET'
      });

      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });
  });
});

