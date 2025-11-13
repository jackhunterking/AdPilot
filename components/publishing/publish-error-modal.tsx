/**
 * Feature: Publish Error Modal
 * Purpose: Display detailed error information when ad publishing fails
 * References:
 *  - Shadcn Dialog: https://ui.shadcn.com/docs/components/dialog
 */

"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, XCircle, RefreshCw, Edit } from "lucide-react"
import type { PublishError } from "@/lib/types/workspace"

interface PublishErrorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: PublishError
  adName?: string
  onRetry?: () => void
  onEdit?: () => void
}

export function PublishErrorModal({
  open,
  onOpenChange,
  error,
  adName,
  onRetry,
  onEdit
}: PublishErrorModalProps) {
  // Determine icon and color based on error type
  const getErrorIcon = () => {
    switch (error.code) {
      case 'policy_violation':
      case 'validation_error':
        return <AlertTriangle className="h-6 w-6 text-orange-600" />
      default:
        return <XCircle className="h-6 w-6 text-red-600" />
    }
  }

  const getErrorTitle = () => {
    switch (error.code) {
      case 'validation_error':
        return 'Validation Error'
      case 'policy_violation':
        return 'Policy Violation'
      case 'payment_required':
        return 'Payment Method Required'
      case 'token_expired':
        return 'Connection Expired'
      case 'api_error':
        return 'API Error'
      case 'network_error':
        return 'Network Error'
      default:
        return 'Publishing Failed'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              {getErrorIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{getErrorTitle()}</DialogTitle>
              {adName && (
                <DialogDescription className="text-sm text-muted-foreground">
                  Failed to publish <strong>{adName}</strong>
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* User-friendly message */}
          <Alert variant={error.recoverable ? "default" : "destructive"}>
            <AlertDescription className="text-sm">
              {error.userMessage}
            </AlertDescription>
          </Alert>

          {/* Technical details (collapsible) */}
          {error.message && (
            <details className="rounded-lg border border-border bg-muted/50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <div className="mt-3 space-y-2">
                <div className="text-xs">
                  <span className="font-semibold">Error Code:</span> {error.code}
                </div>
                <div className="text-xs">
                  <span className="font-semibold">Message:</span> {error.message}
                </div>
                {error.details && Object.keys(error.details).length > 0 && (
                  <div className="text-xs">
                    <span className="font-semibold">Details:</span>
                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[10px]">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Suggested action */}
          {error.suggestedAction && (
            <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Suggested Action
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                {error.suggestedAction}
              </p>
            </div>
          )}

          {/* Help links based on error type */}
          {error.code === 'policy_violation' && (
            <div className="text-xs text-muted-foreground">
              <a 
                href="https://www.facebook.com/policies/ads/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Review Meta's Advertising Policies →
              </a>
            </div>
          )}

          {error.code === 'token_expired' && (
            <div className="text-xs text-muted-foreground">
              You'll need to reconnect your Facebook account before retrying.
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>

          {onEdit && error.recoverable && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onEdit()
              }}
              className="w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Ad
            </Button>
          )}

          {onRetry && error.recoverable && (
            <Button
              onClick={() => {
                onOpenChange(false)
                onRetry()
              }}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Publishing
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

