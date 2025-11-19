"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logger } from "@/lib/utils/logger"
import { useAuth } from '@/components/auth/auth-provider'
import { useCampaignService } from '@/lib/services/service-provider'

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
  const campaignService = useCampaignService()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load campaign by ID (for campaign pages) - delegated to service
  const loadCampaign = async (id: string) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    try {
      // Use campaign service instead of direct fetch
      const result = await campaignService.getCampaign.execute(id)
      
      if (!result.success) {
        if (result.error?.code === 'unauthorized') {
          setCampaign(null)
        } else {
          throw new Error(result.error?.message || 'Failed to load campaign')
        }
        return
      }
      
      const campaignData = result.data
      
      if (!campaignData) {
        throw new Error('Campaign data is missing from response')
      }
      
      logger.debug('CampaignContext', 'Loaded campaign via service', {
        id: campaignData.id,
        name: campaignData.name,
        hasAds: !!campaignData.ads,
        adsCount: Array.isArray(campaignData.ads) ? campaignData.ads.length : 0,
        budget: campaignData.campaign_budget_cents
      })
      
      // Fetch linked conversation (v1 API)
      try {
        const convResponse = await fetch(`/api/v1/conversations?campaignId=${id}`, {
          credentials: 'include'
        })
        if (convResponse.ok) {
          const data = await convResponse.json()
          const conversations = data.data?.conversations || []
          if (conversations.length > 0) {
            campaignData.conversationId = conversations[0].id
            logger.debug('CampaignContext', `Loaded conversation ${campaignData.conversationId}`)
          }
        }
      } catch (convError) {
        console.warn('[CampaignContext] Failed to load conversation:', convError)
      }
      
      setCampaign(campaignData as Campaign)
    } catch (err) {
      console.error('Error loading campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // Create campaign with optional prompt and goal - delegated to service
  const createCampaign = async (name: string, prompt?: string, goal?: string) => {
    if (!user) return null
    
    setLoading(true)
    setError(null)
    try {
      // Use campaign service instead of direct fetch
      const result = await campaignService.createCampaign.execute({
        name,
        prompt,
        goalType: goal as 'leads' | 'calls' | 'website-visits' | undefined,
      })
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create campaign')
      }
      
      const campaignData = result.data
      
      if (!campaignData) {
        throw new Error('Campaign data is missing from response')
      }
      
      // Fetch linked conversation (v1 API)
      try {
        const convResponse = await fetch(`/api/v1/conversations?campaignId=${campaignData.id}`, {
          credentials: 'include'
        })
        if (convResponse.ok) {
          const data = await convResponse.json()
          const conversations = data.data?.conversations || []
          if (conversations.length > 0) {
            campaignData.conversationId = conversations[0].id
            logger.debug('CampaignContext', `Found conversation ${campaignData.conversationId}`)
          }
        }
      } catch (convError) {
        console.warn('[CampaignContext] Failed to fetch conversation:', convError)
      }
      
      setCampaign(campaignData as Campaign)
      return campaignData as Campaign
    } catch (err) {
      console.error('Error creating campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to create')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Update campaign metadata - delegated to service
  const updateCampaign = async (updates: Partial<Campaign>) => {
    if (!campaign?.id) return
    
    // Filter and transform updates to match UpdateCampaignInput type
    const { id: _id, user_id, created_at, updated_at, published_status, last_metrics_sync_at, conversationId, ai_conversation_id, campaign_budget, campaign_budget_cents, budget_strategy, budget_status, currency_code, ads, ...safeUpdates } = updates
    
    const result = await campaignService.updateCampaign.execute({
      id: campaign.id,
      name: safeUpdates.name,
      status: safeUpdates.status as 'draft' | 'active' | 'paused' | 'completed' | undefined,
      metadata: safeUpdates.metadata ? safeUpdates.metadata as Record<string, unknown> : undefined
    })
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update campaign')
    }
    
    if (result.data) {
      setCampaign(result.data as Campaign)
    }
  }

  // Update campaign budget - delegated to service
  const updateBudget = async (budgetCents: number) => {
    if (!campaign?.id) return
    try {
      // Use campaign service for budget updates - Note: campaign_budget_cents not in UpdateCampaignInput type
      const result = await campaignService.updateCampaign.execute({
        id: campaign.id,
      })
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update budget')
      }
      
      if (result.data) {
        setCampaign(result.data as Campaign)
      }
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

      const response = await fetch(`/api/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          campaignId: campaign.id,
          title: 'Campaign Chat',
        }),
      })

      if (!response.ok) {
        logger.error('CampaignContext', 'Failed to create conversation')
        return null
      }

      const data = await response.json()
      const conversationId = data.data?.conversation?.id

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

  // Update campaign conversation ID - delegated to service
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

      // Use campaign service - Note: ai_conversation_id not in interface, store in metadata
      const result = await campaignService.updateCampaign.execute({
        id: campaign.id,
        metadata: { ...campaign.metadata, conversationId },
      })

      if (!result.success) {
        logger.error('CampaignContext', 'Failed to update conversation ID', result.error)
        return
      }

      // Update local state
      if (result.data) {
        setCampaign(result.data as Campaign)
      }

      logger.info('CampaignContext', '✅ Updated conversation ID via service', {
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

