/**
 * Feature: Temporary Prompts (v1)
 * Purpose: Store temporary campaign prompts during signup flow (1-hour TTL)
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Supabase: https://supabase.com/docs/reference/javascript/insert
 */

import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, successResponse, ApiError, ValidationError } from '@/app/api/v1/_middleware'
import { supabaseServer } from '@/lib/supabase/server'
import type { PostgrestError } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { promptText, goalType } = await request.json()

    // Optional correlation id for prod debugging
    const correlationId = request.headers.get('x-request-id') || undefined

    // Guard: ensure required envs are present in runtime (extra safety)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[TEMP-PROMPT v1] Missing Supabase server envs', { correlationId })
      return errorResponse(
        new ApiError('Server is misconfigured. Please try again later.', 'server_misconfigured', 500)
      )
    }

    if (!promptText || typeof promptText !== 'string') {
      return errorResponse(new ValidationError('Prompt text is required'))
    }

    const { data, error } = await supabaseServer
      .from('temp_prompts')
      .insert({
        prompt_text: promptText,
        goal_type: goalType || null,
      })
      .select()
      .single()

    if (error) {
      const { message, details, hint, code } = error as PostgrestError
      console.error('[TEMP-PROMPT v1] Failed to store prompt', {
        correlationId,
        message,
        details,
        hint,
        code,
      })
      return errorResponse(new ApiError('Failed to store prompt', 'database_error', 500))
    }

    return successResponse({ tempId: data.id })
  } catch (error) {
    console.error('[TEMP-PROMPT v1] Unexpected error in POST', error)
    return errorResponse(error instanceof Error ? error : new ApiError('Internal server error', 'internal_error', 500))
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tempId = searchParams.get('id')

    if (!tempId) {
      return errorResponse(new ValidationError('Temp ID is required'))
    }

    const { data, error } = await supabaseServer
      .from('temp_prompts')
      .select('*')
      .eq('id', tempId)
      .eq('used', false)
      .single()

    if (error || !data) {
      return errorResponse(new ApiError('Prompt not found or already used', 'not_found', 404))
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      return errorResponse(new ApiError('Prompt has expired', 'expired', 410))
    }

    return successResponse({ 
      promptText: data.prompt_text,
      goalType: data.goal_type 
    })
  } catch (error) {
    console.error('[TEMP-PROMPT v1] Unexpected error in GET', error)
    return errorResponse(error instanceof Error ? error : new ApiError('Internal server error', 'internal_error', 500))
  }
}

