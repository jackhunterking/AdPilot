/**
 * Feature: Meta Instant Forms Thank You Slide
 * Purpose: Thank you slide with View website button at bottom
 * References:
 *  - User screenshots: NO close button, "View website" button, NO progress bar
 */

'use client'

import { useState, useEffect } from 'react'
import { User, Info } from 'lucide-react'

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
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [pageProfilePicture])

  const showFallback = !pageProfilePicture || imageError

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Content */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ marginTop: '70px' }}>
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

          {/* Content below profile */}
          <div style={{ marginTop: '40px', padding: '0 20px' }}>
            {pageName && (
              <p
                style={{
                  fontSize: '16px',
                  color: '#65676B',
                  marginBottom: '12px',
                  fontWeight: 400,
                }}
              >
                {pageName}
              </p>
            )}

            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#050505',
                marginBottom: '12px',
              }}
            >
              {title}
            </h2>

            {body && (
              <p
                style={{
                  fontSize: '15px',
                  color: '#65676B',
                  marginBottom: '16px',
                  lineHeight: 1.4,
                }}
              >
                {body}
              </p>
            )}

            <div
              style={{
                fontSize: '13px',
                color: '#8A8D91',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Info size={14} color="#8A8D91" />
              You successfully submitted your responses.
            </div>
          </div>
        </div>
      </div>

      {/* Button area - NO progress bar on thank you slide */}
      <div
        style={{
          marginTop: 'auto',
          padding: '20px',
          backgroundColor: '#F7F8FA',
          borderRadius: '0 0 12px 12px',
          marginLeft: '-24px',
          marginRight: '-24px',
          marginBottom: '-24px',
        }}
      >
        <button
          type="button"
          onClick={() => ctaUrl && window.open(ctaUrl, '_blank')}
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#1877F2',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {ctaText || 'View website'}
        </button>
      </div>
    </div>
  )
}
