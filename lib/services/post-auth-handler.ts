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
  draftAdId?: string
}

export interface CampaignResult {
  campaign: Campaign
  draftAdId?: string
}

export class PostAuthHandler {
  /**
   * Process temp prompt and create campaign
   * Returns campaign object with draft ad ID or null if no temp prompt
   */
  async processAuthCompletion(userMetadata?: Record<string, unknown>): Promise<CampaignResult | null> {
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
      const draftAdId = data.draftAdId
      
      console.log('[PostAuthHandler] Campaign created:', campaign.id, draftAdId ? `with draft ad: ${draftAdId}` : 'without draft ad')
      
      console.log('[PostAuthHandler] Campaign created and ready')
      
      // 3. Clean up temp prompt from localStorage
      this.clearTempPrompt()
      
      return { campaign, draftAdId }
      
    } catch (error) {
      console.error('[PostAuthHandler] Error:', error)
      throw error
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
}

export const postAuthHandler = new PostAuthHandler()

