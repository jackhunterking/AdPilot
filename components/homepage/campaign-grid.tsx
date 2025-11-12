"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Tables } from '@/lib/supabase/database.types'

type Campaign = Tables<'campaigns'> & {
  campaign_states?: Tables<'campaign_states'>
}

export function CampaignGrid() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        // Fetch 7 campaigns to check if there are more than 6
        const response = await fetch('/api/campaigns?limit=7')
        if (response.ok) {
          const { campaigns: data } = await response.json()
          const campaignList = data || []
          // Show only first 6, but check if there are more
          setHasMore(campaignList.length > 6)
          setCampaigns(campaignList.slice(0, 6))
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getThumbnail = (campaign: Campaign) => {
    // Images are stored in campaign_states.ad_preview_data
    const adPreviewData = campaign.campaign_states?.ad_preview_data as unknown as { adContent?: { baseImageUrl?: string; imageVariations?: string[] } } | null
    if (adPreviewData?.adContent?.baseImageUrl) {
      return adPreviewData.adContent.baseImageUrl
    }
    if (adPreviewData?.adContent?.imageVariations && adPreviewData.adContent.imageVariations.length > 0) {
      return adPreviewData.adContent.imageVariations[0]
    }
    return '/placeholder.svg'
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
              className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              View all →
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              onClick={() => router.push(`/${campaign.id}`)}
              className="group cursor-pointer bg-card rounded-xl overflow-hidden border border-border hover:border-blue-500 transition-all hover:shadow-xl"
            >
              <div className="relative aspect-video bg-muted">
                <img
                  src={getThumbnail(campaign)}
                  alt={campaign.name}
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
          ))}
        </div>
      </div>
    </section>
  )
}

