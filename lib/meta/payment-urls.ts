/**
 * Feature: Payment deep-link helpers (client-safe)
 * Purpose: Generate URLs for Business Billing and Ad Account Billing pages
 */

export function getBusinessBillingUrl(businessId: string): string {
  return `https://business.facebook.com/settings/payment-methods?business_id=${encodeURIComponent(businessId)}`
}

export function getAdAccountBillingUrl(adAccountId: string): string {
  const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  return `https://www.facebook.com/ads/manager/account_settings/account_billing/?act=${encodeURIComponent(id)}`
}


