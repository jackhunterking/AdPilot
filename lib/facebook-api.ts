// Facebook Marketing API integration
// This module handles all interactions with the Facebook Marketing API

const FACEBOOK_API_VERSION = "v21.0"
const FACEBOOK_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`

export interface FacebookCampaignParams {
  name: string
  objective: "LEAD_GENERATION" | "LINK_CLICKS" | "CONVERSIONS"
  status: "ACTIVE" | "PAUSED"
  dailyBudget?: number
  lifetimeBudget?: number
  startTime?: string
  endTime?: string
}

export interface FacebookAdSetParams {
  campaignId: string
  name: string
  targeting: {
    geoLocations?: {
      countries?: string[]
      regions?: string[]
      cities?: string[]
    }
    ageMin?: number
    ageMax?: number
    interests?: Array<{ id: string; name: string }>
    behaviors?: Array<{ id: string; name: string }>
  }
  billingEvent: "IMPRESSIONS" | "LINK_CLICKS"
  optimizationGoal: "LEAD_GENERATION" | "LINK_CLICKS" | "CONVERSIONS"
  bidAmount?: number
  dailyBudget?: number
}

export interface FacebookAdCreativeParams {
  name: string
  objectStorySpec: {
    pageId: string
    linkData: {
      link: string
      message: string
      name: string
      description?: string
      callToAction?: {
        type: string
        value: {
          link: string
        }
      }
      imageHash?: string
      videoId?: string
    }
  }
}

export interface FacebookAdParams {
  adSetId: string
  name: string
  creativeId: string
  status: "ACTIVE" | "PAUSED"
}

class FacebookAPI {
  private accessToken: string
  private adAccountId: string

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken
    this.adAccountId = adAccountId
  }

  private async makeRequest(endpoint: string, method: "GET" | "POST" | "DELETE" = "GET", body?: any) {
    const url = `${FACEBOOK_API_BASE_URL}${endpoint}`
    const params = new URLSearchParams({
      access_token: this.accessToken,
    })

    if (method === "GET" && body) {
      Object.keys(body).forEach((key) => {
        params.append(key, body[key])
      })
    }

    const response = await fetch(method === "GET" ? `${url}?${params}` : url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: method !== "GET" ? JSON.stringify({ ...body, access_token: this.accessToken }) : undefined,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Facebook API Error: ${error.error?.message || "Unknown error"}`)
    }

    return response.json()
  }

  // Campaign Management
  async createCampaign(params: FacebookCampaignParams) {
    return this.makeRequest(`/act_${this.adAccountId}/campaigns`, "POST", {
      name: params.name,
      objective: params.objective,
      status: params.status,
      daily_budget: params.dailyBudget,
      lifetime_budget: params.lifetimeBudget,
      start_time: params.startTime,
      end_time: params.endTime,
    })
  }

  async updateCampaignStatus(campaignId: string, status: "ACTIVE" | "PAUSED") {
    return this.makeRequest(`/${campaignId}`, "POST", { status })
  }

  async getCampaign(campaignId: string) {
    return this.makeRequest(`/${campaignId}`, "GET", {
      fields: "id,name,objective,status,daily_budget,lifetime_budget",
    })
  }

  // Ad Set Management
  async createAdSet(params: FacebookAdSetParams) {
    return this.makeRequest(`/act_${this.adAccountId}/adsets`, "POST", {
      campaign_id: params.campaignId,
      name: params.name,
      targeting: params.targeting,
      billing_event: params.billingEvent,
      optimization_goal: params.optimizationGoal,
      bid_amount: params.bidAmount,
      daily_budget: params.dailyBudget,
      status: "ACTIVE",
    })
  }

  // Ad Creative Management
  async createAdCreative(params: FacebookAdCreativeParams) {
    return this.makeRequest(`/act_${this.adAccountId}/adcreatives`, "POST", {
      name: params.name,
      object_story_spec: params.objectStorySpec,
    })
  }

  // Ad Management
  async createAd(params: FacebookAdParams) {
    return this.makeRequest(`/act_${this.adAccountId}/ads`, "POST", {
      adset_id: params.adSetId,
      name: params.name,
      creative: { creative_id: params.creativeId },
      status: params.status,
    })
  }

  async updateAdStatus(adId: string, status: "ACTIVE" | "PAUSED") {
    return this.makeRequest(`/${adId}`, "POST", { status })
  }

  // Metrics & Insights
  async getAdInsights(adId: string, datePreset = "lifetime") {
    return this.makeRequest(`/${adId}/insights`, "GET", {
      date_preset: datePreset,
      fields: "impressions,clicks,ctr,cpm,spend,cost_per_action_type,actions,conversions",
    })
  }

  async getCampaignInsights(campaignId: string, datePreset = "lifetime") {
    return this.makeRequest(`/${campaignId}/insights`, "GET", {
      date_preset: datePreset,
      fields: "impressions,clicks,ctr,cpm,spend,cost_per_action_type,actions,conversions",
    })
  }

  // Lead Forms (for lead generation campaigns)
  async getLeadForms(pageId: string) {
    return this.makeRequest(`/${pageId}/leadgen_forms`, "GET", {
      fields: "id,name,status,leads_count,questions",
    })
  }

  async getLeads(formId: string) {
    return this.makeRequest(`/${formId}/leads`, "GET", {
      fields: "id,created_time,field_data",
    })
  }
}

export default FacebookAPI
