/**
 * Feature: Workspace View
 * Purpose: Full campaign management page with search, filters, and actions
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { Suspense } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { LoggedInHeader } from '@/components/homepage/logged-in-header'
import { WorkspaceGrid } from '@/components/workspace/workspace-grid'

function WorkspaceContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to home if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LoggedInHeader />
      <main className="flex-1">
        <WorkspaceGrid />
      </main>
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}

