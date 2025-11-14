"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logger } from "@/lib/utils/logger"
import { useAuth } from '@/components/auth/auth-provider'

interface CampaignState {
  goal_data?: Record<string, unknown> | null
  location_data?: Record<string, unknown> | null
  budget_data?: Record<string, unknown> | null
  ad_copy_data?: Record<string, unknown> | null
  ad_preview_data?: Record<string, unknown> | null
  meta_connect_data?: Record<string, unknown> | null
}

interface Campaign {
  id: string
  user_id: string
  name: string
  status: string
  current_step: number
  total_steps: number
  initial_goal?: string | null
  metadata: { initialPrompt?: string } | null
  campaign_states?: CampaignState  // 1-to-1 relationship (object, not array)
  created_at: string
  updated_at: string
  published_status?: string | null
  last_metrics_sync_at?: string | null
  conversationId?: string // Link to AI SDK conversation
  ai_conversation_id?: string | null // Campaign-level conversation ID (persists across ads)
  campaign_budget?: number | null // Total campaign budget
  budget_strategy?: string | null
  budget_status?: string | null
}

interface CampaignContextType {
  campaign: Campaign | null
  loading: boolean
  error: string | null
  createCampaign: (name: string, prompt?: string, goal?: string) => Promise<Campaign | null>
  loadCampaign: (id: string) => Promise<void>
  updateCampaign: (updates: Partial<Campaign>) => Promise<void>
  updateBudget: (budget: number) => Promise<void>
  saveCampaignState: (field: string, value: Record<string, unknown> | null, options?: { retries?: number; silent?: boolean }) => Promise<boolean>
  clearCampaign: () => void
  getOrCreateConversationId: () => Promise<string | null>
  updateConversationId: (conversationId: string) => Promise<void>
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export function CampaignProvider({ 
  children, 
  initialCampaignId 
}: { 
  children: ReactNode
  initialCampaignId?: string 
}) {
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load campaign by ID (for campaign pages)
  const loadCampaign = async (id: string) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/campaigns/${id}`)
      if (response.ok) {
        const data = await response.json()
        const campaign = data.campaign
        
        logger.debug('CampaignContext', 'Raw campaign data', {
          id: campaign.id,
          name: campaign.name,
          hasStates: !!campaign.campaign_states,
          statesType: typeof campaign.campaign_states,
          statesKeys: campaign.campaign_states ? Object.keys(campaign.campaign_states) : [],
        })
        
        if (campaign.campaign_states && typeof campaign.campaign_states === 'object') {
          logger.debug('CampaignContext', '✅ campaign_states exists as object', campaign.campaign_states)
        } else {
          logger.warn('CampaignContext', '⚠️ campaign_states is NULL or wrong type!', campaign.campaign_states)
        }
        
        // Fetch linked conversation (AI SDK pattern)
        try {
          const convResponse = await fetch(`/api/campaigns/${id}/conversation`)
          if (convResponse.ok) {
            const convData = await convResponse.json()
            campaign.conversationId = convData.conversation.id
            logger.debug('CampaignContext', `Loaded conversation ${campaign.conversationId} for campaign ${id}`)
          }
        } catch (convError) {
          console.warn('[CampaignContext] Failed to load conversation:', convError)
          // Continue without conversation ID - will be created on first message
        }
        
        setCampaign(campaign)
      } else if (response.status === 401) {
        // User not authenticated
        setCampaign(null)
      } else {
        throw new Error('Failed to load campaign')
      }
    } catch (err) {
      console.error('Error loading campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // Create campaign with optional prompt and goal
  const createCampaign = async (name: string, prompt?: string, goal?: string) => {
    if (!user) return null
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prompt, goalType: goal }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const campaign = data.campaign
        
        // Fetch linked conversation (AI SDK pattern)
        try {
          const convResponse = await fetch(`/api/campaigns/${campaign.id}/conversation`)
          if (convResponse.ok) {
            const convData = await convResponse.json()
            campaign.conversationId = convData.conversation.id
            logger.debug('CampaignContext', `Created conversation ${campaign.conversationId} for campaign ${campaign.id}`)
          }
        } catch (convError) {
          console.warn('[CampaignContext] Failed to fetch conversation:', convError)
          // Continue without conversation ID - will be created on first message
        }
        
        setCampaign(campaign)
        return campaign
      }
      throw new Error('Failed to create campaign')
    } catch (err) {
      console.error('Error creating campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to create')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Update campaign metadata
  const updateCampaign = async (updates: Partial<Campaign>) => {
    if (!campaign?.id) return
    const response = await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || `HTTP ${response.status}`)
    }
    const data = await response.json()
    setCampaign(data.campaign)
  }

  // Update campaign budget
  const updateBudget = async (budget: number) => {
    if (!campaign?.id) return
    try {
      // Convert total budget to daily budget for the API
      const dailyBudget = Math.max(1, Math.round(budget / 30))
      
      const response = await fetch(`/api/campaigns/${campaign.id}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyBudget,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update budget' }))
        throw new Error(errorData.error || 'Failed to update budget')
      }
      
      // Update local campaign state with total budget
      setCampaign(prev => prev ? { ...prev, campaign_budget: budget } : null)
    } catch (error) {
      console.error('Error updating budget:', error)
      throw error
    }
  }

  // Save campaign state (goal, location, etc.) with retry logic
  const saveCampaignState = async (
    field: string, 
    value: Record<string, unknown> | null,
    options: { retries?: number; silent?: boolean } = {}
  ): Promise<boolean> => {
    const { retries = 3, silent = false } = options
    
    if (!campaign?.id) {
      console.warn('No active campaign to save state to')
      return false
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Log what we're saving (debug mode only)
        if (field === 'ad_preview_data') {
          logger.debug('CampaignContext', `💾 Saving ${field}`, {
            campaignId: campaign.id,
            hasImageVariations: Boolean((value as { adContent?: { imageVariations?: unknown[] } })?.adContent?.imageVariations?.length),
            imageCount: ((value as { adContent?: { imageVariations?: unknown[] } })?.adContent?.imageVariations?.length) || 0,
            attempt: attempt,
          })
        }
        
        const response = await fetch(`/api/campaigns/${campaign.id}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        logger.debug('CampaignContext', `✅ Saved ${field} to campaign ${campaign.id}`)
        return true

      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Save failed')
        logger.error('CampaignContext', `Save attempt ${attempt}/${retries} failed for ${field}`, lastError)

        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    if (!silent) {
      console.error(`💥 Failed to save ${field} after ${retries} attempts`)
    }
    
    return false
  }

  // Clear campaign (for logout, etc.)
  const clearCampaign = () => {
    setCampaign(null)
    setError(null)
  }

  // Load initial campaign if ID provided
  useEffect(() => {
    if (initialCampaignId && user) {
      loadCampaign(initialCampaignId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCampaignId, user])

  // Clear campaign when user logs out
  // Get or create campaign-level conversation ID
  const getOrCreateConversationId = async (): Promise<string | null> => {
    if (!campaign?.id) {
      logger.error('CampaignContext', 'Cannot get conversation ID - no campaign loaded')
      return null
    }

    // Check if campaign already has a conversation ID
    if (campaign.ai_conversation_id) {
      logger.debug('CampaignContext', 'Using existing conversation ID', {
        campaignId: campaign.id,
        conversationId: campaign.ai_conversation_id,
      })
      return campaign.ai_conversation_id
    }

    // Create new conversation ID for campaign
    try {
      logger.info('CampaignContext', 'Creating new conversation ID for campaign', {
        campaignId: campaign.id,
      })

      const response = await fetch(`/api/campaigns/${campaign.id}/conversation`, {
        method: 'POST',
      })

      if (!response.ok) {
        logger.error('CampaignContext', 'Failed to create conversation')
        return null
      }

      const data = await response.json()
      const conversationId = data.conversation.id

      // Update local state
      setCampaign(prev => prev ? { ...prev, ai_conversation_id: conversationId } : null)

      logger.info('CampaignContext', '✅ Created conversation ID', {
        campaignId: campaign.id,
        conversationId,
      })

      return conversationId
    } catch (err) {
      logger.error('CampaignContext', 'Exception creating conversation ID', err as Error)
      return null
    }
  }

  // Update campaign conversation ID
  const updateConversationId = async (conversationId: string): Promise<void> => {
    if (!campaign?.id) {
      logger.error('CampaignContext', 'Cannot update conversation ID - no campaign loaded')
      return
    }

    try {
      logger.info('CampaignContext', 'Updating conversation ID', {
        campaignId: campaign.id,
        conversationId,
      })

      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_conversation_id: conversationId }),
      })

      if (!response.ok) {
        logger.error('CampaignContext', 'Failed to update conversation ID')
        return
      }

      // Update local state
      setCampaign(prev => prev ? { ...prev, ai_conversation_id: conversationId } : null)

      logger.info('CampaignContext', '✅ Updated conversation ID', {
        campaignId: campaign.id,
        conversationId,
      })
    } catch (err) {
      logger.error('CampaignContext', 'Exception updating conversation ID', err as Error)
    }
  }

  useEffect(() => {
    if (!user) {
      clearCampaign()
    }
  }, [user])

  return (
    <CampaignContext.Provider value={{
      campaign,
      loading,
      error,
      createCampaign,
      loadCampaign,
      updateCampaign,
      updateBudget,
      saveCampaignState,
      clearCampaign,
      getOrCreateConversationId,
      updateConversationId,
    }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaignContext() {
  const context = useContext(CampaignContext)
  if (!context) {
    throw new Error('useCampaignContext must be used within CampaignProvider')
  }
  return context
}

