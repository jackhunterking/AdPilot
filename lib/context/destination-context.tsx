/**
 * Feature: Destination Context
 * Purpose: Manage ad-level destination state (form/URL/phone) separately from campaign-level goal
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

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
  status: 'idle' | 'selecting_type' | 'in_progress' | 'completed'
  data: DestinationData | null
}

interface DestinationContextType {
  destinationState: DestinationState
  setDestination: (data: DestinationData) => void
  setDestinationType: (type: 'instant_form' | 'website_url' | 'phone_number') => void
  clearDestination: () => void
  resetDestination: () => void
}

const DestinationContext = createContext<DestinationContextType | null>(null)

/**
 * Validates destination data to ensure all required fields are present
 * @param data - The destination data to validate
 * @returns true if the destination data is complete and valid, false otherwise
 */
function validateDestinationData(data: DestinationData | null): boolean {
  if (!data?.type) return false
  
  switch (data.type) {
    case 'instant_form':
      return Boolean(data.formId)
    case 'website_url':
      return Boolean(data.websiteUrl)
    case 'phone_number':
      return Boolean(data.phoneNumber)
    default:
      return false
  }
}

export function DestinationProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext()
  const searchParams = useSearchParams()
  const currentAdId = searchParams.get('adId')
  
  const [destinationState, setDestinationState] = useState<DestinationState>({
    status: 'idle',
    data: null,
  })
  
  // Load destination from backend (single source of truth)
  useEffect(() => {
    if (!campaign?.id || !currentAdId) {
      setDestinationState({ status: 'idle', data: null })
      return
    }
    
    const loadDestinationFromBackend = async () => {
      try {
        logger.debug('DestinationContext', `Loading destination from backend for ad ${currentAdId}`)
        const response = await fetch(`/api/campaigns/${campaign.id}/ads/${currentAdId}/snapshot`)
        
        if (!response.ok) {
          logger.warn('DestinationContext', 'Failed to load snapshot, starting empty')
          setDestinationState({ status: 'idle', data: null })
          return
        }
        
        const json = await response.json()
        const snapshot = json.setup_snapshot
        
        if (snapshot?.destination?.type) {
          logger.info('DestinationContext', `✅ Loaded destination from backend: ${snapshot.destination.type}`)
          const isValid = validateDestinationData(snapshot.destination.data)
          
          setDestinationState({
            status: isValid ? 'completed' : 'in_progress',
            data: snapshot.destination.data || null
          })
        } else {
          logger.debug('DestinationContext', 'No destination in backend, starting empty (new ad)')
          setDestinationState({ status: 'idle', data: null })
        }
      } catch (err) {
        logger.error('DestinationContext', 'Error loading destination from backend', err)
        setDestinationState({ status: 'idle', data: null })
      }
    }
    
    loadDestinationFromBackend()
  }, [campaign?.id, currentAdId])
  
  const setDestination = useCallback((data: DestinationData) => {
    const isValid = validateDestinationData(data)
    const status = isValid ? 'completed' : 'in_progress'
    
    setDestinationState({
      status,
      data,
    })
    logger.debug('DestinationContext', 'Destination set', { data, isValid, status })
  }, [])
  
  const setDestinationType = useCallback((type: 'instant_form' | 'website_url' | 'phone_number') => {
    setDestinationState({
      status: 'in_progress',
      data: {
        type: type,
      },
    })
    logger.debug('DestinationContext', 'Destination type selected', { type })
  }, [])
  
  const clearDestination = useCallback(() => {
    setDestinationState({
      status: 'idle',
      data: null,
    })
    logger.debug('DestinationContext', 'Destination cleared')
  }, [])
  
  const resetDestination = useCallback(() => {
    setDestinationState({
      status: 'idle',
      data: null,
    })
    logger.debug('DestinationContext', 'Destination reset (not clearing storage)')
  }, [])
  
  return (
    <DestinationContext.Provider value={{ destinationState, setDestination, setDestinationType, clearDestination, resetDestination }}>
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

