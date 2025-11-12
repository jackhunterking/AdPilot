/**
 * Feature: Campaign Card Menu
 * Purpose: Three-dot dropdown menu for campaign actions
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { Tables } from '@/lib/supabase/database.types'
import { MoreHorizontal, FolderOpen, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Campaign = Tables<'campaigns'>

interface CampaignCardMenuProps {
  campaign: Campaign
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}

export function CampaignCardMenu({ campaign, onOpen, onRename, onDelete }: CampaignCardMenuProps) {
  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    e.preventDefault()
    action()
  }

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  const handleTriggerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        asChild 
        onClick={handleTriggerClick}
        onPointerDown={handleTriggerPointerDown}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => handleMenuClick(e, onOpen)}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleMenuClick(e, onRename)}>
          <Edit className="mr-2 h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => handleMenuClick(e, onDelete)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

