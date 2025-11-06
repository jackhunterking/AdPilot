/**
 * Feature: Meta Instant Forms Privacy Slide
 * Purpose: Privacy slide with Submit button at bottom
 * References:
 *  - User screenshots: NO close button, Submit button (not Continue)
 */

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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Content */}
      <div style={{ flex: 1, padding: '20px 0' }}>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#050505',
            marginBottom: '16px',
          }}
        >
          Privacy policy
        </h2>

        <p
          style={{
            fontSize: '15px',
            color: '#65676B',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}
        >
          By clicking Submit, you agree to send your info to{' '}
          {pageName || 'this page'} who agrees to use it according to their
          privacy policy. Facebook will also use it subject to our Data Policy,
          including to auto-fill forms for ads.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <a
            href="https://www.facebook.com/privacy/policy/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1877F2',
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            View Facebook Data Policy.
          </a>
        </div>

        <div>
          <a
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1877F2',
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            Visit {pageName || 'this page'}&apos;s Privacy Policy.
          </a>
        </div>
      </div>

      {/* Button area with progress bar */}
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
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={100}
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
                width: '100%',
                height: '100%',
                backgroundColor: '#1877F2',
                transition: 'width 300ms ease-in-out',
              }}
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={onSubmit}
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
          Submit
        </button>
      </div>
    </div>
  )
}
