/**
 * Post-Authentication Campaign Creation Service
 * 
 * Purpose: Handle temp prompt processing after any authentication method
 * Journey Context:
 *   - Journey 1: Processes temp_prompt after authentication → Creates campaign automatically
 *   - Journey 2/3: No temp_prompt found → Returns null (no automation)
 * Key Behavior:
 *   - Priority: localStorage.temp_prompt_id > user_metadata.temp_prompt_id
 *   - localStorage used for email/password flows
 *   - user_metadata used for OAuth flows (survives redirects)
 *   - Cleans up localStorage after successful campaign creation
 * References:
 *   - AUTH_JOURNEY_MASTER_PLAN.md - Journey 1, Journey 2, Journey 3
 *   - MASTER_PROJECT_ARCHITECTURE.md - Campaign-first hierarchy
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
      console.log('[JOURNEY-2/3] PostAuthHandler: No temp prompt found (no automation)')
      return null // No prompt to process
    }
    
    console.log('[JOURNEY-1] PostAuthHandler: Processing temp prompt for campaign creation:', tempPromptId)
    
    try {
      // 2. Create campaign via API (waits for response)
      const response = await fetch('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tempPromptId
          // Omit 'name' to trigger AI auto-naming
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create campaign')
      }
      
      const data = await response.json() as CreateCampaignResponse
      const campaign = data.campaign
      const draftAdId = data.draftAdId
      
      console.log('[JOURNEY-1] PostAuthHandler: Campaign created:', campaign.id, draftAdId ? `with draft ad: ${draftAdId}` : 'without draft ad')
      
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
    // Check localStorage first (priority for Journey 1 email/password)
    if (typeof window !== 'undefined') {
      const localId = localStorage.getItem('temp_prompt_id')
      if (localId) {
        console.log('[JOURNEY-1] PostAuthHandler: Found temp prompt in localStorage (email/password flow):', localId)
        return localId
      }
    }
    
    // Fallback to user metadata (for OAuth flows - Journey 1 via Google)
    if (userMetadata && typeof userMetadata.temp_prompt_id === 'string') {
      console.log('[JOURNEY-1] PostAuthHandler: Found temp prompt in user metadata (OAuth flow):', userMetadata.temp_prompt_id)
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
      console.log('[JOURNEY-1] PostAuthHandler: Cleared temp prompt from localStorage after campaign creation')
    }
  }
}

export const postAuthHandler = new PostAuthHandler()

