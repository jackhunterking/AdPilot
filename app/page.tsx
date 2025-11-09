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

interface PublishSuccessData {
  campaignId: string
  campaignName: string
  isEdit: boolean
  timestamp: number
}

function HomeContent() {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [publishSuccessData, setPublishSuccessData] = useState<PublishSuccessData | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Check for publish success indicator on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const successData = sessionStorage.getItem('ad_publish_success')
      if (successData) {
        try {
          const data = JSON.parse(successData) as PublishSuccessData
          // Only show if timestamp is recent (within last 10 seconds)
          if (Date.now() - data.timestamp < 10000) {
            setPublishSuccessData(data)
            setShowSuccessModal(true)
          }
          // Clear the indicator
          sessionStorage.removeItem('ad_publish_success')
        } catch (error) {
          console.error('[HOMEPAGE] Failed to parse publish success data:', error)
          sessionStorage.removeItem('ad_publish_success')
        }
      }
    }
  }, [])

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

      {/* Publish Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {publishSuccessData?.isEdit ? "Changes Saved!" : "Ad Published!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {publishSuccessData?.isEdit 
                ? `Your changes to ${publishSuccessData.campaignName} have been saved successfully.`
                : `${publishSuccessData?.campaignName} has been published successfully and will begin running according to your schedule.`
              }
            </p>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-white hover:brightness-105"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
