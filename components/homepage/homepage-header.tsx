"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { COMPANY_NAME } from '@/lib/constants'

interface HomepageHeaderProps {
  onSignInClick: () => void
  onSignUpClick: () => void
}

export function HomepageHeader({ onSignInClick, onSignUpClick }: HomepageHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between px-6 border-b border-border bg-background">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="relative h-10 w-10">
          <img src="/adpilot-newlogo.png" alt="AdPilot" className="h-10 w-10" />
        </div>
        <span className="text-2xl font-semibold">{COMPANY_NAME}</span>
      </Link>
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onSignInClick}>
          Sign In
        </Button>
        <Button onClick={onSignUpClick}>
          Sign Up
        </Button>
      </div>
    </header>
  )
}

