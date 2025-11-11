/**
 * Feature: Meta Instant Forms Intro Slide
 * Purpose: Intro slide with profile, headline, and Continue button at bottom
 * References:
 *  - User screenshots: NO close button, button at bottom with arrow
 */

'use client'

import { useState, useEffect } from 'react'
import { User, ArrowRight } from 'lucide-react'

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
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ marginTop: '70px', textAlign: 'center' }}>
          {/* Profile picture */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto',
              backgroundColor: showFallback ? '#E4E6EB' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showFallback ? (
              <User size={48} color="#8A8D91" strokeWidth={1.5} />
            ) : (
              <img
                src={pageProfilePicture}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Page name & headline */}
          <div style={{ marginTop: '40px', padding: '0 20px' }}>
            {pageName && (
              <p
                style={{
                  fontSize: '16px',
                  color: '#65676B',
                  marginBottom: '16px',
                  fontWeight: 400,
                }}
              >
                {pageName}
              </p>
            )}

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#050505',
                margin: 0,
              }}
            >
              {headline}
            </h1>
          </div>
        </div>
      </div>

      {/* Button area - pushed to bottom */}
      <div
        style={{
          marginTop: 'auto',
          padding: '20px 24px',
          backgroundColor: '#F7F8FA',
          borderRadius: '0 0 12px 12px',
          marginLeft: '-28px',
          marginRight: '-28px',
          marginBottom: '-28px',
        }}
      >
        <button
          type="button"
          onClick={onContinue}
          style={{
            width: '85%',
            maxWidth: '400px',
            margin: '0 auto',
            height: '48px',
            backgroundColor: '#1877F2',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span>Continue</span>
          <ArrowRight size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
