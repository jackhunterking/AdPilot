"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logger } from "@/lib/utils/logger"
import { useAuth } from '@/components/auth/auth-provider'

interface Campaign {
  id: string
  user_id: string
  name: string
  status: string
  initial_goal?: string | null
  metadata: { initialPrompt?: string } | null
  created_at: string
  updated_at: string
  published_status?: string | null
  last_metrics_sync_at?: string | null
  conversationId?: string // Link to AI SDK conversation
  ai_conversation_id?: string | null // Campaign-level conversation ID (persists across ads)
  campaign_budget?: number | null // Legacy - use campaign_budget_cents
  campaign_budget_cents?: number | null // New normalized field
  budget_strategy?: string | null
  budget_status?: string | null
  currency_code?: string
  ads?: unknown[] // Nested ads data from API
}

interface CampaignContextType {
  campaign: Campaign | null
  loading: boolean
  error: string | null
  createCampaign: (name: string, prompt?: string, goal?: string) => Promise<Campaign | null>
  loadCampaign: (id: string) => Promise<void>
  updateCampaign: (updates: Partial<Campaign>) => Promise<void>
  updateBudget: (budgetCents: number) => Promise<void>
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
          hasAds: !!campaign.ads,
          adsCount: campaign.ads?.length || 0,
          budget: campaign.campaign_budget_cents
        })
        
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

  // DEPRECATED: saveCampaignState removed - campaign_states table no longer exists
  // Use specific ad endpoints instead:
  //   - POST /api/ads/[id]/creative for creative data
  //   - POST /api/ads/[id]/copy for copy data
  //   - POST /api/ads/[id]/locations for location data
  //   - PUT /api/ads/[id]/destination for destination data
  //   - PUT /api/ads/[id]/budget for budget data

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

