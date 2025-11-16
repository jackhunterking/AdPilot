"use client"

/**
 * Feature: Authentication Modal
 * Purpose: Modal dialog for sign in/sign up with tabbed interface
 * Journey Context:
 *   - Journey 1: Opened after user enters prompt (unauthenticated)
 *   - Journey 2: Opened when user clicks "Sign Up" button
 *   - Journey 3: Opened when user clicks "Sign In" button
 * Key Behavior:
 *   - Switches between SignInForm and SignUpForm
 *   - Shows email confirmation dialog after successful signup
 *   - Closes after successful authentication (unless redirecting to post-login)
 * References:
 *   - AUTH_JOURNEY_MASTER_PLAN.md - Journey 1, Journey 2, Journey 3
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'
import { Mail, Sparkles } from 'lucide-react'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'signin' | 'signup'
}

export function AuthModal({ open, onOpenChange, defaultTab = 'signin' }: AuthModalProps) {
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const handleSignUpSuccess = (email: string) => {
    setUserEmail(email)
    setShowEmailConfirmation(true)
  }

  const handleSignInSuccess = () => {
    onOpenChange(false)
  }

  const handleCloseConfirmation = () => {
    setShowEmailConfirmation(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        {showEmailConfirmation ? (
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="text-muted-foreground text-sm">
                  We&apos;ve sent a confirmation link to
                </p>
                <p className="font-medium text-foreground">{userEmail}</p>
              </div>
            </div>
            
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-500 font-bold text-xs">1</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to verify your account
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-500 font-bold text-xs">2</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Return here and sign in with your credentials
                </p>
              </div>
            </div>

            <div className="text-center space-y-3">
              <button
                onClick={handleCloseConfirmation}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors"
              >
                Got it, I&apos;ll check my email
              </button>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-8 text-white">
              <div className="absolute top-4 right-4 opacity-20">
                <Sparkles className="h-12 w-12" />
              </div>
              <DialogHeader className="space-y-3 relative">
                <DialogTitle className="text-3xl font-bold text-white">
                  Welcome to AdPilot
                </DialogTitle>
                <DialogDescription className="text-blue-50 text-base">
                  Create stunning AI-powered ad campaigns in minutes
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="p-8">
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-11 bg-muted p-1">
                  <TabsTrigger value="signin" className="text-sm font-medium">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium">
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-6">
                  <SignInForm onSuccess={handleSignInSuccess} />
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                  <SignUpForm onSuccess={handleSignUpSuccess} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

