"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Tables } from '@/lib/supabase/database.types'
import { CampaignCardMenu } from '@/components/workspace/campaign-card-menu'
import { DeleteCampaignDialog } from '@/components/workspace/delete-campaign-dialog'
import { RenameCampaignDialog } from '@/components/workspace/rename-campaign-dialog'
import { toast } from 'sonner'

type Campaign = Tables<'campaigns'> & {
  campaign_states?: Tables<'campaign_states'>
}

export function CampaignGrid() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  
  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [campaignToRename, setCampaignToRename] = useState<Campaign | null>(null)

  const fetchCampaigns = useCallback(async () => {
    try {
      // Fetch 7 campaigns to check if there are more than 6
      const response = await fetch('/api/campaigns?limit=7', {
        cache: 'no-store',
      })
      if (response.ok) {
        const { campaigns: data } = await response.json()
        const campaignList = data || []
        // Show only first 6, but check if there are more
        setHasMore(campaignList.length > 6)
        setCampaigns(campaignList.slice(0, 6))
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getThumbnail = (campaign: Campaign): string => {
    // Images are stored in campaign_states.ad_preview_data
    const adPreviewData = campaign.campaign_states?.ad_preview_data as unknown as { adContent?: { baseImageUrl?: string; imageVariations?: string[] } } | null
    
    if (adPreviewData?.adContent?.baseImageUrl) {
      return adPreviewData.adContent.baseImageUrl
    }
    
    if (adPreviewData?.adContent?.imageVariations && adPreviewData.adContent.imageVariations.length > 0) {
      const firstImage = adPreviewData.adContent.imageVariations[0]
      if (firstImage) {
        return firstImage
      }
    }
    
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

    // Store campaigns for rollback if needed
    const previousCampaigns = campaigns

    try {
      // Optimistically remove from UI
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      setDeleteDialogOpen(false)
      setCampaignToDelete(null)

      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to delete campaign:', errorData)
        
        // Rollback: restore the campaign
        setCampaigns(previousCampaigns)
        
        toast.error(`Failed to delete campaign: ${errorData.error || 'Unknown error'}`)
        return
      }

      // Success - invalidate and refresh
      toast.success(`"${campaignName}" deleted successfully`)
      
      // Refresh the data from server
      router.refresh()
      
      // Refetch to ensure we have latest data
      await fetchCampaigns()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      
      // Rollback: restore the campaign
      setCampaigns(previousCampaigns)
      
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      toast.error(`Failed to delete campaign: ${errorMessage}`)
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
          {hasMore && (
            <button
              onClick={() => router.push('/workspace')}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
            >
              View all →
            </button>
          )}
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

