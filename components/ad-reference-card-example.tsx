/**
 * Ad Reference Card Component
 * 
 * Shows the full ad mockup UI that the user is editing.
 * Renders the exact same visual as the selection canvas for better context.
 * 
 * Usage:
 * - Rendered when user clicks "Edit" on an ad variation or ad copy
 * - Shows full mockup preview matching the format (Feed/Story)
 * - Can be dismissed manually or auto-dismissed after sending message
 */

import { Reply, X } from 'lucide-react'
import { Message, MessageContent } from '@/components/ai-elements/message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface AdReferenceCardProps {
  reference: {
    type?: string
    variationNumber?: number
    variationTitle?: string
    copyNumber?: number
    format?: 'feed' | 'story' | 'reel'
    gradient?: string
    content?: {
      primaryText?: string
      headline?: string
      description?: string
    }
    preview?: {
      brandName?: string
      headline?: string
      body?: string
      gradient?: string
      imageUrl?: string
      dimensions?: {
        width: number
        height: number
        aspect: string
      }
    }
    metadata?: {
      showSkeleton?: boolean
      editMode?: boolean
      timestamp?: string
      selectedFormat?: string
    }
  }
  onDismiss?: () => void
}

export function AdReferenceCard({ reference, onDismiss }: AdReferenceCardProps) {
  const isAdCopyReference = reference.type === 'ad_copy_reference'
  const variationTitle = reference.variationTitle || (isAdCopyReference ? `Copy ${reference.copyNumber}` : 'Ad')
  const format = reference.format
  const gradient = reference.gradient || reference.preview?.gradient || 'from-blue-600 via-blue-500 to-cyan-500'
  const imageUrl = reference.preview?.imageUrl
  // Check if we should show skeleton (creative step) or actual text (copy step)
  const showSkeleton = reference.metadata?.showSkeleton ?? false
  
  // Render full Feed ad mockup
  const renderFeedMockup = () => (
    <div className="w-full max-w-sm mx-auto rounded-lg border-2 border-blue-500 bg-card overflow-hidden shadow-lg">
      {/* Ad Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">Your Brand</p>
          <p className="text-[10px] text-muted-foreground">Sponsored</p>
        </div>
      </div>

      {/* Ad Creative */}
      {imageUrl ? (
        <div className="aspect-square relative overflow-hidden">
          <img
            src={imageUrl}
            alt={variationTitle}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={`aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <div className="text-center text-white p-4">
            <p className="text-sm font-bold">{variationTitle}</p>
          </div>
        </div>
      )}

      {/* Ad Copy Content */}
      <div className="p-3 space-y-2">
        {/* Reaction Icons */}
        <div className="flex items-center gap-3">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        {/* Primary Text */}
        {showSkeleton ? (
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : reference.content?.primaryText ? (
          <p className="text-xs line-clamp-3">
            <span className="font-semibold">Your Brand</span>{" "}
            {reference.content.primaryText}
          </p>
        ) : null}

        {/* Headline & Description */}
        <div className="bg-muted rounded-lg p-2.5 space-y-1">
          {/* Headline */}
          {showSkeleton ? (
            <Skeleton className="h-3.5 w-4/5" />
          ) : (
            <p className="text-xs font-bold line-clamp-1">{reference.content?.headline || ''}</p>
          )}
          
          {/* Description */}
          {showSkeleton ? (
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground line-clamp-2">{reference.content?.description || ''}</p>
          )}
          
          <Button 
            size="sm" 
            className="w-full mt-1.5 h-7 text-[10px] bg-[#4B73FF] hover:bg-[#3d5fd9]"
            disabled
          >
            Learn More
          </Button>
        </div>
      </div>
    </div>
  )

  // Render full Story ad mockup
  const renderStoryMockup = () => (
    <div className="w-48 mx-auto aspect-[9/16] rounded-lg border-2 border-blue-500 bg-card overflow-hidden relative shadow-lg">
      {/* Background Creative */}
      {imageUrl ? (
        <div className="absolute inset-0">
          <img src={imageUrl} alt={variationTitle} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* Story Header */}
      <div className="relative z-10 p-3">
        <div className="h-0.5 bg-white/30 rounded-full mb-3">
          <div className="h-full w-1/3 bg-white rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white flex-shrink-0" />
          <p className="text-white text-xs font-semibold truncate">Your Brand</p>
        </div>
      </div>

      {/* Story Copy Content */}
      <div className="absolute bottom-6 left-0 right-0 px-3 z-10 space-y-2">
        {/* Primary Text */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
          {showSkeleton ? (
            <div className="space-y-1">
              <Skeleton className="h-3 w-full bg-white/30" />
              <Skeleton className="h-3 w-3/4 bg-white/30" />
            </div>
          ) : (
            <p className="text-white text-xs line-clamp-2 font-medium">
              {reference.content?.primaryText || ''}
            </p>
          )}
        </div>
        
        {/* Headline */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
          {showSkeleton ? (
            <Skeleton className="h-3 w-4/5 bg-white/30" />
          ) : (
            <p className="text-white font-bold text-xs line-clamp-1">{reference.content?.headline || ''}</p>
          )}
        </div>

        {/* CTA Button */}
        <div className="bg-white/95 backdrop-blur-sm rounded-full py-2 px-4 text-center">
          <p className="text-black font-semibold text-xs truncate">Learn More</p>
        </div>
      </div>

      {/* Center title for non-copy references */}
      {!reference.content && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-white text-xs font-bold opacity-50">{variationTitle}</p>
        </div>
      )}
    </div>
  )
  
  return (
    <Message from="assistant">
      <MessageContent className="relative">
        {/* Header with reply icon and dismiss button */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
              Editing Reference - {variationTitle}
            </span>
          </div>
          
          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Dismiss reference"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        
        {/* Full Ad Mockup */}
        <div className="py-2">
          {format === 'story' ? renderStoryMockup() : renderFeedMockup()}
        </div>

        {/* Helper text */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {isAdCopyReference 
              ? "Tell me what you'd like to change about the primary text, headline, or description."
              : "Tell me what changes you'd like to make to this ad creative."}
          </p>
        </div>
      </MessageContent>
    </Message>
  )
}

/**
 * Example: How to use in your AI Chat component
 * 
 * import { AdReferenceCard } from '@/components/ad-reference-card-example'
 * 
 * // In your chat component:
 * useEffect(() => {
 *   const handleSendMessage = (event: CustomEvent) => {
 *     const { message, reference, showReferenceCard } = event.detail
 *     
 *     if (showReferenceCard && reference) {
 *       addMessageToChat({
 *         type: 'user_with_reference',
 *         text: message,
 *         reference: reference,
 *         timestamp: new Date()
 *       })
 *     }
 *   }
 *   
 *   window.addEventListener('sendMessageToAI', handleSendMessage)
 *   return () => window.removeEventListener('sendMessageToAI', handleSendMessage)
 * }, [])
 * 
 * // In your chat message renderer:
 * {message.type === 'user_with_reference' && (
 *   <AdReferenceCard reference={message.reference} />
 * )}
 */

