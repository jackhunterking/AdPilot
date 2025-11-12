/**
 * Feature: Destination Context
 * Purpose: Manage ad-level destination state (form/URL/phone) separately from campaign-level goal
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { logger } from '@/lib/utils/logger';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "./campaign-context"
import { useSearchParams } from "next/navigation"

export interface DestinationData {
  type: 'instant_form' | 'website_url' | 'phone_number' | null
  formId?: string
  formName?: string
  websiteUrl?: string
  displayLink?: string
  phoneNumber?: string
  phoneFormatted?: string
}

export interface DestinationState {
  status: 'idle' | 'in_progress' | 'completed'
  data: DestinationData | null
}

interface DestinationContextType {
  destinationState: DestinationState
  setDestination: (data: DestinationData) => void
  clearDestination: () => void
  resetDestination: () => void
}

const DestinationContext = createContext<DestinationContextType | null>(null)

export function DestinationProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext()
  const searchParams = useSearchParams()
  const currentAdId = searchParams.get('adId')
  
  const [destinationState, setDestinationState] = useState<DestinationState>({
    status: 'idle',
    data: null,
  })
  
  // Load destination from localStorage when campaign or adId changes
  useEffect(() => {
    if (!campaign?.id) return
    
    // If we have an adId, try to load destination for that specific ad
    const storageKey = currentAdId 
      ? `destination:${campaign.id}:${currentAdId}`
      : `destination:${campaign.id}:draft`
    
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as DestinationState
        setDestinationState(parsed)
        logger.debug('DestinationContext', 'Loaded destination from localStorage', { storageKey, parsed })
      } else {
        // No saved destination, reset to idle
        setDestinationState({
          status: 'idle',
          data: null,
        })
      }
    } catch (error) {
      console.error('[DestinationContext] Failed to load destination from localStorage:', error)
      setDestinationState({
        status: 'idle',
        data: null,
      })
    }
  }, [campaign?.id, currentAdId])
  
  // Save destination to localStorage whenever it changes
  useEffect(() => {
    if (!campaign?.id) return
    
    const storageKey = currentAdId 
      ? `destination:${campaign.id}:${currentAdId}`
      : `destination:${campaign.id}:draft`
    
    try {
      if (destinationState.data) {
        localStorage.setItem(storageKey, JSON.stringify(destinationState))
        logger.debug('DestinationContext', 'Saved destination to localStorage', { storageKey })
      } else if (destinationState.status === 'idle') {
        // Clear storage if destination is idle with no data
        localStorage.removeItem(storageKey)
      }
    } catch (error) {
      console.error('[DestinationContext] Failed to save destination to localStorage:', error)
    }
  }, [campaign?.id, currentAdId, destinationState])
  
  const setDestination = useCallback((data: DestinationData) => {
    setDestinationState({
      status: 'completed',
      data,
    })
    logger.debug('DestinationContext', 'Destination set', data)
  }, [])
  
  const clearDestination = useCallback(() => {
    setDestinationState({
      status: 'idle',
      data: null,
    })
    
    if (campaign?.id) {
      const storageKey = currentAdId 
        ? `destination:${campaign.id}:${currentAdId}`
        : `destination:${campaign.id}:draft`
      localStorage.removeItem(storageKey)
      logger.debug('DestinationContext', 'Destination cleared')
    }
  }, [campaign?.id, currentAdId])
  
  const resetDestination = useCallback(() => {
    setDestinationState({
      status: 'idle',
      data: null,
    })
    logger.debug('DestinationContext', 'Destination reset (not clearing storage)')
  }, [])
  
  return (
    <DestinationContext.Provider value={{ destinationState, setDestination, clearDestination, resetDestination }}>
      {children}
    </DestinationContext.Provider>
  )
}

export function useDestination() {
  const context = useContext(DestinationContext)
  if (!context) {
    throw new Error('useDestination must be used within DestinationProvider')
  }
  return context
}

