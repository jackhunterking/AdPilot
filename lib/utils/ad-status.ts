/**
 * Feature: Ad Status Utilities
 * Purpose: Helper functions for ad status labels, colors, validation, and messaging
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import type { AdStatus, MetaReviewStatus, AdVariant } from '@/lib/types/workspace'

/**
 * Status display configuration
 */
interface StatusConfig {
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  icon?: string
}

/**
 * Get user-friendly label for ad status
 */
export function getStatusLabel(status: AdStatus, short = false): string {
  const config = getStatusConfig(status)
  return short ? config.shortLabel : config.label
}

/**
 * Get color coding for status
 */
export function getStatusColor(status: AdStatus): string {
  return getStatusConfig(status).color
}

/**
 * Get complete status configuration
 */
export function getStatusConfig(status: AdStatus): StatusConfig {
  const configs: Record<AdStatus, StatusConfig> = {
    draft: {
      label: 'Draft',
      shortLabel: 'Draft',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      description: 'This ad is being built and hasn\'t been published yet',
      icon: '📝'
    },
    pending_review: {
      label: 'Meta is Reviewing',
      shortLabel: 'Reviewing',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      description: 'Your ad is under review by Meta. This typically takes up to 24 hours',
      icon: '⏳'
    },
    active: {
      label: 'Live',
      shortLabel: 'Live',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300',
      description: 'Your ad is live and running',
      icon: '✅'
    },
    learning: {
      label: 'Learning',
      shortLabel: 'Learning',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-300',
      description: 'Your ad is in the learning phase. Meta is optimizing delivery',
      icon: '📊'
    },
    paused: {
      label: 'Paused',
      shortLabel: 'Paused',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      description: 'This ad is temporarily paused and not showing to anyone',
      icon: '⏸️'
    },
    rejected: {
      label: 'Needs Changes',
      shortLabel: 'Rejected',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      description: 'Meta couldn\'t approve this ad. You can edit and resubmit',
      icon: '❌'
    },
    failed: {
      label: 'Publishing Failed',
      shortLabel: 'Failed',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      description: 'Publishing failed due to an error. Click for details',
      icon: '⚠️'
    },
    archived: {
      label: 'Archived',
      shortLabel: 'Archived',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      description: 'This ad has been archived and is no longer active',
      icon: '📦'
    }
  }

  return configs[status]
}

/**
 * Get review status label
 */
export function getReviewStatusLabel(reviewStatus: MetaReviewStatus): string {
  const labels: Record<MetaReviewStatus, string> = {
    not_submitted: 'Not Submitted',
    pending: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    changes_requested: 'Changes Requested'
  }
  
  return labels[reviewStatus]
}

/**
 * Get detailed status message with context
 */
export function getStatusMessage(ad: AdVariant): string {
  const config = getStatusConfig(ad.status)
  let message = config.description
  
  // Add date context where applicable
  if (ad.status === 'active' && ad.approved_at) {
    const date = new Date(ad.approved_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    message = `Your ad is live and running. Started on ${date}`
  }
  
  if (ad.status === 'pending_review' && ad.published_at) {
    const hoursAgo = Math.floor((Date.now() - new Date(ad.published_at).getTime()) / (1000 * 60 * 60))
    if (hoursAgo < 1) {
      message = 'Your ad was just submitted for review. Meta typically reviews ads within 24 hours'
    } else if (hoursAgo < 24) {
      message = `Your ad has been under review for ${hoursAgo} hour${hoursAgo > 1 ? 's' : ''}. Meta typically reviews ads within 24 hours`
    } else {
      message = 'Your ad is taking longer than usual to review. This can happen during high-volume periods'
    }
  }
  
  if (ad.status === 'failed') {
    message = 'Publishing failed. Click the info icon to see error details and retry'
  }
  
  return message
}

/**
 * Check if ad can be published
 */
export function canPublish(ad: AdVariant): boolean {
  // Only draft, rejected, and failed ads can be published/republished
  return ad.status === 'draft' || ad.status === 'rejected' || ad.status === 'failed'
}

/**
 * Check if ad can be edited
 */
export function canEdit(ad: AdVariant): boolean {
  // Can edit drafts, rejected ads, and paused ads
  // Active ads require pause first
  return ['draft', 'rejected', 'paused'].includes(ad.status)
}

/**
 * Check if ad can be paused
 */
export function canPause(ad: AdVariant): boolean {
  // Can only pause active or learning ads
  return ad.status === 'active' || ad.status === 'learning'
}

/**
 * Check if ad can be resumed
 */
export function canResume(ad: AdVariant): boolean {
  // Can only resume paused ads
  return ad.status === 'paused'
}

/**
 * Check if ad can be deleted
 */
export function canDelete(ad: AdVariant): boolean {
  // Can delete drafts, rejected ads, archived ads
  // Cannot delete active ads (must pause first)
  return ['draft', 'rejected', 'archived', 'paused'].includes(ad.status)
}

/**
 * Validate status transition
 */
export function canTransitionTo(currentStatus: AdStatus, newStatus: AdStatus): boolean {
  // Define valid transitions
  const validTransitions: Record<AdStatus, AdStatus[]> = {
    draft: ['pending_review', 'archived'],
    pending_review: ['active', 'rejected', 'failed', 'archived'],
    active: ['paused', 'learning', 'archived'],
    learning: ['active', 'paused', 'archived'],
    paused: ['active', 'archived'],
    rejected: ['draft', 'pending_review', 'archived'],
    failed: ['draft', 'pending_review', 'archived'],
    archived: [] // Cannot transition from archived
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Get next possible statuses for an ad
 */
export function getNextStatuses(currentStatus: AdStatus): AdStatus[] {
  const validTransitions: Record<AdStatus, AdStatus[]> = {
    draft: ['pending_review'],
    pending_review: ['active', 'rejected', 'failed'],
    active: ['paused'],
    learning: ['paused'],
    paused: ['active'],
    rejected: ['pending_review'],
    failed: ['pending_review'],
    archived: []
  }
  
  return validTransitions[currentStatus] ?? []
}

/**
 * Get action label for status transition
 */
export function getActionLabel(currentStatus: AdStatus, targetStatus: AdStatus): string {
  const actionLabels: Record<string, string> = {
    'draft->pending_review': 'Publish Ad',
    'pending_review->active': 'Approve Ad',
    'pending_review->rejected': 'Reject Ad',
    'pending_review->failed': 'Mark Failed',
    'active->paused': 'Pause Ad',
    'learning->paused': 'Pause Ad',
    'paused->active': 'Resume Ad',
    'rejected->pending_review': 'Resubmit Ad',
    'rejected->draft': 'Edit Draft',
    'failed->pending_review': 'Retry Publishing',
    'failed->draft': 'Edit Draft'
  }
  
  const key = `${currentStatus}->${targetStatus}`
  return actionLabels[key] ?? 'Update Status'
}

/**
 * Check if ad is in a final state (cannot be changed)
 */
export function isFinalState(status: AdStatus): boolean {
  return status === 'archived'
}

/**
 * Check if ad is live (delivering to audience)
 */
export function isLive(status: AdStatus): boolean {
  return status === 'active' || status === 'learning'
}

/**
 * Check if ad needs attention
 */
export function needsAttention(ad: AdVariant): boolean {
  // Rejected and failed ads need attention
  if (ad.status === 'rejected' || ad.status === 'failed') {
    return true
  }
  
  // Pending ads that have been waiting > 48 hours need attention
  if (ad.status === 'pending_review' && ad.published_at) {
    const hoursAgo = (Date.now() - new Date(ad.published_at).getTime()) / (1000 * 60 * 60)
    return hoursAgo > 48
  }
  
  return false
}

/**
 * Sort ads by status priority
 * Priority order: rejected > pending_approval > active > learning > paused > draft > archived
 */
export function sortByStatusPriority(ads: AdVariant[]): AdVariant[] {
  const priorityOrder: Record<AdStatus, number> = {
    failed: 1,
    rejected: 2,
    pending_review: 3,
    active: 4,
    learning: 5,
    paused: 6,
    draft: 7,
    archived: 8
  }
  
  return [...ads].sort((a, b) => {
    return priorityOrder[a.status] - priorityOrder[b.status]
  })
}

/**
 * Filter ads by status
 */
export function filterByStatus(ads: AdVariant[], statuses: AdStatus[]): AdVariant[] {
  return ads.filter(ad => statuses.includes(ad.status))
}

/**
 * Get status summary for a campaign
 */
export function getStatusSummary(ads: AdVariant[]): Record<AdStatus, number> {
  const summary: Record<AdStatus, number> = {
    draft: 0,
    pending_review: 0,
    active: 0,
    learning: 0,
    paused: 0,
    rejected: 0,
    failed: 0,
    archived: 0
  }
  
  ads.forEach(ad => {
    summary[ad.status] = (summary[ad.status] || 0) + 1
  })
  
  return summary
}

