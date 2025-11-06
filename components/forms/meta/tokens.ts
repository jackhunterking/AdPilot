/**
 * Feature: Meta Instant Forms Design Tokens - EXACT Facebook Implementation
 * Purpose: Exact values extracted from Facebook's HTML files
 * References:
 *  - Facebook HTML files with exact inline styles
 *  - All values match Facebook's implementation exactly
 */

export const metaFormTokens = {
  // Container
  container: {
    height: 700,  // EXACT: height: 700px from Facebook
    backgroundColor: '#F0F2F5',
  },

  // Slider
  slider: {
    slideWidth: 324,  // EXACT: width: 324px; flex-shrink: 0
    slidePositions: [0, 324, 648, 972],  // EXACT: left values from Facebook
    transitionDuration: '300ms',
  },

  // Slide Heights - EXACT from Facebook
  slideHeights: {
    intro: 480,      // EXACT: height: 480px
    contact: 480,    // EXACT: height: 480px (content height varies)
    privacy: 480,    // EXACT: height: 480px
    thankYou: 488,   // EXACT: height: 488px (different!)
  },

  // Spacing - EXACT from Facebook HTML
  spacing: {
    profileTop: 70,        // EXACT: margin-top: 70px
    contentBelowProfile: 100,  // EXACT: margin-top: 100px
    cardPadding: 20,       // EXACT: padding: 20px in white card
    horizontalPadding: 20, // EXACT: padding/horiz-20 means 0 20px
    slideMargin: 12,       // EXACT: margin: 0 12px
  },

  // Navigation
  navigation: {
    scale: 0.9,  // EXACT: scale: 0.9 from Facebook
  },

  // Progress Bar - EXACT from Facebook
  progressBar: {
    height: 3,           // EXACT: 3px height
    trackColor: '#E4E6EB',
    fillColor: '#1877F2',
  },

  // Button - EXACT from Facebook
  button: {
    height: 34,          // EXACT: height: 34px
    width: 300,          // EXACT: width: 300px
    borderRadius: 10,    // EXACT: border-radius: 10px
    backgroundColor: '#1877F2',
    color: '#FFFFFF',
  },

  // White Card (Contact slide only) - EXACT from Facebook
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,    // EXACT: border-radius: 12px
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',  // Subtle shadow
    padding: 20,         // EXACT: padding: 20px
  },

  // Typography - EXACT from Facebook
  typography: {
    fontSize: {
      xs: 11,     // Navigation "X of Y"
      sm: 12,     // Success message
      base: 14,   // Body text, field labels
      md: 16,     // Not used
      lg: 18,     // Headings (Contact information, Privacy policy)
      xl: 20,     // Headline text
    },
    fontWeight: {
      normal: 400,
      semibold: 600,
    },
    lineHeight: {
      normal: 1.4,
    },
  },

  // Colors - EXACT from Facebook
  colors: {
    text: {
      primary: '#050505',
      secondary: '#65676B',
      tertiary: '#8A8D91',
    },
    border: {
      divider: '#DADDE1',  // Field bottom borders
    },
    link: '#1877F2',
  },

  // Icons
  icons: {
    size: 16,  // EXACT: 16px x 16px
  },
} as const

export type MetaFormTokens = typeof metaFormTokens
