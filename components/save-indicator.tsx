"use client"

/**
 * SaveIndicator component
 * 
 * Note: Auto-save functionality has been moved to useDraftAutoSave hook.
 * Save state is no longer exposed via AdPreviewContext.
 * Auto-save happens silently every 15 seconds with console logging for debugging.
 * 
 * This component is kept for backward compatibility but currently returns null.
 * Can be re-implemented with a dedicated save state context if needed in the future.
 */
export function SaveIndicator() {
  // Auto-save now happens silently via useDraftAutoSave hook
  // No UI indicator needed as saves are automatic and logged to console
  return null
}

