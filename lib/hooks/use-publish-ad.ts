/**
 * Feature: Use Publish Ad Hook
 * Purpose: Custom hook for managing ad publishing with loading states and error handling
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

import { useState, useCallback } from 'react'
import type { AdStatus, PublishError } from '../types/workspace'
import { toast } from 'sonner'

interface PublishAdResult {
  success: boolean
  meta_ad_id?: string
  status?: AdStatus
  error?: PublishError
}

interface UsePublishAdReturn {
  publishAd: (campaignId: string, adId: string) => Promise<PublishAdResult>
  isPublishing: boolean
  error: PublishError | null
}

/**
 * Hook to handle ad publishing
 */
export function usePublishAd(): UsePublishAdReturn {
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<PublishError | null>(null)

  const publishAd = useCallback(async (
    campaignId: string, 
    adId: string
  ): Promise<PublishAdResult> => {
    setIsPublishing(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/v1/ads/${adId}/publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const data: PublishAdResult = await response.json()

      if (!response.ok || !data.success) {
        const publishError: PublishError = data.error || {
          code: 'api_error',
          message: 'Failed to publish ad',
          userMessage: 'Failed to publish ad. Please try again.',
          recoverable: true,
          timestamp: new Date().toISOString()
        }

        setError(publishError)
        toast.error('Publishing failed', {
          description: publishError.userMessage
        })

        return {
          success: false,
          error: publishError
        }
      }

      // Success
      toast.success('Ad submitted for review', {
        description: 'Meta is reviewing your ad. This typically takes up to 24 hours.'
      })

      return {
        success: true,
        meta_ad_id: data.meta_ad_id,
        status: data.status
      }

    } catch (err) {
      const publishError: PublishError = {
        code: 'network_error',
        message: err instanceof Error ? err.message : 'Network error',
        userMessage: 'Network error. Please check your connection and try again.',
        recoverable: true,
        timestamp: new Date().toISOString()
      }

      setError(publishError)
      toast.error('Network error', {
        description: publishError.userMessage
      })

      return {
        success: false,
        error: publishError
      }
    } finally {
      setIsPublishing(false)
    }
  }, [])

  return {
    publishAd,
    isPublishing,
    error
  }
}

