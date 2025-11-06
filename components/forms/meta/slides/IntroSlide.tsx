/**
 * Feature: Meta Instant Forms Intro Slide - EXACT Facebook Implementation
 * Purpose: Intro slide with NO white card - flat against gray background
 * References:
 *  - Facebook HTML: height: 480px, margin-top: 70px (profile), 100px (content)
 *  - NO white card wrapper - everything flat on gray background
 */

'use client'

import { useState, useEffect } from 'react'
import { User, ArrowRight } from 'lucide-react'
import { Icon } from '../Icon'
import { metaFormTokens } from '../tokens'

interface IntroSlideProps {
  pageProfilePicture?: string
  pageName?: string
  headline: string
  onContinue?: () => void
}

export function IntroSlide({
  pageProfilePicture,
  pageName,
  headline,
  onContinue,
}: IntroSlideProps) {
  const { slideHeights, spacing, typography, colors, button } = metaFormTokens
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div style={{ width: '324px', flexShrink: 0 }}>
      {/* Main content - EXACT height: 480px */}
      <div style={{ height: `${slideHeights.intro}px` }}>
        {/* Close button top-right */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <Icon type="close" />
        </div>
        
        {/* Profile picture - EXACT margin-top: 70px */}
        <div style={{ marginTop: `${spacing.profileTop}px`, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: showFallback ? '#F0F2F5' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showFallback ? (
              <User size={40} color="#8A8D91" strokeWidth={1.5} />
            ) : (
              <img
                src={pageProfilePicture}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
        
        {/* Content - EXACT margin-top: 100px */}
        <div style={{ marginTop: `${spacing.contentBelowProfile}px`, textAlign: 'center', padding: '0 24px' }}>
          {pageName && (
            <div style={{
              fontSize: `${typography.fontSize.base}px`,
              color: colors.text.secondary,
              marginBottom: '8px',
            }}>
              {pageName}
            </div>
          )}
          
          <div style={{
            fontSize: `${typography.fontSize.xl}px`,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}>
            {headline}
          </div>
        </div>
      </div>
      
      {/* Continue button - OUTSIDE main content div */}
      <div role="none" style={{ padding: `0 ${spacing.slideMargin}px` }}>
        <div
          onClick={onContinue}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            backgroundColor: button.backgroundColor,
            borderRadius: `${button.borderRadius}px`,
            padding: '10px 24px',
            height: `${button.height}px`,
            cursor: 'pointer',
          }}
        >
          <div style={{
            color: button.color,
            fontSize: `${typography.fontSize.base}px`,
            fontWeight: typography.fontWeight.semibold,
          }}>
            Continue
          </div>
          <div>
            <Icon type="arrow" color="#FFFFFF" />
          </div>
        </div>
      </div>
    </div>
  )
}

