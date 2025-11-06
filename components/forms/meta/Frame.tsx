/**
 * Feature: Meta Instant Forms Device Frame
 * Purpose: iOS-like device frame with status bar and notch for pixel-perfect preview
 * References:
 *  - Facebook Brand Guidelines: Device context display
 */

import { metaFormTokens } from './tokens'

interface FrameProps {
  children: React.ReactNode
}

export function Frame({ children }: FrameProps) {
  const { dimensions, colors, radii } = metaFormTokens

  return (
    <div
      className="mx-auto"
      style={{ width: dimensions.frame.width }}
    >
      {/* Device frame - iPhone style */}
      <div
        className="overflow-hidden shadow-2xl"
        style={{
          borderRadius: radii.frame,
          border: `${dimensions.frame.border}px solid #1c1c1e`,
          backgroundColor: '#1c1c1e',
        }}
      >
        {/* Status bar with notch */}
        <div
          className="relative"
          style={{
            height: dimensions.statusBar.height,
            backgroundColor: colors.background,
          }}
        >
          {/* Notch */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#1c1c1e]"
            style={{
              width: dimensions.statusBar.notchWidth,
              height: dimensions.statusBar.notchHeight,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
            }}
          />
          {/* Status icons */}
          <div
            className="absolute inset-0 flex items-center justify-between px-6"
            style={{ fontSize: metaFormTokens.typography.fontSize.xs }}
          >
            <span
              className="font-semibold"
              style={{ color: colors.statusBar.time }}
            >
              9:41
            </span>
            <div className="flex items-center gap-1">
              <div
                className="border rounded-sm"
                style={{
                  width: 16,
                  height: 10,
                  borderColor: colors.statusBar.icons,
                }}
              />
            </div>
          </div>
        </div>

        {/* Body - content area */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            minHeight: dimensions.frame.height - dimensions.statusBar.height,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

