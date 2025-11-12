/**
 * Feature: Global Toast Notifications
 * Purpose: Provide a centralized Sonner toaster for surface-level success and error feedback.
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview#quick-start
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#observability
 *  - Supabase: https://supabase.com/docs/reference/javascript/introduction
 */
"use client"

import { Toaster } from "sonner"

export function SonnerToaster() {
  return <Toaster richColors position="bottom-right" />
}


