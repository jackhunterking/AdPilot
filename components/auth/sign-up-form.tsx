"use client"

/**
 * Feature: Sign Up Form
 * Purpose: Create new user accounts via email/password or Google OAuth
 * Journey Context:
 *   - Journey 1: User has temp_prompt → After email verification + sign in → Campaign created
 *   - Journey 2: User has NO temp_prompt → After email verification + sign in → Homepage (no automation)
 * Key Behavior:
 *   - Attaches temp_prompt_id to user_metadata for OAuth persistence
 *   - Clears localStorage.temp_prompt_id immediately (relies on metadata)
 *   - Shows email confirmation dialog after signup
 *   - OAuth uses smart redirect (via auth-provider)
 * References:
 *   - AUTH_JOURNEY_MASTER_PLAN.md - Journey 1, Journey 2
 *   - Supabase Auth: https://supabase.com/docs/guides/auth
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from './auth-provider'
import { Mail, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

interface SignUpFormProps {
  onSuccess?: (email: string) => void
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signUp, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Password validation helpers
  const hasMinLength = password.length >= 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const showValidation = password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Password must contain uppercase, lowercase, and number')
      return
    }

    setLoading(true)

    // Get temp_prompt_id from localStorage ONE LAST TIME
    const tempPromptId = typeof window !== 'undefined' 
      ? localStorage.getItem('temp_prompt_id')
      : null

    // Clear it immediately - we'll rely on Supabase metadata
    if (tempPromptId && typeof window !== 'undefined') {
      localStorage.removeItem('temp_prompt_id')
    }

    // Get the current URL for redirect after email verification
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}?verified=true`
      : undefined

    // Supabase stores tempPromptId in user.user_metadata.temp_prompt_id
    const { error } = await signUp(email, password, redirectUrl, tempPromptId || undefined)

    if (error) {
      // Provide more user-friendly error messages
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Try signing in instead.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      onSuccess?.(email)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 text-base font-medium"
          onClick={() => { void signInWithGoogle() }}
        >
          <span className="flex items-center justify-center gap-2">
            Continue with Google
          </span>
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-sm font-medium">
          Email address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="pl-10 h-11"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="pl-10 h-11"
          />
        </div>
        
        {showValidation && (
          <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-2">Password requirements:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-3.5 w-3.5 ${hasMinLength ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className={hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-3.5 w-3.5 ${hasUpperCase ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className={hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                  One uppercase letter
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-3.5 w-3.5 ${hasLowerCase ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className={hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                  One lowercase letter
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-3.5 w-3.5 ${hasNumber ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className={hasNumber ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                  One number
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-confirm-password" className="text-sm font-medium">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className="pl-10 h-11"
          />
        </div>
      </div>
      
      {error && (
        <div className="flex items-start gap-3 text-sm text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      
      <Button 
        type="submit" 
        variant="default"
        className="w-full h-11 text-base font-medium" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  )
}

