"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Tables } from '@/lib/supabase/database.types'
import { CampaignCardMenu } from '@/components/workspace/campaign-card-menu'
import { DeleteCampaignDialog } from '@/components/workspace/delete-campaign-dialog'
import { RenameCampaignDialog } from '@/components/workspace/rename-campaign-dialog'
import { toast } from 'sonner'

type Campaign = Tables<'campaigns'> & {
  ads?: Array<{
    id: string
    name: string
    status: string
    ad_creatives?: Array<{ 
      image_url: string
      creative_format: string
    }>
  }>
}

export function CampaignGrid() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  
  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [campaignToRename, setCampaignToRename] = useState<Campaign | null>(null)

  const fetchCampaigns = useCallback(async () => {
    try {
      // Fetch up to 6 campaigns for homepage preview
      const response = await fetch('/api/v1/campaigns?limit=6', {
        cache: 'no-store',
      })
      
      if (response.ok) {
        const { campaigns: data } = await response.json()
        // Filter out any null/invalid campaigns
        const campaignList = (data || []).filter((c: Campaign | null) => c && c.id)
        // Show only first 6 for homepage preview
        setCampaigns(campaignList.slice(0, 6))
      } else if (response.status === 401) {
        // Auth timing issue - silently set empty and let user try again
        console.log('Auth not ready, campaigns will load after sign in')
        setCampaigns([])
      } else if (response.status >= 500) {
        // Server error - show error message
        console.error('Server error fetching campaigns:', response.status)
        setCampaigns([])
        toast.error('Failed to load campaigns. Please try again later.')
      } else {
        // Other client errors (400-499) - log but don't show error
        console.warn('Campaign fetch returned:', response.status)
        setCampaigns([])
      }
    } catch (error) {
      // Network errors - show error (real connectivity issue)
      console.error('Network error fetching campaigns:', error)
      setCampaigns([])
      toast.error('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Force refresh Next.js cache on mount to prevent stale data
    router.refresh()
    fetchCampaigns()
  }, [router, fetchCampaigns])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getThumbnail = (campaign: Campaign): string => {
    // Images are now stored in ads table via ad_creatives
    // Note: campaign_states.ad_preview_data no longer exists
    // For now, return placeholder - thumbnail should be fetched from ads API
    // TODO: Update to fetch thumbnail from first ad's creative
    return '/placeholder.svg'
  }

  const handleDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign)
    setDeleteDialogOpen(true)
  }

  const handleRename = (campaign: Campaign) => {
    setCampaignToRename(campaign)
    setRenameDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete || isDeleting) return

    setIsDeleting(true)
    const campaignName = campaignToDelete.name
    const campaignId = campaignToDelete.id
    const previousCampaigns = campaigns

    try {
      // Optimistic update - remove immediately
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      setDeleteDialogOpen(false)
      setCampaignToDelete(null)

      const response = await fetch(`/api/v1/campaigns/${campaignId}`, {
        method: 'DELETE',
        cache: 'no-store',
      })

      // Success: 200-299 (including idempotent 200 for already-deleted)
      if (response.ok) {
        toast.success(`"${campaignName}" deleted successfully`)
        router.refresh() // Invalidate Next.js cache for future navigations
        // No need to re-fetch - optimistic update already removed it from UI
        return
      }

      // Client errors (400-499) = operation complete (no retry will help)
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({ error: 'Access denied' }))
        toast.warning(`Cannot delete: ${errorData.error}`)
        // Don't rollback - user can't delete this anyway
        return
      }

      // Server errors (500+) = temporary issue, rollback and let user retry
      if (response.status >= 500) {
        const errorData = await response.json().catch(() => ({ error: 'Server error' }))
        setCampaigns(previousCampaigns) // Rollback
        toast.error(`Server error: ${errorData.error}. Please try again.`)
        return
      }

    } catch (error) {
      // Network error - rollback
      console.error('Delete campaign error:', error)
      setCampaigns(previousCampaigns)
      toast.error('Network error. Please check your connection.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRenameSuccess = (updatedCampaign: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c))
    setRenameDialogOpen(false)
    setCampaignToRename(null)
  }

  if (loading) {
    return (
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Your Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted animate-pulse h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (campaigns.length === 0) {
    return (
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Your Campaigns</h2>
          <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed border-border">
            <p className="text-muted-foreground text-lg">
              No campaigns yet. Start by describing your campaign above!
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Campaigns</h2>
          <Link
            href="/workspace"
            className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className="group relative bg-card rounded-xl overflow-hidden border border-border hover:border-blue-500 transition-all hover:shadow-xl"
            >
              {/* Three-dot menu - always visible */}
              <div className="absolute top-2 right-2 z-10">
                <CampaignCardMenu
                  campaign={campaign}
                  onOpen={() => router.push(`/${campaign.id}`)}
                  onRename={() => handleRename(campaign)}
                  onDelete={() => handleDelete(campaign)}
                />
              </div>
              
              <div 
                onClick={() => router.push(`/${campaign.id}`)}
                className="cursor-pointer"
              >
                <div className="relative aspect-video bg-muted">
                  <Image
                    src={getThumbnail(campaign)}
                    alt={campaign.name}
                    width={800}
                    height={450}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={index < 3}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg truncate">
                    {campaign.name}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatDate(campaign.created_at)}
                    </span>
                    <Badge variant={campaign.status === 'draft' ? 'secondary' : 'default'}>
                      {campaign.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <DeleteCampaignDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        campaign={campaignToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      <RenameCampaignDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        campaign={campaignToRename}
        onSuccess={handleRenameSuccess}
      />
    </section>
  )
}

