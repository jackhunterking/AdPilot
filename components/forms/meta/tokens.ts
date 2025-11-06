/**
 * Feature: Meta Instant Forms Design Tokens
 * Purpose: Pixel-perfect design tokens derived from Meta's Instant Forms UI
 * References:
 *  - Meta Business Help Instant Forms: https://www.facebook.com/business/help/1611070512241988
 *  - Facebook Brand Guidelines: Typography (San Francisco iOS, Roboto Android)
 */

export const metaFormTokens = {
  // Colors - Meta Instant Forms palette
  colors: {
    background: '#F7F8FA', // Light gray background
    backgroundDark: '#18191A', // Dark mode background
    surface: '#FFFFFF', // Card/input surfaces
    text: {
      primary: '#050505', // Primary text
      secondary: '#65676B', // Secondary text
      tertiary: '#8A8D91', // Tertiary/placeholder
      inverse: '#FFFFFF', // White text on dark
    },
    border: {
      default: '#DADDE1', // Input/card borders
      light: '#E4E6EB', // Lighter borders
    },
    button: {
      primary: '#1877F2', // Meta blue CTA
      primaryHover: '#166FE5',
      primaryActive: '#1364D6',
    },
    link: '#1877F2', // Links match button blue
    progress: {
      track: '#E4E6EB',
      fill: '#1877F2',
    },
    statusBar: {
      time: '#050505',
      icons: '#050505',
    },
  },

  // Border radius
  radii: {
    card: 12, // Card container radius
    input: 10, // Input field radius
    button: 10, // Button radius
    progress: 4, // Progress bar radius
    frame: 40, // Device frame radius
  },

  // Spacing scale (px)
  spacing: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
  },

  // Typography
  typography: {
    // Font families (system fonts for native feel)
    fontFamily: {
      ios: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
      android: 'Roboto, "Helvetica Neue", Arial, sans-serif',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    // Font sizes
    fontSize: {
      xs: 11, // Status bar, small labels
      sm: 13, // Secondary text, privacy
      base: 15, // Input labels, body text
      lg: 17, // Headers, stage titles
      xl: 20, // Thank you title
    },
    // Font weights
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
    // Letter spacing
    letterSpacing: {
      tight: '-0.01em',
      normal: '0',
      wide: '0.01em',
    },
  },

  // Component-specific dimensions
  dimensions: {
    frame: {
      width: 360, // Device width
      height: 780, // Device height
      border: 8, // Frame border width
    },
    statusBar: {
      height: 32, // Status bar height with notch
      notchWidth: 120,
      notchHeight: 28,
    },
    header: {
      height: 56, // Header container height
      iconSize: 20, // Back chevron size
    },
    progress: {
      height: 3, // Progress bar height
    },
    input: {
      height: 44, // Input field height
      paddingX: 16,
      paddingY: 12,
    },
    button: {
      height: 48, // Primary button height
      paddingX: 24,
    },
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  // Horizontal slider
  slider: {
    slideWidth: 324,
    transitionDuration: '300ms',
  },

  // Progress bar
  progressBar: {
    height: 3,
    trackColor: '#E4E6EB',
    fillColor: '#1877F2',
  },

  // Intro screen
  intro: {
    profilePictureSize: 80,
    profilePictureBorder: 2,
  },
} as const

export type MetaFormTokens = typeof metaFormTokens

