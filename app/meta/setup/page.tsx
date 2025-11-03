/**
 * Feature: Meta Business Setup Wizard (entry)
 * Purpose: Always-show wizard to select Business → Page(s) → Ad Account
 * References:
 *  - Business Manager assets: https://developers.facebook.com/docs/marketing-api/businessmanager/asset-management
 */

import dynamic from 'next/dynamic'

const BusinessWizard = dynamic(() => import('@/components/meta/business-wizard/Wizard'), { ssr: false })

export default function MetaSetupPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Connect your Meta Business</h1>
      <BusinessWizard />
    </div>
  )
}


