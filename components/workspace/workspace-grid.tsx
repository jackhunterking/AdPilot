/**
 * Feature: Workspace Grid
 * Purpose: Campaign grid with search, filters, and management actions
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tables } from '@/lib/supabase/database.types'
import { CampaignCardMenu } from './campaign-card-menu'
import { DeleteCampaignDialog } from './delete-campaign-dialog'
import { RenameCampaignDialog } from './rename-campaign-dialog'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Campaign = Tables<'campaigns'>

export function WorkspaceGrid() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  
  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [campaignToRename, setCampaignToRename] = useState<Campaign | null>(null)

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch('/api/campaigns', {
        cache: 'no-store',
      })
      
      if (response.ok) {
        const { campaigns: data } = await response.json()
        // Filter out any null/invalid campaigns
        const campaignList = (data || []).filter((c: Campaign | null) => c && c.id)
        setCampaigns(campaignList)
        setFilteredCampaigns(campaignList)
      } else {
        console.error('Failed to fetch campaigns:', response.status)
        setCampaigns([])
        setFilteredCampaigns([])
        toast.error('Failed to load campaigns')
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setCampaigns([])
      setFilteredCampaigns([])
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Force refresh Next.js cache on mount to prevent stale data
    router.refresh()
    fetchCampaigns()
  }, [router, fetchCampaigns])

  // Filter and search logic
  useEffect(() => {
    let result = [...campaigns]

    // Apply search filter
    if (searchQuery) {
      result = result.filter(campaign =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(campaign => campaign.status === statusFilter)
    }

    // Apply sorting
    if (sortBy === 'updated') {
      result.sort((a, b) => {
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0
        return bTime - aTime
      })
    } else if (sortBy === 'created') {
      result.sort((a, b) => {
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        return bTime - aTime
      })
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    setFilteredCampaigns(result)
  }, [campaigns, searchQuery, statusFilter, sortBy])

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

      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        cache: 'no-store',
      })

      // Success: 200-299 (including idempotent 200 for already-deleted)
      if (response.ok) {
        toast.success(`"${campaignName}" deleted successfully`)
        router.refresh() // Invalidate Next.js cache
        await fetchCampaigns() // Get fresh data
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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Workspace</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Workspace</h1>
          <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed border-border">
            <p className="text-muted-foreground text-lg">
              No campaigns yet. Start by creating your first campaign!
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Workspace</h1>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last edited</SelectItem>
              <SelectItem value="created">Date created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCampaigns.map((campaign, index) => (
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
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, (max-width: 1536px) 33vw, 25vw"
                    priority={index < 4}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg truncate">
                    {campaign.name}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatDate(campaign.updated_at)}
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

        {filteredCampaigns.length === 0 && campaigns.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No campaigns match your filters</p>
          </div>
        )}
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

