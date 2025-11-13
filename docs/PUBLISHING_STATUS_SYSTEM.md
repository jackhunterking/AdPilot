# Ad Publishing Status System - Implementation Guide

## Overview

This document describes the comprehensive ad publishing status system implemented for AdPilot. The system provides real-time status tracking, error handling, and user feedback for ads published to Meta's Marketing API.

## Architecture

### Database Schema

#### Tables Created

1. **`ad_publishing_metadata`** - Tracks detailed publishing metadata
   - `ad_id` - Foreign key to ads table
   - `meta_ad_id` - Meta's ad ID after creation
   - `current_status` - Current ad status
   - `error_code`, `error_message` - Error tracking
   - `retry_count` - Number of retry attempts
   - `meta_review_feedback` - Feedback from Meta review
   - `status_history` - JSONB array of status transitions

2. **`meta_webhook_events`** - Logs webhook events from Meta
   - `event_type` - Type of webhook event
   - `payload` - Full webhook payload
   - `processed` - Whether event was processed

3. **`ad_status_transitions`** - Audit log of status changes
   - `from_status`, `to_status` - Status transition
   - `triggered_by` - Source of change (user, webhook, system)

#### Columns Added to `ads` Table

- `publishing_status` - Enhanced status enum
- `meta_ad_id` - Link to Meta ad ID
- `last_error` - JSONB error details
- `published_at`, `approved_at`, `rejected_at` - Timestamps

### Ad Status Types

The system uses the following status values:

- **`draft`** - Ad is being built, not yet published
- **`pending_review`** - Submitted to Meta, awaiting approval
- **`active`** - Approved and running
- **`learning`** - Active but in learning phase
- **`paused`** - Temporarily stopped
- **`rejected`** - Rejected by Meta, needs changes
- **`failed`** - Publishing failed due to error
- **`archived`** - Historical/inactive

## Publishing Flow

### 1. User Clicks "Publish"

```
User → PublishButton → usePublishAd hook → /api/campaigns/[id]/ads/[id]/publish
```

### 2. API Endpoint Process

1. Validates user authentication and ad ownership
2. Updates status to `pending_review` immediately
3. Calls `publishSingleAd()` from publisher
4. Handles success/failure responses
5. Updates database with result

### 3. Publisher Process (`lib/meta/publisher-single-ad.ts`)

1. Loads ad and campaign data
2. Validates Meta connection
3. Uploads image to Meta
4. Creates ad creative
5. Creates/reuses Meta campaign and adset
6. Creates Meta ad (status: PAUSED)
7. Returns Meta ad ID and status

### 4. Status Sync

**Option A: Real-time via Supabase** (Implemented)
- Client subscribes to table changes
- Instant updates across all tabs
- Uses `useAdStatusSubscription` hook

**Option B: Polling** (Available)
- `/api/campaigns/[id]/ads/[id]/status` endpoint
- Fetches current status from Meta API
- Can be called manually or on interval

**Option C: Webhooks** (To be configured)
- Receive events from Meta
- Process via `/api/webhooks/meta`
- Most reliable for production

## UI Components

### Status Badge (`AdStatusBadge`)

Displays current status with color coding:
- Draft: Gray
- Pending Review: Yellow (animated pulse)
- Active: Green
- Failed: Red
- Rejected: Orange
- Paused: Orange
- Learning: Blue

### Publish Button (`PublishButton`)

Dynamic button that adapts to status:
- Draft → "Publish" (primary)
- Pending Review → "Reviewing..." (disabled, loading)
- Active → "Pause"
- Paused → "Resume"
- Failed → "Retry" (destructive)
- Rejected → "Fix & Republish"

### Error Display

**Error Tooltip** (`ErrorTooltip`)
- Small info icon next to failed/rejected status
- Hover shows error summary
- Click opens full error modal

**Error Modal** (`PublishErrorModal`)
- Full error details
- Technical information (collapsible)
- Suggested actions
- Help links
- Retry/Edit buttons

## Error Handling

### Error Classification (`lib/meta/errors/error-classifier.ts`)

Errors are classified into categories:
- **validation** - Missing/invalid fields
- **authentication** - Token expired
- **authorization** - Permission issues
- **rate_limit** - API rate limiting
- **server** - Meta API errors
- **business_logic** - Policy violations, payment issues

### Error Messages (`lib/meta/errors/error-messages.ts`)

User-friendly messages with:
- Clear explanation
- Suggested action
- Help article link (where applicable)

### Retry Logic

- Automatic retry for rate limit/server errors (up to 3 attempts)
- Exponential backoff (1s, 2s, 4s, ...)
- Manual retry button for user-initiated attempts
- No auto-retry for validation/policy errors

## Hooks

### `usePublishAd`

Manages ad publishing with loading states and error handling.

```typescript
const { publishAd, isPublishing, error } = usePublishAd()

await publishAd(campaignId, adId)
```

### `useAdStatusSubscription`

Subscribes to real-time status updates.

```typescript
const { currentStatus, metadata, isSubscribed } = useAdStatusSubscription({
  adId,
  onStatusChange: (newStatus) => {
    // Handle status change
  }
})
```

## Integration Points

### Campaign Workspace

The workspace integrates the publishing system:
1. Ad cards show current status and errors
2. Publish button adapts to status
3. Real-time updates refresh UI
4. Toast notifications inform user

### All Ads Grid

- Filters by status
- Status badges on each card
- Error tooltips where applicable
- Batch operations support

## Configuration

### Environment Variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Meta Webhooks (optional, for production)
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

### Database Migration

Run the migration to set up tables:

```bash
# Apply migration
psql -d your_database -f supabase/migrations/20250114_add_publishing_status_system.sql
```

### Supabase Realtime

Enable realtime for required tables in Supabase dashboard:
1. Go to Database → Replication
2. Enable for: `ads`, `ad_publishing_metadata`, `ad_status_transitions`

## Webhooks (Optional Setup)

### 1. Configure Meta App

1. Go to Meta App Dashboard
2. Add Webhooks product
3. Subscribe to Ad Account events
4. Set callback URL: `https://yourdomain.com/api/webhooks/meta`
5. Set verify token (matches `META_WEBHOOK_VERIFY_TOKEN`)

### 2. Subscribe to Events

Subscribe to these webhook fields:
- `ads` - Ad status changes
- `adcreatives` - Creative updates
- `campaigns` - Campaign changes

### 3. Event Processing

Events are logged in `meta_webhook_events` and processed by `lib/meta/webhooks/event-processor.ts`.

## Testing

### Manual Testing

1. **Publish Flow**
   - Create draft ad
   - Click Publish
   - Verify status → pending_review
   - Check Meta Ads Manager for ad

2. **Error Scenarios**
   - Publish without payment method
   - Publish with invalid content
   - Disconnect Meta, try to publish

3. **Real-time Updates**
   - Open campaign in two tabs
   - Publish in one tab
   - Verify update in other tab

### Status Transitions to Test

- `draft` → `pending_review` (on publish)
- `pending_review` → `active` (on Meta approval)
- `pending_review` → `rejected` (on Meta rejection)
- `active` → `paused` (on user pause)
- `paused` → `active` (on user resume)
- `failed` → `pending_review` (on retry)

## Troubleshooting

### Status Not Updating

1. Check Supabase Realtime is enabled
2. Verify subscription status in console
3. Check browser console for errors
4. Try manual status refresh

### Publishing Fails

1. Check error modal for details
2. Verify Meta connection is active
3. Check ad account has payment method
4. Review Meta Ads Manager for issues

### Webhook Not Receiving Events

1. Verify webhook URL is accessible
2. Check verify token matches
3. Review Meta App webhook configuration
4. Check `meta_webhook_events` table for logs

## Next Steps

### Remaining Implementation

1. **Webhooks** (Phase 3)
   - Complete webhook endpoint
   - Event processor
   - Status mapping from Meta events

2. **All Ads Grid Updates** (Phase 5)
   - Add status filtering dropdown
   - Integrate real-time subscriptions

3. **Workspace Integration** (Phase 7)
   - Update publish flow dialog
   - Integrate hooks in workspace

4. **Testing** (Phase 9)
   - Comprehensive test suite
   - E2E testing for publish flow

## Support

For issues or questions:
1. Check error modal for specific guidance
2. Review Meta's advertising policies
3. Contact support with error details
4. Include `meta_ad_id` and timestamps for debugging

## References

- Meta Marketing API: https://developers.facebook.com/docs/marketing-api
- Meta Webhooks: https://developers.facebook.com/docs/graph-api/webhooks
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Meta Advertising Policies: https://www.facebook.com/policies/ads/

