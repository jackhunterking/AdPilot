"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import FacebookAPI from "@/lib/facebook-api"

// Initialize Supabase client
async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}

// Initialize Facebook API client
function getFacebookAPI() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID

  if (!accessToken || !adAccountId) {
    throw new Error("Facebook API credentials not configured")
  }

  return new FacebookAPI(accessToken, adAccountId)
}

export async function createCampaign(data: {
  name: string
  goal: "leads" | "website_visits" | "calls"
  budget: number
  dailyBudget?: number
  startDate: string
  endDate?: string
  targetLocation?: any
  audience?: any
  adCopy: {
    headline: string
    description: string
    cta: string
  }
  creativeUrl: string
  creativeType: "image" | "video" | "carousel"
}) {
  try {
    const supabase = await getSupabase()
    const facebookAPI = getFacebookAPI()

    // Map goal to Facebook objective
    const objectiveMap = {
      leads: "LEAD_GENERATION" as const,
      website_visits: "LINK_CLICKS" as const,
      calls: "CONVERSIONS" as const,
    }

    // Create Facebook campaign
    const fbCampaign = await facebookAPI.createCampaign({
      name: data.name,
      objective: objectiveMap[data.goal],
      status: "ACTIVE",
      dailyBudget: data.dailyBudget ? data.dailyBudget * 100 : undefined, // Convert to cents
      lifetimeBudget: data.budget * 100, // Convert to cents
      startTime: data.startDate,
      endTime: data.endDate,
    })

    // Save campaign to database
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        name: data.name,
        goal: data.goal,
        budget: data.budget,
        daily_budget: data.dailyBudget,
        status: "active",
        start_date: data.startDate,
        end_date: data.endDate,
        facebook_campaign_id: fbCampaign.id,
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // Create ad variant
    const { data: variant, error: variantError } = await supabase
      .from("ad_variants")
      .insert({
        campaign_id: campaign.id,
        variant_name: "Original",
        variant_type: "original",
        target_location: data.targetLocation,
        audience: data.audience,
        ad_copy: data.adCopy,
        creative_url: data.creativeUrl,
        creative_type: data.creativeType,
        status: "active",
      })
      .select()
      .single()

    if (variantError) throw variantError

    return { success: true, campaign, variant }
  } catch (error) {
    console.error("[v0] Error creating campaign:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function createABTest(data: {
  parentVariantId: string
  testVariable: "location" | "audience" | "ad_copy" | "creative"
  variantData: any
}) {
  try {
    const supabase = await getSupabase()

    // Get parent variant
    const { data: parentVariant, error: parentError } = await supabase
      .from("ad_variants")
      .select("*, campaigns(*)")
      .eq("id", data.parentVariantId)
      .single()

    if (parentError) throw parentError

    // Create new variant with modified parameter
    const newVariantData: any = {
      campaign_id: parentVariant.campaign_id,
      variant_name: `Variant ${data.testVariable}`,
      variant_type: "test",
      parent_variant_id: data.parentVariantId,
      test_variable: data.testVariable,
      target_location: parentVariant.target_location,
      audience: parentVariant.audience,
      ad_copy: parentVariant.ad_copy,
      creative_url: parentVariant.creative_url,
      creative_type: parentVariant.creative_type,
      status: "active",
    }

    // Apply test variable changes
    if (data.testVariable === "location") {
      newVariantData.target_location = data.variantData
    } else if (data.testVariable === "audience") {
      newVariantData.audience = data.variantData
    } else if (data.testVariable === "ad_copy") {
      newVariantData.ad_copy = data.variantData
    } else if (data.testVariable === "creative") {
      newVariantData.creative_url = data.variantData.creativeUrl
      newVariantData.creative_type = data.variantData.creativeType
    }

    const { data: variant, error: variantError } = await supabase
      .from("ad_variants")
      .insert(newVariantData)
      .select()
      .single()

    if (variantError) throw variantError

    // TODO: Create corresponding Facebook ad set and ad

    return { success: true, variant }
  } catch (error) {
    console.error("[v0] Error creating A/B test:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function toggleCampaignStatus(variantId: string) {
  try {
    const supabase = await getSupabase()
    const facebookAPI = getFacebookAPI()

    // Get variant
    const { data: variant, error: variantError } = await supabase
      .from("ad_variants")
      .select("*")
      .eq("id", variantId)
      .single()

    if (variantError) throw variantError

    const newStatus = variant.status === "active" ? "paused" : "active"

    // Update Facebook ad status
    if (variant.facebook_ad_id) {
      await facebookAPI.updateAdStatus(variant.facebook_ad_id, newStatus === "active" ? "ACTIVE" : "PAUSED")
    }

    // Update database
    const { error: updateError } = await supabase.from("ad_variants").update({ status: newStatus }).eq("id", variantId)

    if (updateError) throw updateError

    return { success: true, status: newStatus }
  } catch (error) {
    console.error("[v0] Error toggling campaign status:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function fetchCampaignMetrics(variantId: string) {
  try {
    const supabase = await getSupabase()
    const facebookAPI = getFacebookAPI()

    // Get variant
    const { data: variant, error: variantError } = await supabase
      .from("ad_variants")
      .select("*")
      .eq("id", variantId)
      .single()

    if (variantError) throw variantError

    if (!variant.facebook_ad_id) {
      throw new Error("No Facebook ad ID found")
    }

    // Fetch insights from Facebook
    const insights = await facebookAPI.getAdInsights(variant.facebook_ad_id)

    if (insights.data && insights.data.length > 0) {
      const data = insights.data[0]

      // Extract metrics
      const metrics = {
        impressions: Number.parseInt(data.impressions || "0"),
        clicks: Number.parseInt(data.clicks || "0"),
        ctr: Number.parseFloat(data.ctr || "0"),
        cpm: Number.parseFloat(data.cpm || "0"),
        amount_spent: Number.parseFloat(data.spend || "0"),
        cost_per_result: 0,
        leads: 0,
        website_visits: 0,
        calls: 0,
      }

      // Extract goal-specific results
      if (data.actions) {
        const leadAction = data.actions.find((a: any) => a.action_type === "lead")
        const linkClickAction = data.actions.find((a: any) => a.action_type === "link_click")
        const callAction = data.actions.find((a: any) => a.action_type === "call_confirm")

        metrics.leads = leadAction ? Number.parseInt(leadAction.value) : 0
        metrics.website_visits = linkClickAction ? Number.parseInt(linkClickAction.value) : 0
        metrics.calls = callAction ? Number.parseInt(callAction.value) : 0
      }

      // Calculate cost per result
      const totalResults = metrics.leads + metrics.website_visits + metrics.calls
      metrics.cost_per_result = totalResults > 0 ? metrics.amount_spent / totalResults : 0

      // Save metrics to database
      await supabase.from("metrics").insert({
        ad_variant_id: variantId,
        ...metrics,
      })

      return { success: true, metrics }
    }

    return { success: false, error: "No insights data available" }
  } catch (error) {
    console.error("[v0] Error fetching campaign metrics:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function getCampaigns() {
  try {
    const supabase = await getSupabase()

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select(
        `
        *,
        ad_variants (
          *,
          metrics (*)
        )
      `,
      )
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, campaigns }
  } catch (error) {
    console.error("[v0] Error fetching campaigns:", error)
    return { success: false, error: (error as Error).message }
  }
}
