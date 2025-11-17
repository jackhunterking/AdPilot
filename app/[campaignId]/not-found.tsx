'use client'

/**
 * Feature: Campaign Not Found Page
 * Purpose: User-friendly error page when campaign doesn't exist or is inaccessible
 * References:
 *  - Next.js not-found pattern: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function CampaignNotFound() {
  const router = useRouter()
  
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="max-w-md space-y-6 text-center px-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Campaign Not Found</h1>
          <p className="text-muted-foreground">
            The campaign you're looking for doesn't exist or may have been deleted.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/')} 
            className="w-full"
          >
            Back to Campaigns
          </Button>
          
          <Button 
            onClick={() => router.refresh()} 
            variant="outline" 
            className="w-full"
          >
            Try Again
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          If you believe this is an error, please contact support or try refreshing the page.
        </p>
      </div>
    </div>
  )
}
