"use client"

import { Sparkles, Globe, MoreVertical, ThumbsUp, MessageCircle, Share2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface AdMockupProps {
  format?: 'feed' | 'story' | 'reel'
  imageUrl?: string
  logoUrl?: string
  brandName?: string
  primaryText?: string
  headline?: string
  description?: string
  gradient?: string
  ctaText?: string
  status?: 'active' | 'paused' | 'draft'
  showEngagement?: boolean
}

export function AdMockup({
  format = 'feed',
  imageUrl,
  logoUrl,
  brandName = 'Business Name',
  primaryText = 'Discover our services',
  headline = 'Get Started Today',
  description = 'Learn more about what we offer',
  gradient = 'from-blue-600 via-blue-500 to-cyan-500',
  ctaText = 'Learn More',
  status,
  showEngagement = true,
}: AdMockupProps) {
  
  // Reel format - Coming Soon
  if (format === 'reel') {
    return (
      <div className="aspect-[9/16] rounded-lg border-2 border-border bg-card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center">
          <div className="text-center text-white p-6">
            <Sparkles className="h-12 w-12 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-bold mb-2">Reels Coming Soon!</h3>
            <p className="text-sm opacity-90">We're working on Reels format support</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (format === 'story') {
    return (
      <div 
        className="aspect-[9/16] rounded-lg border-2 bg-white overflow-hidden relative shadow-lg border-[#CED0D4]"
        style={{ borderRadius: '8px' }}
      >
        {/* Progress Bar - Top Edge */}
        <div className="absolute top-0 left-0 right-0 z-30" style={{ height: '2px' }}>
          <div className="h-full bg-[#CED0D4]">
            <div className="h-full bg-white" style={{ width: '33%' }} />
          </div>
        </div>

        {/* Header Section - Subtle Gray Bar */}
        <div className="relative z-20 bg-[#F2F3F5] px-3 py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px' }}>
          <div className="flex items-center gap-2">
            {/* Brand Logo - 40x40px */}
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
            </div>
            
            {/* Brand Name & Sponsored */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-[#333333]" style={{ fontSize: '15px', fontWeight: 600 }}>{brandName}</p>
              <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>Sponsored</p>
            </div>
            
            {/* Options Icon */}
            <MoreVertical className="h-5 w-5 text-[#65676B] flex-shrink-0 cursor-pointer" style={{ width: '20px', height: '20px' }} />
          </div>
        </div>

        {/* Main Creative Section - Full Screen Background */}
        <div className="absolute inset-0" style={{ top: '60px' }}>
          {imageUrl ? (
            <div className="relative w-full h-full">
              <img 
                src={imageUrl} 
                alt={brandName} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`relative w-full h-full bg-gradient-to-br ${gradient}`} />
          )}
        </div>

        {/* Bottom Ad Copy/Engagement Section - Dark Background */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#242526]">
          {/* Information Text - Skeleton Loaders */}
          <div className="px-3 pt-3 pb-2" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '12px', paddingBottom: '8px' }}>
            <div className="space-y-1">
              {/* Primary Text Skeleton */}
              <Skeleton className="h-3.5 w-full bg-white/30" style={{ height: '14px' }} />
              {/* Description Skeleton */}
              <Skeleton className="h-3.5 w-3/4 bg-white/30" style={{ height: '14px' }} />
            </div>
          </div>
          
          {/* Expand Icon - ChevronUp */}
          <div className="flex justify-center py-1">
            <ChevronUp className="h-4 w-4 text-white" style={{ width: '16px', height: '16px' }} />
          </div>
          
          {/* Secondary CTA Button */}
          <div className="flex justify-center px-3 pb-3" style={{ paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px' }}>
            <button 
              className="bg-white text-[#333333] font-semibold rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
              style={{ 
                fontSize: '15px', 
                fontWeight: 600, 
                paddingLeft: '12px', 
                paddingRight: '12px', 
                paddingTop: '8px', 
                paddingBottom: '8px',
                borderRadius: '8px'
              }}
              disabled
            >
              {ctaText}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Feed Format - Pixel-perfect Facebook feed ad
  return (
    <div className="w-full rounded-lg border-2 bg-white overflow-hidden shadow-lg border-[#CED0D4]">
      {/* Header Section - Facebook Style */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#CED0D4]" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px' }}>
        {/* Profile Picture - 40px circle, solid blue */}
        <div className="h-10 w-10 rounded-full bg-[#1877F2] flex-shrink-0" style={{ width: '40px', height: '40px' }} />
        
        {/* Business Name & Sponsored */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-[#050505]" style={{ fontSize: '15px', fontWeight: 600 }}>{brandName}</p>
          <div className="flex items-center gap-1">
            <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>Sponsored</p>
            <Globe className="h-3 w-3 text-[#65676B]" style={{ width: '12px', height: '12px' }} />
          </div>
        </div>
        
        {/* Options Icon - MoreVertical on right */}
        <MoreVertical className="h-5 w-5 text-[#65676B] flex-shrink-0 cursor-pointer hover:bg-[#F2F3F5] rounded-full p-1" style={{ width: '20px', height: '20px' }} />
      </div>

      {/* Primary Text Section - BEFORE Media */}
      <div className="px-3 pt-2 pb-3" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '12px' }}>
        <p className="text-[#050505] leading-[1.3333]" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '20px' }}>
          {primaryText}
        </p>
      </div>

      {/* Media Section - Square (1:1) aspect ratio - 1080x1080 */}
      {imageUrl ? (
        <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
          <img
            src={imageUrl}
            alt={brandName}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="relative overflow-hidden bg-[#1C1E21]" style={{ aspectRatio: '1/1' }} />
      )}

      {/* Link Preview Section - Horizontal Layout */}
      <div className="flex items-start gap-3 px-3 py-3 border-b border-[#CED0D4]" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
        {/* Left Side - Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Website URL */}
          <p className="text-[#65676B] uppercase tracking-wide" style={{ fontSize: '11px', fontWeight: 400, letterSpacing: '0.5px' }}>
            YOURWEBSITE.HELLO
          </p>
          {/* Headline */}
          <p className="font-bold text-[#050505] line-clamp-1" style={{ fontSize: '17px', fontWeight: 700, lineHeight: '1.1765' }}>
            {headline}
          </p>
          {/* Description */}
          <p className="text-[#050505] line-clamp-2" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.3333' }}>
            {description}
          </p>
        </div>
        
        {/* Right Side - Learn more Button */}
        <button 
          className="flex-shrink-0 bg-[#E4E6EB] text-[#050505] font-semibold rounded-md px-3 py-2 hover:bg-[#D8DADF] transition-colors"
          style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            paddingLeft: '12px', 
            paddingRight: '12px', 
            paddingTop: '8px', 
            paddingBottom: '8px',
            borderRadius: '6px',
            minWidth: '100px'
          }}
          disabled
        >
          {ctaText}
        </button>
      </div>

      {/* Engagement Section */}
      {showEngagement && (
        <div>
          {/* Top Row - Reactions & Counts */}
          <div className="flex items-center justify-between px-2 py-1" style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px' }}>
            {/* Left Side - Reactions */}
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4 text-[#1877F2]" style={{ width: '16px', height: '16px' }} />
              <p className="text-[#050505]" style={{ fontSize: '13px', fontWeight: 400 }}>Oliver, Sofia and 28 others</p>
            </div>
            
            {/* Right Side - Comments & Shares */}
            <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>14 Comments 7 Shares</p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center border-t border-[#CED0D4]" style={{ borderTopWidth: '1px' }}>
            {/* Like Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <ThumbsUp className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Like</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#CED0D4]" style={{ width: '1px' }} />
            
            {/* Comment Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <MessageCircle className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Comment</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#CED0D4]" style={{ width: '1px' }} />
            
            {/* Share Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <Share2 className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Share</span>
            </button>
            
            {/* Dropdown Arrow */}
            <button className="px-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <ChevronDown className="h-4 w-4 text-[#65676B]" style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

