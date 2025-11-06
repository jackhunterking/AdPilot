/**
 * Feature: Meta Instant Forms Design Tokens - PIXEL PERFECT
 * Purpose: Exact design tokens extracted from Facebook's actual CSS
 * References:
 *  - Meta Business Help Instant Forms: https://www.facebook.com/business/help/1611070512241988
 *  - Facebook CSS: ._8duj, ._81-n, and other classes from Meta Business Suite files
 */

export const metaFormTokens = {
  // Colors - EXACT from Facebook
  colors: {
    background: '#F0F2F5',  // Light gray background (exact from Facebook)
    surface: '#FFFFFF',
    text: {
      primary: '#050505',
      secondary: '#65676B',
      tertiary: '#8A8D91',
    },
    border: {
      default: 'rgba(0,0,0,0.1)',  // 0.5px solid
      divider: '#DADDE1',
    },
    button: {
      primary: '#1877F2',
      primaryHover: '#166FE5',
    },
    link: '#1877F2',
  },

  // Border radius - EXACT from Facebook CSS
  radii: {
    card: 12,  // ._8duj uses 12px
    button: 12,  // ._81-n uses 12px
    profile: '50%',  // Circular
  },

  // Shadows - EXACT from Facebook CSS
  shadows: {
    card: '0 1px 2px rgba(0,0,0,0.3)',  // ._8duj: box-shadow: 0 1px 2px #0000004d
    button: '0 1px 3px rgba(0,0,0,0.3)',  // ._81-n: box-shadow: 0 1px 3px #0000004d
  },

  // Horizontal slider - EXACT dimensions
  slider: {
    slideWidth: 324,  // Each slide width including spacing
    cardWidth: 320,   // ._8duj: width: 320px
    cardMargin: 12,   // ._8duj: margin: 0 12px
    transitionDuration: '300ms',
  },

  // Progress bar - EXACT from Facebook
  progressBar: {
    height: 4,  // Facebook uses 4px (NOT 3px)
    trackColor: '#E4E6EB',
    fillColor: '#1877F2',
  },

  // Critical spacing from Facebook's HTML
  spacing: {
    profileTop: 70,      // margin-top: 70px for profile image
    contentBelowProfile: 100,  // margin-top: 100px for content below profile
    cardPadding: 20,     // padding inside white card
    fieldMargin: 20,     // margin-bottom between fields
    buttonBottom: 24,    // bottom spacing for buttons
  },

  // Component dimensions - EXACT from Facebook
  dimensions: {
    container: {
      width: 360,  // Overall container width
    },
    button: {
      height: 34,  // ._81-n: height: 34px (NOT 48px!)
      width: 300,  // ._81-n: width: 300px
    },
    slideHeights: {
      intro: 480,
      contact: 480,
      privacy: 480,
      thankYou: 488,
    },
    profile: {
      size: 80,  // Profile picture 80x80
    },
  },

  // Typography - EXACT from Facebook
  typography: {
    fontSize: {
      xs: 11,    // Tiny text
      sm: 12,    // Small text
      base: 14,  // Body text (default)
      md: 16,    // Subheading
      lg: 18,    // Heading (Contact information, etc.)
      xl: 20,    // Large heading (Headline text)
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  // Intro screen
  intro: {
    profilePictureSize: 80,
    profilePictureBorder: 0,  // No border on profile
  },
} as const

export type MetaFormTokens = typeof metaFormTokens
