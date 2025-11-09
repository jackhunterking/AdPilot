"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { AuthModal } from '@/components/auth/auth-modal'
import { HomepageHeader } from '@/components/homepage/homepage-header'
import { LoggedInHeader } from '@/components/homepage/logged-in-header'
import { HeroSection } from '@/components/homepage/hero-section'
import { AdCarousel } from '@/components/homepage/ad-carousel'
import { CampaignGrid } from '@/components/homepage/campaign-grid'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, X } from 'lucide-react'

function HomeContent() {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')

  // Homepage no longer processes temp prompts - all auth flows go through /auth/post-login
  // This effect just handles error display for email verification failures
  useEffect(() => {
    const handleVerificationErrors = () => {
      const error = searchParams?.get('error')
      const errorCode = searchParams?.get('error_code')
      const errorDescription = searchParams?.get('error_description')
      
      if (error || errorCode) {
        console.error('[HOMEPAGE] Verification error:', { error, errorCode, errorDescription })
        
        // Show user-friendly error message
        if (errorCode === 'otp_expired') {
          alert('Your verification link has expired. Please sign up again to receive a new verification email.')
        } else {
          alert(`Verification failed: ${errorDescription || error || 'Unknown error'}`)
        }
        
        // Clean up URL
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/')
        }
      }
    }
    
    handleVerificationErrors()
  }, [searchParams])

  const handleSignInClick = () => {
    setAuthTab('signin')
    setAuthModalOpen(true)
  }

  const handleSignUpClick = () => {
    setAuthTab('signup')
    setAuthModalOpen(true)
  }

  const handleAuthRequired = () => {
    setAuthTab('signup')
    setAuthModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {user ? (
        <LoggedInHeader />
      ) : (
        <HomepageHeader onSignInClick={handleSignInClick} onSignUpClick={handleSignUpClick} />
      )}

      <main className="flex-1">
        <HeroSection onAuthRequired={handleAuthRequired} />
        
        {user ? (
          <CampaignGrid />
        ) : (
          <AdCarousel />
        )}
      </main>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        defaultTab={authTab}
      />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
