/**
 * Feature: AI Chat Confirmation Card
 * Purpose: Inline confirmation dialog for AI tool actions
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

import { Button } from "@/components/ui/button"
import { Sparkles, AlertTriangle } from "lucide-react"

export interface ConfirmationCardProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'warning'
}

export function ConfirmationCard({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default'
}: ConfirmationCardProps) {
  const icon = variant === 'warning' ? (
    <AlertTriangle className="h-5 w-5 text-orange-600" />
  ) : (
    <Sparkles className="h-5 w-5 text-blue-600" />
  )
  
  const borderColor = variant === 'warning' 
    ? 'border-orange-500/30 bg-orange-500/5' 
    : 'border-blue-500/30 bg-blue-500/5'

  return (
    <div className={`border rounded-lg p-4 my-2 ${borderColor} max-w-md`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          {cancelText}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  )
}

export function SuccessCard({ message }: { message: string }) {
  return (
    <div className="border rounded-lg p-4 my-2 bg-green-500/5 border-green-500/30 max-w-md">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-green-600" />
        <p className="font-medium text-sm text-green-600">{message}</p>
      </div>
    </div>
  )
}

