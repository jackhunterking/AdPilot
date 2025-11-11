/**
 * Feature: Meta Instant Forms Contact Slide
 * Purpose: Contact slide with white card and Continue button at bottom
 * References:
 *  - User screenshots: NO close button, white card, progress bar, button at bottom
 */

import { Info } from 'lucide-react'
import type { MetaInstantFormField } from '@/lib/types/meta-instant-form'

interface ContactSlideProps {
  fields: MetaInstantFormField[]
  onContinue?: () => void
}

export function ContactSlide({ fields, onContinue }: ContactSlideProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Content */}
      <div style={{ flex: 1 }}>
        {/* White card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '28px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px',
          }}
        >
          {/* Heading with info icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '8px',
            }}
          >
            <h3
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#050505',
                margin: 0,
              }}
            >
              Contact information
            </h3>
            <Info size={18} color="#65676B" />
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {fields.map((field) => (
              <div key={field.id}>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#050505',
                    marginBottom: '8px',
                    fontWeight: 500,
                  }}
                >
                  {field.label}
                </div>
                <div
                  style={{
                    borderBottom: '1px solid #DADDE1',
                    paddingBottom: '12px',
                  }}
                >
                  <span style={{ color: '#8A8D91', fontSize: '16px' }}>
                    Enter your answer.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Button area with progress bar */}
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
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={50}
          style={{ marginBottom: '16px' }}
        >
          <div
            style={{
              height: '4px',
              backgroundColor: '#E4E6EB',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '50%',
                height: '100%',
                backgroundColor: '#1877F2',
                transition: 'width 300ms ease-in-out',
              }}
            />
          </div>
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={onContinue}
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
          Continue
        </button>
      </div>
    </div>
  )
}
