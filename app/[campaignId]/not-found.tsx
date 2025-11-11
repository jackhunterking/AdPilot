/**
 * Feature: Campaign Not Found Page
 * Purpose: Provide user-friendly 404 page for invalid or non-existent campaign IDs
 * References:
 *  - Next.js Not Found: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function CampaignNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <h1 className="mb-3 text-3xl font-bold tracking-tight">
          Campaign Not Found
        </h1>
        
        <p className="mb-8 text-muted-foreground">
          The campaign you're looking for doesn't exist or may have been deleted. 
          Please check the URL or return to your dashboard to view your campaigns.
        </p>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        
        <div className="mt-8 rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact support or try refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
}

