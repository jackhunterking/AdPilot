/**
 * Feature: Typed environment loader
 * Purpose: Validate and expose required environment variables for Meta + Supabase
 * References:
 *  - Supabase (server env): https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { z } from 'zod'

const EnvSchema = z.object({
  NEXT_PUBLIC_FB_APP_ID: z.string().min(1),
  FB_APP_SECRET: z.string().min(1),
  NEXT_PUBLIC_FB_GRAPH_VERSION: z.string().min(1).default('v24.0'),
  // Legacy single Business Login config (kept for back-compat)
  NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID: z.string().min(1).optional(),
  // New: split configs for system vs user login
  NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_SYSTEM: z.string().min(1).optional(),
  NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_USER: z.string().min(1).optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Debug mode flag - set to '1' or 'true' to enable verbose logging
  // Default: false (production mode with minimal logs)
  NEXT_PUBLIC_DEBUG: z.string().optional(),
})

export const env = EnvSchema.parse(process.env)


