/**
 * Feature: Generic Tool Confirmation Card
 * Purpose: Reusable confirmation UI for all AI tools requiring user approval
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */
"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ToolConfirmationItem {
  label: string
  value: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

interface ToolConfirmationCardProps {
  icon: LucideIcon
  iconColor: string
  iconBgColor: string
  title: string
  message?: string
  items: ToolConfirmationItem[]
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

export function ToolConfirmationCard({
  icon: Icon,
  iconColor,
  iconBgColor,
  title,
  message,
  items,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false
}: ToolConfirmationCardProps) {
  return (
    <div className="border rounded-lg bg-card p-4 space-y-4 my-3">
      <div className="flex items-start gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          
          {items.length > 0 && (
            <div className="space-y-2 pt-2">
              {items.map((item, idx) => {
                const variantStyles = {
                  default: 'bg-card border-border',
                  destructive: 'bg-red-500/5 border-red-500/20',
                  success: 'bg-green-500/5 border-green-500/20',
                  warning: 'bg-orange-500/5 border-orange-500/20'
                };
                
                const badgeVariants = {
                  default: undefined,
                  destructive: 'destructive' as const,
                  success: undefined,
                  warning: undefined
                };
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-md border ${variantStyles[item.variant || 'default']}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium truncate">{item.value}</p>
                    </div>
                    {item.variant && item.variant !== 'default' && (
                      <Badge variant={badgeVariants[item.variant]} className="text-[10px] h-5 ml-2 flex-shrink-0">
                        {item.variant === 'destructive' ? 'Remove' : 
                         item.variant === 'success' ? 'Add' :
                         item.variant === 'warning' ? 'Warning' : ''}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={onConfirm} 
              size="sm" 
              className="flex-1"
              variant={isDestructive ? "destructive" : "default"}
            >
              {confirmText}
            </Button>
            <Button 
              onClick={onCancel} 
              variant="outline" 
              size="sm" 
              className="flex-1"
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

