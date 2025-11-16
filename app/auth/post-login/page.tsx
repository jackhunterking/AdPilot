"use client"

/**
 * Feature: Post-login Campaign Creation Handler
 * Purpose: Process temp prompt after authentication and create campaign
 * Journey Context:
 *   - Journey 1: Temp prompt exists → Creates campaign → Redirects to builder
 *   - Journey 2/3: No temp prompt → Quick redirect to homepage (no automation)
 * Key Behavior:
 *   - Checks both localStorage and user_metadata for temp_prompt_id
 *   - Creates campaign via PostAuthHandler service
 *   - Prevents duplicate processing with sessionStorage sentinels
 *   - Smart state: 'creating' for Journey 1, 'redirecting' for Journey 2/3
 * References:
 *   - AUTH_JOURNEY_MASTER_PLAN.md - Journey 1, Journey 2, Journey 3
 *   - Supabase Auth: https://supabase.com/docs/guides/auth/server-side/advanced-guide
 *   - PostAuthHandler service for unified logic
 */
import { Suspense, useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { postAuthHandler } from "@/lib/services/post-auth-handler"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"

type PageState = 'creating' | 'error' | 'redirecting'

function PostLoginContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<PageState>('creating')
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasRunRef = useRef(false)

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Clean up processing lock but keep campaign ID for recovery
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('post_login_processing')
      }
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      console.log('[POST-LOGIN] useEffect triggered', { 
        loading, 
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      })

      if (loading) {
        console.log('[POST-LOGIN] Still loading, waiting...')
        return
      }

      // If no user, bounce to home. This page only handles post-auth.
      if (!user) {
        console.log('[POST-LOGIN] No user found, redirecting to homepage')
        router.replace("/")
        return
      }

      // Prevent multiple concurrent executions using ref
      if (hasRunRef.current) {
        console.log('[POST-LOGIN] Already running, skipping duplicate execution')
        return
      }

      // Check if already processed successfully
      const sentinelKey = "post_login_processed"
      const campaignIdKey = "post_login_campaign_id"
      const processingKey = "post_login_processing"
      
      if (typeof window !== 'undefined') {
        const alreadyProcessed = sessionStorage.getItem(sentinelKey)
        
        if (alreadyProcessed) {
          console.log('[POST-LOGIN] Already processed, checking for saved campaign')
          // Check if we have a saved campaign ID to continue the journey
          const savedCampaignId = sessionStorage.getItem(campaignIdKey)
          
          if (savedCampaignId) {
            console.log('[POST-LOGIN] Found saved campaign, redirecting:', savedCampaignId)
            // Clean up and redirect to campaign
            sessionStorage.removeItem(campaignIdKey)
            sessionStorage.removeItem(sentinelKey)
            router.replace(`/${savedCampaignId}`)
          } else {
            console.log('[POST-LOGIN] No saved campaign, redirecting to homepage')
            sessionStorage.removeItem(sentinelKey)
            router.replace('/')
          }
          return
        }

        // Check if currently processing (another tab/window)
        const isProcessing = sessionStorage.getItem(processingKey)
        if (isProcessing) {
          console.log('[POST-LOGIN] Already processing in another execution, waiting...')
          return
        }

        // Lock processing
        sessionStorage.setItem(processingKey, 'true')
      }

      hasRunRef.current = true

      // Set timeout safety net (5 seconds)
      timeoutRef.current = setTimeout(() => {
        console.error('[POST-LOGIN] Timeout: Campaign creation took too long')
        setState('error')
        setError('This is taking longer than expected. Please try again.')
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(processingKey)
        }
      }, 5000)

      try {
        setState('creating')
        
        // Use PostAuthHandler service for unified logic
        const result = await postAuthHandler.processAuthCompletion(user.user_metadata)

        // Clear timeout - we got a response
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        if (!result) {
          // No temp prompt to process - Journey 2/3 (no automation)
          console.log('[JOURNEY-2/3] No temp prompt found, redirecting to homepage (no automation)')
          setState('redirecting')
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(processingKey)
            sessionStorage.setItem(sentinelKey, 'true')
          }
          setTimeout(() => router.push('/'), 100)  // Quick redirect
          return
        }

        const { campaign, draftAdId } = result
        console.log('[JOURNEY-1] Campaign created successfully:', campaign.id, draftAdId ? `with draft ad: ${draftAdId}` : '')
        console.log('[JOURNEY-1] Navigating to campaign builder with firstVisit=true')
        
        // Save campaign ID for recovery and mark as processed
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(campaignIdKey, campaign.id)
          sessionStorage.setItem(sentinelKey, 'true')
          sessionStorage.removeItem(processingKey)
        }

        // Navigate to campaign builder with draft ad ID and firstVisit flag
        const targetUrl = draftAdId 
          ? `/${campaign.id}?view=build&adId=${draftAdId}&firstVisit=true`
          : `/${campaign.id}`
        
        router.push(targetUrl)

      } catch (err) {
        console.error('[POST-LOGIN] Error in post-login flow:', err)
        
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign'
        setError(errorMessage)
        setState('error')
        
        // Clear locks to allow retry
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(sentinelKey)
          sessionStorage.removeItem(processingKey)
        }
      }
    }

    run()
  }, [user, loading, router, searchParams])

  // Creating campaign state (combined loading + creating)
  if (state === 'creating') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Creating your campaign…</p>
        </div>
      </div>
    )
  }

  // Redirecting state (Journey 2/3 - no automation)
  if (state === 'redirecting') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    const handleRetry = () => {
      // Clear sentinel to allow retry
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('post_login_processed')
        sessionStorage.removeItem('post_login_processing')
      }
      window.location.reload()
    }

    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md space-y-6 text-center px-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Something Went Wrong</h1>
            <p className="text-muted-foreground">
              {error || 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleRetry} 
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button 
              onClick={() => router.push('/')} 
              variant="outline" 
              className="w-full"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function PostLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    }>
      <PostLoginContent />
    </Suspense>
  )
}


