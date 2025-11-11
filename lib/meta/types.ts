/**
 * Feature: Meta connectivity types
 * Purpose: Strongly-typed DTOs for tokens, assets, and DB payloads
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API: https://developers.facebook.com/docs/graph-api
 */

export interface MetaTokens {
  shortToken: string
  longToken: string
}

export interface MetaBusiness {
  id: string
  name?: string
}

export interface MetaPage {
  id: string
  name?: string
  access_token?: string
  instagram_business_account?: { id?: string; username?: string }
}

export interface MetaAdAccount {
  id: string
  name?: string
  account_status?: number
  business?: { id: string; name?: string }
  currency?: string | null
}

export interface MetaAssets {
  business?: MetaBusiness | null
  page?: MetaPage | null
  instagram?: { id: string; username?: string } | null
  adAccount?: MetaAdAccount | null
}

export interface CampaignMetaConnectionPayload {
  campaign_id: string
  user_id: string
  fb_user_id: string | null
  long_lived_user_token: string
  token_expires_at: string
  selected_business_id: string | null
  selected_business_name: string | null
  selected_page_id: string | null
  selected_page_name: string | null
  selected_page_access_token: string | null
  selected_ig_user_id: string | null
  selected_ig_username: string | null
  selected_ad_account_id: string | null
  selected_ad_account_name: string | null
  ad_account_currency_code?: string | null
  ad_account_payment_connected: boolean
  admin_connected: boolean
  user_app_connected: boolean
}

export interface SelectionSummaryDTO {
  business?: { id: string; name?: string }
  page?: { id: string; name?: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name?: string; currency?: string }
  paymentConnected: boolean
  adminConnected: boolean
  adminBusinessRole: string | null
  adminAdAccountRole: string | null
  userAppConnected: boolean
  status: string
}


