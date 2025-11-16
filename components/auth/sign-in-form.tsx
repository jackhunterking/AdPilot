"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from './auth-provider'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

interface SignInFormProps {
  onSuccess?: () => void
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      // Provide more user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in. Check your inbox for the confirmation link.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      // Check for temp prompt before closing modal
      const tempPromptId = typeof window !== 'undefined' 
        ? localStorage.getItem('temp_prompt_id')
        : null
      
      if (tempPromptId) {
        console.log('[SIGN-IN] Temp prompt found, redirecting to post-login handler')
        // Redirect to post-login handler to process temp prompt
        window.location.href = '/auth/post-login'
      } else {
        // No temp prompt, just close modal
        onSuccess?.()
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 text-base font-medium"
          onClick={() => { void signInWithGoogle('/auth/post-login') }}
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
        <Label htmlFor="signin-email" className="text-sm font-medium">
          Email address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signin-email"
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
        <Label htmlFor="signin-password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signin-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  )
}

