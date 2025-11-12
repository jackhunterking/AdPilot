"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { COMPANY_NAME } from '@/lib/constants'
import { useAuth } from '@/components/auth/auth-provider'
import { LogOut, Moon, Sun, Check, User } from 'lucide-react'
import { useTheme } from 'next-themes'

export function LoggedInHeader() {
  const { user, profile, signOut } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()

  const credits = profile?.credits ?? 0
  const dailyCredits = profile?.daily_credits ?? 500

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <header className="flex h-16 items-center justify-between px-6 border-b border-border bg-background">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="relative h-10 w-10">
          <img src="/AdPilot-Logomark.svg" alt="AdPilot" className="h-10 w-10" />
        </div>
        <span className="text-2xl font-semibold">{COMPANY_NAME}</span>
      </Link>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm font-medium">
                  {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Credits</span>
                <span className="text-sm font-medium">{credits.toFixed(1)} left</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                  style={{ width: `${(credits / dailyCredits) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
                Daily credits used first
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {resolvedTheme === "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Sun className="mr-2 h-4 w-4" />
                )}
                Appearance
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                  {resolvedTheme === "light" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                  {resolvedTheme === "dark" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

