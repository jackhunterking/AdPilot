/**
 * Feature: Meta Instant Forms Thank You Slide - EXACT Facebook Implementation
 * Purpose: Thank you slide with NO white card - flat against gray background
 * References:
 *  - Facebook HTML: height: 488px, margin-top: 70px (profile), 100px (content)
 *  - NO white card wrapper
 */

'use client'

import { useState, useEffect } from 'react'
import { User, Info } from 'lucide-react'
import { Icon } from '../Icon'
import { metaFormTokens } from '../tokens'

interface ThankYouSlideProps {
  title: string
  body?: string
  ctaText?: string
  ctaUrl?: string
  pageProfilePicture?: string
  pageName?: string
}

export function ThankYouSlide({
  title,
  body,
  ctaText,
  ctaUrl,
  pageProfilePicture,
  pageName,
}: ThankYouSlideProps) {
  const { slideHeights, spacing, typography, colors, button } = metaFormTokens
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div style={{ transform: 'translateX(0px)', left: '972px', width: '324px', flexShrink: 0 }}>
      {/* Main content - EXACT height: 488px (different from other slides!) */}
      <div style={{ height: `${slideHeights.thankYou}px` }}>
        {/* Close button top-right */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <Icon type="close" />
        </div>
        
        {/* Profile - EXACT margin-top: 70px */}
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
        <div style={{ marginTop: `${spacing.contentBelowProfile}px`, textAlign: 'center', padding: `0 ${spacing.slideMargin}px` }}>
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
            fontSize: `${typography.fontSize.lg}px`,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: '12px',
          }}>
            {title}
          </div>
          
          {body && (
            <div style={{
              fontSize: `${typography.fontSize.base}px`,
              color: colors.text.secondary,
              marginBottom: '12px',
              lineHeight: typography.lineHeight.normal,
            }}>
              {body}
            </div>
          )}
          
          <div style={{
            fontSize: `${typography.fontSize.sm}px`,
            color: colors.text.tertiary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}>
            <Info size={12} color={colors.text.tertiary} />
            You successfully submitted your responses.
          </div>
        </div>
      </div>
      
      {/* View website button - OUTSIDE content */}
      <div role="none" style={{ padding: `0 ${spacing.slideMargin}px` }}>
        <div
          onClick={() => ctaUrl && window.open(ctaUrl, '_blank')}
          style={{
            marginTop: '12px',
            backgroundColor: button.backgroundColor,
            borderRadius: `${button.borderRadius}px`,
            padding: '10px 24px',
            height: `${button.height}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{
            color: button.color,
            fontSize: `${typography.fontSize.base}px`,
            fontWeight: typography.fontWeight.semibold,
          }}>
            {ctaText || 'View website'}
          </div>
        </div>
      </div>
    </div>
  )
}

