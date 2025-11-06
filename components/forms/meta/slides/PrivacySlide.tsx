/**
 * Feature: Meta Instant Forms Privacy Slide - EXACT Facebook Implementation
 * Purpose: Privacy slide with NO white card - flat against gray background
 * References:
 *  - Facebook HTML: height: 480px, margin-top: 100px, NO white card
 *  - Progress bar and button OUTSIDE main content
 */

import { Icon } from '../Icon'
import { metaFormTokens } from '../tokens'

interface PrivacySlideProps {
  pageName?: string
  privacyUrl: string
  onSubmit?: () => void
}

export function PrivacySlide({
  pageName,
  privacyUrl,
  onSubmit,
}: PrivacySlideProps) {
  const { slideHeights, spacing, typography, colors, button, progressBar } = metaFormTokens

  return (
    <div style={{ transform: 'translateX(0px)', left: '648px', width: '324px', flexShrink: 0 }}>
      {/* Main content - EXACT height: 480px */}
      <div style={{ height: `${slideHeights.privacy}px` }}>
        {/* Close button top-right */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <Icon type="close" />
        </div>
        
        {/* Content - EXACT margin-top: 100px, NO white card */}
        <div style={{ marginTop: `${spacing.contentBelowProfile}px`, padding: `0 ${spacing.slideMargin}px` }}>
          <div style={{
            fontSize: `${typography.fontSize.lg}px`,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: '8px',
          }}>
            Privacy policy
          </div>
          
          <div style={{
            fontSize: `${typography.fontSize.base}px`,
            color: colors.text.secondary,
            lineHeight: typography.lineHeight.normal,
            marginBottom: '16px',
          }}>
            By clicking Submit, you agree to send your info to {pageName || 'this page'} who agrees to 
            use it according to their privacy policy. Facebook will also use it subject to our 
            Data Policy, including to auto-fill forms for ads.
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: colors.link, fontSize: `${typography.fontSize.base}px` }}>
              <span>View Facebook Data Policy.</span>
            </span>
          </div>
          
          <div>
            <span style={{ color: colors.link, fontSize: `${typography.fontSize.base}px` }}>
              <span>Visit {pageName || 'this page'}&apos;s Privacy Policy.</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Progress bar - 100%, OUTSIDE content */}
      <div role="none" style={{ marginTop: '16px', padding: `0 ${spacing.slideMargin}px` }}>
        <div
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={100}
        >
          <div style={{
            height: `${progressBar.height}px`,
            backgroundColor: progressBar.trackColor,
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: progressBar.fillColor,
              transform: 'translateX(0%)',  // EXACT: 0% for 100%
              transition: 'transform 300ms ease-in-out',
            }} />
          </div>
        </div>
        
        {/* Submit button */}
        <div
          onClick={onSubmit}
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
            Submit
          </div>
        </div>
      </div>
    </div>
  )
}

