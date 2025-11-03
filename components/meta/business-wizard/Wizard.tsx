"use client"

/**
 * Feature: Meta Business Setup Wizard (client)
 * Purpose: Guide user through selecting Business → Page(s) → Ad Account and save
 * References:
 *  - Business owned assets: https://developers.facebook.com/docs/marketing-api/businessmanager/asset-management
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBusinessBillingUrl, getAdAccountBillingUrl } from '@/lib/meta/payment-urls'

type Biz = { id: string; name?: string }
type Page = { id: string; name?: string }
type AdAccount = { id: string; name?: string; currency?: string }

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Request failed')
  return res.json() as Promise<T>
}

export default function BusinessWizard() {
  const [businesses, setBusinesses] = useState<Biz[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [bizId, setBizId] = useState<string | null>(null)
  const [pageId, setPageId] = useState<string | null>(null)
  const [adAccountId, setAdAccountId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const data = await getJSON<{ data: Biz[] }>(`/api/meta/businesses`)
        setBusinesses(data.data || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!bizId) return
    ;(async () => {
      const data = await getJSON<{ data: Page[] }>(`/api/meta/pages?businessId=${encodeURIComponent(bizId)}`)
      setPages(data.data || [])
      const aa = await getJSON<{ data: AdAccount[] }>(`/api/meta/ad-accounts?businessId=${encodeURIComponent(bizId)}`)
      setAdAccounts(aa.data || [])
    })()
  }, [bizId])

  const selectedAdAccount = useMemo(
    () => adAccounts.find(a => a.id === adAccountId) || null,
    [adAccounts, adAccountId]
  )

  async function onSave() {
    if (!bizId) return
    setSaving(true)
    try {
      const payload = {
        businessId: bizId,
        businessName: businesses.find(b => b.id === bizId)?.name,
        pageId: pageId ?? undefined,
        pageName: pages.find(p => p.id === pageId || '')?.name,
        adAccountId: adAccountId ?? undefined,
        adAccountName: adAccounts.find(a => a.id === adAccountId || '')?.name,
        currency: selectedAdAccount?.currency,
      }
      const res = await fetch('/api/meta/business-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 font-medium">Step 1: Select Business</div>
        <Select onValueChange={(v) => { setBizId(v); setPageId(null); setAdAccountId(null) }} value={bizId ?? undefined}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? 'Loading businesses…' : 'Choose a Business'} />
          </SelectTrigger>
          <SelectContent>
            {businesses.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name || b.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!businesses.length && !loading && (
          <p className="text-sm text-muted-foreground mt-2">
            No Business found. You can create one at business.facebook.com/create
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 font-medium">Step 2: Select Page (optional)</div>
        <Select onValueChange={(v) => setPageId(v)} value={pageId ?? undefined} disabled={!bizId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={!bizId ? 'Select a Business first' : (pages.length ? 'Choose a Page' : 'No owned Pages')} />
          </SelectTrigger>
          <SelectContent>
            {pages.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name || p.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="mb-2 font-medium">Step 3: Select Ad Account</div>
        <Select onValueChange={(v) => setAdAccountId(v)} value={adAccountId ?? undefined} disabled={!bizId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={!bizId ? 'Select a Business first' : (adAccounts.length ? 'Choose an Ad Account' : 'No owned Ad Accounts')} />
          </SelectTrigger>
          <SelectContent>
            {adAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name || a.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button disabled={!bizId || !adAccountId || saving} onClick={onSave}>
          {saving ? 'Saving…' : (saved ? 'Saved' : 'Save selection')}
        </Button>
        {bizId && (
          <a
            className="text-sm underline text-blue-600"
            href={getBusinessBillingUrl(bizId)}
            target="_blank"
            rel="noreferrer"
          >
            Open Business Billing
          </a>
        )}
        {adAccountId && (
          <a
            className="text-sm underline text-blue-600"
            href={getAdAccountBillingUrl(adAccountId)}
            target="_blank"
            rel="noreferrer"
          >
            Open Ad Account Billing
          </a>
        )}
      </div>
    </div>
  )
}


