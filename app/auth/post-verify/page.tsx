"use client"

/**
 * Feature: Post-verify prompt handoff (email sign-up)
 * Purpose: After email verification returns, consume temp prompt (metadata or local) and create a campaign
 * References:
 *  - Supabase (Advanced SSR Auth): https://supabase.com/docs/guides/auth/server-side/advanced-guide
 *  - PostAuthHandler service for unified auth completion logic
 */
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { postAuthHandler } from "@/lib/services/post-auth-handler"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

type PageState = 'loading' | 'creating' | 'success' | 'error' | 'no-prompt'

function PostVerifyContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<PageState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      console.log('[POST-VERIFY] Starting post-verify flow', {
        loading,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email
      })

      if (loading) {
        console.log('[POST-VERIFY] Still loading, waiting...')
        return
      }

      // Require verified=true to avoid accidental access
      const isVerified = searchParams?.get("verified") === "true"
      if (!user || !isVerified) {
        console.log('[POST-VERIFY] No user or not verified, redirecting to homepage')
        router.replace("/")
        return
      }

      const sentinelKey = "post_verify_processed"
      if (sessionStorage.getItem(sentinelKey)) {
        console.log('[POST-VERIFY] Already processed, redirecting to homepage')
        router.replace("/")
        return
      }
      sessionStorage.setItem(sentinelKey, "true")

      try {
        setState('creating')
        
        // Use PostAuthHandler service for unified logic
        const campaign = await postAuthHandler.processAuthCompletion(user.user_metadata)

        if (!campaign) {
          // No temp prompt to process
          console.log('[POST-VERIFY] No temp prompt found, redirecting to homepage')
          setState('no-prompt')
          sessionStorage.removeItem(sentinelKey)
          setTimeout(() => router.push('/'), 1000)
          return
        }

        console.log('[POST-VERIFY] Campaign created successfully:', campaign.id)
        setCampaignId(campaign.id)
        setState('success')
        
        // Show success toast
        toast.success('Campaign created successfully!')
        
        // Clean URL
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/auth/post-verify")
        }

        // Navigate using router.push (client-side) AFTER state is confirmed
        console.log('[POST-VERIFY] Navigating to campaign:', campaign.id)
        setTimeout(() => router.push(`/${campaign.id}`), 500)

      } catch (err) {
        console.error('[POST-VERIFY] Error in post-verify flow:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign'
        setError(errorMessage)
        setState('error')
        sessionStorage.removeItem(sentinelKey)
        
        // Show error toast
        toast.error('Failed to create campaign', {
          description: errorMessage
        })
      }
    }

    run()
  }, [user, loading, router, searchParams])

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Verifying…</p>
        </div>
      </div>
    )
  }

  // Creating campaign state
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

  // Success state
  if (state === 'success' && campaignId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Redirecting to your campaign…</p>
        </div>
      </div>
    )
  }

  // No prompt state
  if (state === 'no-prompt') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Redirecting to homepage…</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md space-y-6 text-center px-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Failed to Create Campaign</h1>
            <p className="text-muted-foreground">
              {error || 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Back to Homepage
            </Button>
            
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function PostVerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    }>
      <PostVerifyContent />
    </Suspense>
  )
}


