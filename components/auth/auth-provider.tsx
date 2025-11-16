"use client"

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/database.types'

type Profile = Tables<'profiles'>

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, redirectUrl?: string, tempPromptId?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  signInWithGoogle: (nextPath?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const isInitializingRef = useRef(false)
  const hasInitializedRef = useRef(false)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    // Prevent duplicate initialization
    if (isInitializingRef.current) {
      console.log('[AUTH-PROVIDER] Already initializing, skipping')
      return
    }

    isInitializingRef.current = true

    // Check if we just came from OAuth callback
    const hasAuthCallback = typeof window !== 'undefined' && 
      (window.location.search.includes('auth=success') || 
       window.location.search.includes('code='))

    console.log('[AUTH-PROVIDER] Initializing auth', { 
      hasAuthCallback, 
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      search: typeof window !== 'undefined' ? window.location.search : ''
    })

    const initAuth = async () => {
      try {
        // Get current session first to check if we already have one
        let { data: { session } } = await supabase.auth.getSession()
        
        // Only refresh if coming from OAuth callback AND we don't already have a session
        if (hasAuthCallback && !session) {
          console.log('[AUTH-PROVIDER] OAuth callback without session, refreshing')
          const refreshResult = await supabase.auth.refreshSession()
          session = refreshResult.data.session
        } else if (hasAuthCallback && session) {
          console.log('[AUTH-PROVIDER] OAuth callback with existing session, skipping refresh')
        }
        
        console.log('[AUTH-PROVIDER] Got session', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        })
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
        
        setLoading(false)
        hasInitializedRef.current = true
        
        // Clean up URL parameters after successful auth
        if (hasAuthCallback && typeof window !== 'undefined') {
          console.log('[AUTH-PROVIDER] Cleaning up URL parameters')
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch (error) {
        console.error('[AUTH-PROVIDER] Error initializing auth:', error)
        setLoading(false)
        hasInitializedRef.current = true
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't process auth state changes during initialization
      if (!hasInitializedRef.current) {
        console.log('[AUTH-PROVIDER] Skipping auth state change during initialization', { event })
        return
      }

      console.log('[AUTH-PROVIDER] Auth state changed', { 
        event, 
        hasSession: !!session,
        userId: session?.user?.id 
      })
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      isInitializingRef.current = false
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error }
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    redirectUrl?: string,
    tempPromptId?: string
  ) => {
    try {
      // Build options object conditionally to satisfy ESLint
      const signUpOptions: {
        emailRedirectTo?: string
        data?: { temp_prompt_id: string }
      } = {}
      
      if (redirectUrl) {
        signUpOptions.emailRedirectTo = redirectUrl
      }
      
      if (tempPromptId) {
        signUpOptions.data = { temp_prompt_id: tempPromptId }
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: Object.keys(signUpOptions).length > 0 ? signUpOptions : undefined,
      })
      
      if (error) return { error }
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const signInWithGoogle = async (nextPath: string = '/auth/post-login') => {
    // Read temp_prompt_id from localStorage before OAuth redirect
    const tempPromptId = typeof window !== 'undefined' 
      ? localStorage.getItem('temp_prompt_id')
      : null

    console.log('[AUTH-PROVIDER] Starting Google OAuth', { 
      nextPath, 
      hasTempPrompt: !!tempPromptId,
      tempPromptId 
    })

    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    const redirectTo = origin
      ? `${origin}/auth/callback?next=${encodeURIComponent(nextPath ?? '/')}`
      : undefined

    // Build OAuth options with temp_prompt_id in user metadata if available
    const oauthOptions: {
      redirectTo?: string
      data?: { temp_prompt_id: string }
    } = {}
    
    if (redirectTo) {
      oauthOptions.redirectTo = redirectTo
    }
    
    if (tempPromptId) {
      oauthOptions.data = { temp_prompt_id: tempPromptId }
      console.log('[AUTH-PROVIDER] Attaching temp_prompt_id to OAuth metadata')
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: Object.keys(oauthOptions).length > 0 ? oauthOptions : undefined,
    })
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    signInWithGoogle,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

