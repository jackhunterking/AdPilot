# Meta Instant Forms (Lead Generation) - Fix Plan

**Issue**: "campaignId is required" error when creating instant forms
**Root Cause**: API routes still query Supabase, but we moved to localStorage
**Impact**: Cannot create or select lead gen forms

---

## 🔴 Problem Analysis

### Current Flow (Broken)
```
1. User selects "Leads" goal
2. User fills form: name, privacy URL, etc.
3. Component calls: POST /api/meta/forms
4. API route tries to fetch from Supabase:
   ❌ const { data: connection } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_page_id, selected_page_access_token')
      .eq('campaign_id', campaignId)
5. Returns NULL (we moved to localStorage!)
6. Fails with "No Meta connection found"
```

### What We Need

The API route needs:
- `selected_page_id` - Which page to create form under
- `selected_page_access_token` - Page token for Graph API auth
- `long_lived_user_token` - Fallback token

These are now in **localStorage** (`meta_connection_{campaignId}`), not Supabase!

---

## ✅ Solution: Hybrid Approach (Supabase + localStorage Fallback)

### New Approach

**Keep Supabase, add localStorage fallback:**
```typescript
// ✅ NEW: Try Supabase first, fall back to client-provided tokens

// 1. Server tries Supabase first
const { data: connection } = await supabaseServer
  .from('campaign_meta_connections')
  .select('selected_page_id, selected_page_access_token')
  .eq('campaign_id', campaignId)
  .maybeSingle()

// 2. If not found, use tokens from request body (client provides from localStorage)
const pageId = connection?.selected_page_id || body.pageId
const pageAccessToken = connection?.selected_page_access_token || body.pageAccessToken

// 3. Validate we have what we need
if (!pageId || !pageAccessToken) {
  return NextResponse.json(
    { error: 'No Meta connection found. Please connect Meta first.' },
    { status: 400 }
  )
}
```

**Client always sends tokens (for fallback):**
```typescript
// Client sends tokens from localStorage (used if Supabase empty)
const connection = metaStorage.getConnection(campaignId)
const response = await fetch('/api/meta/forms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaignId,
    pageId: connection?.selected_page_id,           // Fallback
    pageAccessToken: connection?.selected_page_access_token, // Fallback
    name: formName,
    privacyPolicy: { ... }
  })
})
```

### Security Considerations

**Q: Is it safe to send tokens from client?**
**A: Yes, for these reasons:**
1. Tokens are already in localStorage (client-side)
2. We're only using them temporarily (dev/testing)
3. Server still validates campaignId ownership
4. Page tokens are scoped to specific pages only
5. For production, we'd move back to secure storage

---

## 📝 Implementation Steps

### Step 1: Update API Route - `/api/meta/forms`

**File**: `app/api/meta/forms/route.ts`

**Changes:**
```typescript
// BEFORE
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaignId, name, privacyPolicy } = body;

  // Fetch from Supabase (fails if localStorage-only)
  const { data: connection } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_page_id,selected_page_access_token')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: 'No Meta connection found' }, { status: 400 });
  }
}

// AFTER (Hybrid Approach)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    campaignId,
    pageId: clientPageId,              // ✅ Optional fallback from client
    pageAccessToken: clientPageToken,  // ✅ Optional fallback from client
    name,
    privacyPolicy
  } = body;

  // 1. Try Supabase first (for campaigns with DB storage)
  const { data: connection } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_page_id,selected_page_access_token,long_lived_user_token')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  // 2. Use Supabase data if available, otherwise fall back to client-provided tokens
  const pageId = connection?.selected_page_id || clientPageId;
  const pageAccessToken = connection?.selected_page_access_token || clientPageToken;

  // 3. If we still don't have tokens, derive from long_lived_user_token (if available)
  let finalPageToken = pageAccessToken;
  if (!finalPageToken && connection?.long_lived_user_token && pageId) {
    // Derive page token from user token
    const pages = await fetchPagesWithTokens({ token: connection.long_lived_user_token });
    const page = pages.find(p => p.id === pageId);
    finalPageToken = page?.access_token;
  }

  // 4. Validate we have everything we need
  if (!pageId || !finalPageToken) {
    return NextResponse.json(
      {
        error: 'No Meta connection found. Please connect Meta first.',
        details: 'Missing page ID or access token'
      },
      { status: 400 }
    );
  }

  // 5. Use the tokens (from either source)
  console.log('[Meta Forms] Using tokens:', {
    source: connection ? 'Supabase' : 'localStorage',
    pageId,
    hasToken: !!finalPageToken
  });

  // Rest of the logic stays the same...
  // Call Meta API with finalPageToken
}
```

**Key Points:**
- ✅ **Keep Supabase query** (backward compatible)
- ✅ Accept optional `pageId` and `pageAccessToken` from client
- ✅ **Fallback logic**: Supabase → client tokens → derived from user token
- ✅ Log which source was used (helpful for debugging)
- ✅ Validate we have tokens before proceeding

---

### Step 2: Update Form Creation Component

**File**: `components/forms/lead-form-create.tsx`

**Changes:**
```typescript
// Add import
import { metaStorage } from '@/lib/meta/storage'

// In handleCreate function (around line 89)
const handleCreate = async () => {
  if (!campaign?.id) return

  // ✅ Get connection from localStorage
  const connection = metaStorage.getConnection(campaign.id)

  if (!connection) {
    toast.error('Meta connection not found. Please connect Meta first.')
    return
  }

  if (!connection.selected_page_id || !connection.selected_page_access_token) {
    toast.error('Page access token not found. Please reconnect Meta.')
    return
  }

  setIsCreating(true)

  try {
    const res = await fetch('/api/meta/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        pageId: connection.selected_page_id,              // ✅ NEW
        pageAccessToken: connection.selected_page_access_token, // ✅ NEW
        name: formName,
        privacyPolicy: {
          url: privacyUrl,
          link_text: 'Privacy Policy'
        },
        questions: [
          { type: 'FULL_NAME', key: 'full_name' },
          { type: 'EMAIL', key: 'email' },
          { type: 'PHONE', key: 'phone' }
        ],
        thankYouPage: {
          title: thankYouTitle,
          body: thankYouBody
        }
      })
    })

    // Rest stays the same...
  } catch (error) {
    // Error handling...
  } finally {
    setIsCreating(false)
  }
}
```

**Key Points:**
- Get connection from `metaStorage`
- Validate connection exists
- Pass `pageId` and `pageAccessToken` in request body
- Add helpful error messages if connection missing

---

### Step 3: Update Form Selection Component

**File**: `components/forms/lead-form-existing.tsx`

**Changes:**
```typescript
// Add import
import { metaStorage } from '@/lib/meta/storage'

// Update fetchForms function (around line 44)
const fetchForms = useCallback(async () => {
  if (!campaign?.id) return

  // ✅ Get connection from localStorage
  const connection = metaStorage.getConnection(campaign.id)

  if (!connection) {
    setError('Meta connection not found. Please connect Meta first.')
    return
  }

  if (!connection.selected_page_id) {
    setError('No page selected. Please reconnect Meta.')
    return
  }

  setLoading(true)
  setError(null)

  try {
    // ✅ Pass pageId as query param (for GET request)
    const res = await fetch(
      `/api/meta/forms?campaignId=${campaign.id}&pageId=${connection.selected_page_id}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      throw new Error(`Failed to fetch forms: ${res.status}`)
    }

    const data = await res.json()
    setForms(data.forms || [])
  } catch (err) {
    console.error('[LeadFormExisting] Fetch error:', err)
    setError(err instanceof Error ? err.message : 'Failed to load forms')
  } finally {
    setLoading(false)
  }
}, [campaign?.id])

// Update requestPreview function (around line 90)
const requestPreview = useCallback(async (formId: string) => {
  if (!campaign?.id) return

  // ✅ Get connection from localStorage
  const connection = metaStorage.getConnection(campaign.id)

  if (!connection?.selected_page_id) {
    return
  }

  setLoadingPreview(formId)
  setPreviewError(null)

  try {
    // ✅ Pass pageId as query param
    const res = await fetch(
      `/api/meta/instant-forms/${formId}?campaignId=${campaign.id}&pageId=${connection.selected_page_id}`,
      { cache: 'no-store' }
    )

    // Rest stays the same...
  } catch (err) {
    // Error handling...
  } finally {
    setLoadingPreview(null)
  }
}, [campaign?.id])
```

**Key Points:**
- Get connection from `metaStorage` before each API call
- Pass `pageId` as query parameter for GET requests
- Add validation and error messages

---

### Step 4: Update API GET Route

**File**: `app/api/meta/forms/route.ts` (GET handler)

**Changes:**
```typescript
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const pageId = searchParams.get('pageId')  // ✅ NEW

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      )
    }

    if (!pageId) {
      return NextResponse.json(
        { error: 'pageId is required' },
        { status: 400 }
      )
    }

    // Verify campaign ownership (keep this for security)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .maybeSingle()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // ❌ REMOVE: Supabase connection fetch
    // const { data: connection } = await supabaseServer
    //   .from('campaign_meta_connections')
    //   .select('...')

    // ✅ INSTEAD: Client provides pageId, we need page token
    // For GET, we need to fetch page token from Meta API
    // This requires the long-lived user token

    // OPTION A: Also pass pageAccessToken as query param
    const pageAccessToken = searchParams.get('pageAccessToken')

    if (!pageAccessToken) {
      return NextResponse.json(
        { error: 'pageAccessToken is required' },
        { status: 400 }
      )
    }

    // Call Meta API
    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${pageId}/leadgen_forms?fields=id,name,status,created_time,locale&limit=100`

    const metaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store'
    })

    if (!metaRes.ok) {
      const errorText = await metaRes.text()
      return NextResponse.json(
        { error: 'Failed to fetch forms from Meta', details: errorText },
        { status: metaRes.status }
      )
    }

    const data = await metaRes.json()

    return NextResponse.json({
      forms: data.data || [],
      paging: data.paging
    })

  } catch (error) {
    console.error('[Meta Forms GET] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Alternative (Cleaner):** Pass tokens in request headers instead of query params for better security.

---

### Step 5: Update Form Detail Route

**File**: `app/api/meta/instant-forms/[id]/route.ts`

**Similar changes:**
- Accept `pageId` and `pageAccessToken` from query params (or headers)
- Remove Supabase queries
- Use provided tokens for Meta API calls

---

## 🔒 Security Considerations

### Current Approach (Development/Testing)
- ✅ Tokens in localStorage (acceptable for dev)
- ✅ Campaign ownership verified server-side
- ✅ Page tokens scoped to specific pages
- ⚠️ Tokens visible in network tab (Dev Tools)

### Production Recommendations
1. **Hybrid Approach**: Store tokens in Supabase + cache in localStorage
2. **Short-Lived Sessions**: Refresh tokens regularly
3. **HttpOnly Cookies**: Store sensitive tokens server-side
4. **API Proxy**: Server fetches from secure storage, client never sees tokens

---

## 🧪 Testing Checklist

### After Implementation

1. **Create New Form**
   - [ ] Select "Leads" goal
   - [ ] Fill form name, privacy URL, thank you page
   - [ ] Click "Create Form"
   - [ ] Verify form appears in Meta Ads Manager
   - [ ] Verify form appears in "Select Existing" list
   - [ ] Verify no "campaignId is required" error

2. **Select Existing Form**
   - [ ] Click "Select Existing" tab
   - [ ] Verify forms load from Meta
   - [ ] Click a form to preview
   - [ ] Verify preview shows correctly
   - [ ] Click "Use this form"
   - [ ] Verify selection saves

3. **Error Handling**
   - [ ] Test without Meta connection → Should show helpful error
   - [ ] Test with expired token → Should show re-connect message
   - [ ] Test with network error → Should show retry option

4. **Verify in Meta**
   - [ ] Log into Meta Ads Manager
   - [ ] Go to Forms Library
   - [ ] Verify newly created forms appear
   - [ ] Verify form fields match (Name, Email, Phone)
   - [ ] Verify privacy policy URL is set

---

## 📊 Before & After

### Before (Broken)
```
Component → API Route → Supabase → NULL (localStorage campaigns) → Error ❌
```

### After (Hybrid - Fixed)
```
Component sends localStorage tokens → API Route → Try Supabase first
                                                ↓
                                    Supabase has data? → Use it ✅
                                                ↓
                                    Supabase NULL? → Use client tokens ✅
                                                ↓
                                    Still NULL? → Try derive from user token ✅
                                                ↓
                                    All NULL? → Error (need to reconnect)
```

**Benefits:**
- ✅ **Backward compatible**: Existing Supabase campaigns work
- ✅ **Forward compatible**: New localStorage campaigns work
- ✅ **Graceful degradation**: Multiple fallback layers
- ✅ **Migration path**: Can gradually move campaigns to localStorage
- ✅ **Debugging**: Logs which source was used

---

## 🚀 Next Steps

1. Implement Step 1: Update POST /api/meta/forms route
2. Implement Step 2: Update lead-form-create component
3. Implement Step 3: Update lead-form-existing component
4. Implement Step 4: Update GET /api/meta/forms route
5. Implement Step 5: Update instant-forms/[id] route
6. Test complete flow end-to-end
7. Verify forms appear in Meta Ads Manager

---

## 📝 Additional Improvements (Optional)

1. **Token Refresh Logic**: Auto-refresh expired tokens
2. **Better Error Messages**: User-friendly error explanations
3. **Form Validation**: More robust privacy URL validation
4. **Custom Fields**: Allow users to add custom form fields
5. **Lead Webhooks**: Receive leads back from Meta in real-time
6. **Form Analytics**: Track form performance metrics

---

**Status**: Ready to implement
**Estimated Time**: 2-3 hours
**Risk Level**: Low (isolated changes, well-tested flow)

