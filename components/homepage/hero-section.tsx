"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
} from '@/components/ai-elements/prompt-input'
import { Phone, Users, Globe, Flag } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCampaignContext } from '@/lib/context/campaign-context'

interface HeroSectionProps {
  onAuthRequired: () => void
}

// Move placeholders outside to avoid recreating on every render
const PLACEHOLDERS = [
  "I run a fitness coaching business...",
  "I have a B2B SaaS platform...",
  "I run an immigration law firm...",
  "I have an e-commerce kitchen store...",
  "I own a real estate agency...",
  "I run a digital marketing agency...",
  "I own a yoga studio...",
  "I have a tech startup...",
  "I run a plumbing service and need local calls...",
  "I have a restaurant and want more reservations...",
]

// Custom hook for typewriter effect
const useTypewriterPlaceholder = () => {
  const [placeholder, setPlaceholder] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const currentText = PLACEHOLDERS[currentIndex]
    
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false)
        setIsDeleting(true)
      }, 2000) // Pause for 2 seconds before deleting
      return () => clearTimeout(pauseTimer)
    }

    if (!isDeleting && placeholder === currentText) {
      // Finished typing, pause before deleting
      setIsPaused(true)
      return
    }

    if (isDeleting && placeholder === "") {
      // Finished deleting, move to next placeholder
      setIsDeleting(false)
      setCurrentIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
      return
    }

    const timeout = setTimeout(
      () => {
        if (currentText) {
          if (isDeleting) {
            // Remove one character
            setPlaceholder(currentText.substring(0, placeholder.length - 1))
          } else {
            // Add one character
            setPlaceholder(currentText.substring(0, placeholder.length + 1))
          }
        }
      },
      isDeleting ? 30 : 50 // Faster deletion, slower typing
    )

    return () => clearTimeout(timeout)
  }, [placeholder, currentIndex, isDeleting, isPaused])

  return placeholder
}

export function HeroSection({ onAuthRequired }: HeroSectionProps) {
  const { user } = useAuth()
  const { createCampaign } = useCampaignContext()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<string>('leads')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const animatedPlaceholder = useTypewriterPlaceholder()

  // Map goal to the same icons used in the Ad Campaign Builder
  const GoalIcon = ({ goal, className }: { goal: string; className?: string }) => {
    switch (goal) {
      case 'leads':
        return <Users className={className} />
      case 'calls':
        return <Phone className={className} />
      case 'website-visits':
        return <Globe className={className} />
      default:
        return <Users className={className} />
    }
  }

  const goalLabelMap: Record<string, string> = {
    leads: 'Leads',
    calls: 'Calls',
    'website-visits': 'Website Visits',
  }

  const handleSubmit = async (message: { text?: string }) => {
    const promptText = message.text?.trim()
    if (!promptText || !selectedGoal) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      if (!user) {
        // User is not logged in - store prompt temporarily with goal
        const response = await fetch('/api/temp-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptText, goalType: selectedGoal }),
        })

        if (response.ok) {
          const { tempId } = await response.json()
          // Store in localStorage for retrieval after auth
          localStorage.setItem('temp_prompt_id', tempId)
          // Open auth modal
          onAuthRequired()
        } else {
          console.error('Failed to store prompt')
          setErrorMsg('We could not start your session. Please try again in a moment.')
        }
      } else {
        // User is logged in - create campaign; let server auto-name from prompt
        const campaign = await createCampaign(
          '',
          promptText,
          selectedGoal
        )
        
        if (campaign) {
          try {
            // Fetch ads to get the draft ad ID that was auto-created
            const adsResponse = await fetch(`/api/campaigns/${campaign.id}/ads`)
            if (adsResponse.ok) {
              const { ads } = await adsResponse.json()
              const draftAd = ads.find((ad: { status: string }) => ad.status === 'draft')
              
              if (draftAd) {
                // Navigate to builder view with draft ad and firstVisit flag
                router.push(`/${campaign.id}?view=build&adId=${draftAd.id}&firstVisit=true`)
              } else {
                // Fallback if no draft found
                router.push(`/${campaign.id}`)
              }
            } else {
              // Fallback on error
              router.push(`/${campaign.id}`)
            }
          } catch (error) {
            console.error('Error fetching draft ad:', error)
            // Fallback on error
            router.push(`/${campaign.id}`)
          }
        }
      }
    } catch (error) {
      console.error('Error submitting prompt:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex flex-col items-center justify-center px-6 py-24 lg:py-32">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Platform badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-1.5">
            {/* Facebook icon with brand color */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {/* Instagram icon with gradient */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#FD1D1D' }} />
                  <stop offset="50%" style={{ stopColor: '#E1306C' }} />
                  <stop offset="100%" style={{ stopColor: '#833AB4' }} />
                </linearGradient>
              </defs>
              <path fill="url(#instagram-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </div>
          <span>Facebook & Instagram Ads</span>
        </div>

        {/* Main headline */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Launch Your Ads in Minutes
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground">
            Create high-performing Facebook & Instagram ads by chatting with AI
          </p>
        </div>

        {/* Prompt input */}
        <div className="max-w-2xl mx-auto pt-6">
          {errorMsg && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            </div>
          )}
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea 
                placeholder={animatedPlaceholder}
                className="min-h-24"
                disabled={isSubmitting}
              />
            </PromptInputBody>
              <PromptInputToolbar>
              <PromptInputModelSelect value={selectedGoal} onValueChange={setSelectedGoal}>
                <PromptInputModelSelectTrigger className="w-auto gap-2">
                  {/* Left: gray flag for the label */}
                  <Flag className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">Goal:</span>
                  {/* Right: colored goal icon before the selected value */}
                  <GoalIcon goal={selectedGoal} className="size-4 text-blue-600" />
                  <span className="font-medium text-foreground">
                    {goalLabelMap[selectedGoal]}
                  </span>
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  <PromptInputModelSelectItem value="leads">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-blue-600" />
                      Leads
                    </div>
                  </PromptInputModelSelectItem>
                  <PromptInputModelSelectItem value="calls">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-blue-600" />
                      Calls
                    </div>
                  </PromptInputModelSelectItem>
                  <PromptInputModelSelectItem value="website-visits">
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-blue-600" />
                      Website Visits
                    </div>
                  </PromptInputModelSelectItem>
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
              <div className="flex-1" />
              <PromptInputSubmit 
                disabled={isSubmitting}
                status={isSubmitting ? 'submitted' : undefined}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </section>
  )
}

