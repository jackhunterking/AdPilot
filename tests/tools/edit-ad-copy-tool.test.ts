/**
 * Feature: Edit Ad Copy Tool Tests
 * Purpose: Test editAdCopyTool with various edge cases including over-length text
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateObject } from 'ai'
import { editAdCopyTool } from '@/tools/edit-ad-copy-tool'

// Mock the AI SDK generateObject
vi.mock('ai', async () => {
  const actual = await vi.importActual('ai')
  return {
    ...actual,
    generateObject: vi.fn(),
  }
})

// Mock the gateway provider
vi.mock('@/lib/ai/gateway-provider', () => ({
  getModel: vi.fn(() => 'openai/gpt-4o'),
}))

describe('editAdCopyTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle over-length primaryText and clamp it', async () => {
    // Simulate AI returning text that exceeds the 125 char limit for primaryText
    const overLengthPrimaryText = 'a'.repeat(150) // 150 chars, exceeds 125 limit
    
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        primaryText: overLengthPrimaryText,
        headline: 'Test Headline',
        description: 'Test description',
      },
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      warnings: undefined,
      rawResponse: undefined,
    })

    const result = await editAdCopyTool.execute({
      variationIndex: 0,
      prompt: 'add more emojis to make it fun',
      current: {
        primaryText: 'Original text',
        headline: 'Original headline',
        description: 'Original description',
      },
      campaignId: 'test-campaign-id',
      preferEmojis: true,
    })

    expect(result.success).toBe(true)
    expect(result.copy?.primaryText).toBeDefined()
    expect(result.copy!.primaryText.length).toBeLessThanOrEqual(125)
  })

  it('should handle over-length headline and clamp it', async () => {
    // Simulate AI returning text that exceeds the 40 char limit for headline
    const overLengthHeadline = 'h'.repeat(60) // 60 chars, exceeds 40 limit
    
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        primaryText: 'Test primary text',
        headline: overLengthHeadline,
        description: 'Test description',
      },
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      warnings: undefined,
      rawResponse: undefined,
    })

    const result = await editAdCopyTool.execute({
      variationIndex: 0,
      prompt: 'make headline longer',
      current: {
        primaryText: 'Original text',
        headline: 'Original headline',
        description: 'Original description',
      },
      campaignId: 'test-campaign-id',
      preferEmojis: false,
    })

    expect(result.success).toBe(true)
    expect(result.copy?.headline).toBeDefined()
    expect(result.copy!.headline.length).toBeLessThanOrEqual(40)
  })

  it('should handle over-length description and clamp it', async () => {
    // Simulate AI returning text that exceeds the 30 char limit for description
    const overLengthDescription = 'd'.repeat(50) // 50 chars, exceeds 30 limit
    
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        primaryText: 'Test primary text',
        headline: 'Test Headline',
        description: overLengthDescription,
      },
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      warnings: undefined,
      rawResponse: undefined,
    })

    const result = await editAdCopyTool.execute({
      variationIndex: 0,
      prompt: 'make description longer',
      current: {
        primaryText: 'Original text',
        headline: 'Original headline',
        description: 'Original description',
      },
      campaignId: 'test-campaign-id',
      preferEmojis: false,
    })

    expect(result.success).toBe(true)
    expect(result.copy?.description).toBeDefined()
    expect(result.copy!.description.length).toBeLessThanOrEqual(30)
  })

  it('should handle Zod validation errors gracefully', async () => {
    // Simulate generateObject throwing a Zod validation error
    const zodError = new Error('Validation error: primaryText must be at most 125 characters')
    zodError.name = 'ZodError'
    
    vi.mocked(generateObject).mockRejectedValueOnce(zodError)

    const result = await editAdCopyTool.execute({
      variationIndex: 0,
      prompt: 'add emojis',
      current: {
        primaryText: 'Original text',
        headline: 'Original headline',
        description: 'Original description',
      },
      campaignId: 'test-campaign-id',
      preferEmojis: true,
    })

    // Tool should return error instead of throwing
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('validation')
  })

  it('should pass through valid copy without modification', async () => {
    const validCopy = {
      primaryText: 'Perfect length text for Meta ads',
      headline: 'Short headline',
      description: 'Brief description',
    }
    
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: validCopy,
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      warnings: undefined,
      rawResponse: undefined,
    })

    const result = await editAdCopyTool.execute({
      variationIndex: 0,
      prompt: 'improve this',
      current: {
        primaryText: 'Original text',
        headline: 'Original headline',
        description: 'Original description',
      },
      campaignId: 'test-campaign-id',
      preferEmojis: false,
    })

    expect(result.success).toBe(true)
    expect(result.copy).toEqual(validCopy)
  })
})

