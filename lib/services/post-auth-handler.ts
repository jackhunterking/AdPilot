/**
 * Post-Authentication Campaign Creation Service
 * 
 * Purpose: Handle temp prompt processing after any authentication method
 * References:
 *  - Backend Architecture: Campaign-first hierarchy
 *  - Service pattern from ad-data-service.ts
 *  - MASTER_PROJECT_ARCHITECTURE.md
 */

interface Campaign {
  id: string
  name: string
  status: string
  user_id: string
  initial_goal: string | null
  created_at: string
  updated_at: string
}

interface CreateCampaignResponse {
  campaign: Campaign
}

export class PostAuthHandler {
  /**
   * Process temp prompt and create campaign
   * Returns campaign object or throws error
   */
  async processAuthCompletion(userMetadata?: Record<string, unknown>): Promise<Campaign | null> {
    // 1. Check for temp prompt (localStorage or user metadata)
    const tempPromptId = this.getTempPromptId(userMetadata)
    
    if (!tempPromptId) {
      console.log('[PostAuthHandler] No temp prompt found')
      return null // No prompt to process
    }
    
    console.log('[PostAuthHandler] Processing temp prompt:', tempPromptId)
    
    try {
      // 2. Create campaign via API (waits for response)
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tempPromptId,
          name: 'Untitled Campaign' // Will be AI-generated
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create campaign')
      }
      
      const data = await response.json() as CreateCampaignResponse
      const campaign = data.campaign
      
      console.log('[PostAuthHandler] Campaign created:', campaign.id)
      
      // 3. Verify campaign exists before returning
      const verified = await this.verifyCampaignExists(campaign.id)
      if (!verified) {
        console.warn('[PostAuthHandler] Campaign created but not immediately available, retrying...')
        // Retry once after brief delay
        await this.sleep(500)
        const retriedVerification = await this.verifyCampaignExists(campaign.id)
        if (!retriedVerification) {
          throw new Error('Campaign created but not immediately available')
        }
      }
      
      console.log('[PostAuthHandler] Campaign verified and ready')
      
      // 4. Clean up temp prompt from localStorage
      this.clearTempPrompt()
      
      return campaign
      
    } catch (error) {
      console.error('[PostAuthHandler] Error:', error)
      throw error
    }
  }
  
  /**
   * Verify campaign exists in database
   * Simple GET request to confirm availability
   */
  private async verifyCampaignExists(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`)
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Get temp prompt ID from localStorage or user metadata
   */
  private getTempPromptId(userMetadata?: Record<string, unknown>): string | null {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const localId = localStorage.getItem('temp_prompt_id')
      if (localId) {
        console.log('[PostAuthHandler] Found temp prompt in localStorage:', localId)
        return localId
      }
    }
    
    // Fallback to user metadata (for OAuth flows)
    if (userMetadata && typeof userMetadata.temp_prompt_id === 'string') {
      console.log('[PostAuthHandler] Found temp prompt in user metadata:', userMetadata.temp_prompt_id)
      return userMetadata.temp_prompt_id
    }
    
    return null
  }
  
  /**
   * Clear temp prompt from localStorage
   */
  private clearTempPrompt(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('temp_prompt_id')
      console.log('[PostAuthHandler] Cleared temp prompt from localStorage')
    }
  }
  
  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const postAuthHandler = new PostAuthHandler()

