# Save Ad Changes API - Implementation Complete

## Summary

The "Save Changes" functionality for editing ads has been fully implemented. When a user edits an ad and presses the "Save Changes" button, all ad modifications (copy, creative, and destination data) are saved to the database.

## What Was Implemented

### 1. TypeScript Types (`lib/types/workspace.ts`)
Added comprehensive interfaces for the Save Ad API:
- `SaveAdCopyData` - Ad copy structure
- `SaveAdCreativeData` - Creative/image data structure
- `SaveAdDestinationData` - Destination configuration
- `SaveAdPayload` - Complete request payload
- `SaveAdResponse` - API response format

### 2. API Endpoint (`app/api/campaigns/[id]/ads/[adId]/save/route.ts`)
New `PUT` endpoint that:
- ✅ Authenticates the user
- ✅ Validates campaign ownership
- ✅ Validates all required fields (copy, creative, destination)
- ✅ Builds structured data objects for database
- ✅ Creates comprehensive setup_snapshot with metadata
- ✅ Updates database in single transaction
- ✅ Returns updated ad data
- ✅ Comprehensive error handling (401, 403, 404, 400, 500)

**Endpoint:** `PUT /api/campaigns/[campaignId]/ads/[adId]/save`

**Database Updates:**
- `copy_data` - Stores copy variations and selected copy
- `creative_data` - Stores images, selected image, creative variation
- `destination_data` - Stores destination config (website/form/call)
- `setup_snapshot` - Complete state snapshot with metadata
- `destination_type` - Type of destination for easy filtering
- `updated_at` - Timestamp of last update

### 3. Context Integration (`lib/context/ad-preview-context.tsx`)
Added `saveAdChanges()` function that:
- ✅ Collects creative data from AdPreviewContext
- ✅ Accepts copy and destination data as parameters
- ✅ Builds complete SaveAdPayload
- ✅ Calls the save API endpoint
- ✅ Handles API errors with user-friendly messages
- ✅ Logs save operations for debugging

### 4. Save Button Wiring (`components/campaign-workspace.tsx`)
Updated `handleSave()` function to:
- ✅ Collect data from all contexts (AdCopy, Destination, AdPreview)
- ✅ Transform context data to API payload format
- ✅ Call `saveAdChanges()` with collected data
- ✅ Show loading state during save (`isSaving`)
- ✅ Display success toast on completion
- ✅ Display error toast on failure
- ✅ Refresh ads list after save
- ✅ Navigate to All Ads view after successful save
- ✅ Clear unsaved changes flag

### 5. Data Collection

The save operation collects:

**Copy Data:**
- Selected copy variation (primaryText, headline, description)
- All copy variations
- Selected copy index

**Creative Data:**
- All image variations (URLs)
- Selected image index
- Selected creative variation (gradient, metadata)
- Base image URL
- Format (feed/story)

**Destination Data:**
- Destination type (website/form/call)
- Website URL (if type = website)
- Phone number (if type = call)
- Form fields (if type = form)
- CTA text

**Metadata:**
- Saved timestamp
- Schema version
- User ID
- Edit context
- Saved from mode

## Testing Guide

### Prerequisites
1. Start the development server: `npm run dev`
2. Ensure Supabase is configured and running
3. Have at least one campaign with a draft ad

### Test Scenario 1: Edit and Save Draft Ad

1. **Navigate to campaign:**
   - Go to existing campaign page
   - Click "See All Ads" or view ads grid

2. **Enter edit mode:**
   - Click "Edit" on a draft ad
   - You should see the ad in edit mode with "Save Changes" button

3. **Make changes:**
   - Edit ad copy (headline, primary text, description)
   - Change selected image variation
   - Modify destination (URL, phone, or form)

4. **Save changes:**
   - Click "Save Changes" button in header
   - Button should show loading state (disabled)

5. **Verify success:**
   - ✅ Toast notification: "Ad saved successfully!"
   - ✅ Navigation to All Ads view
   - ✅ Changes persist when re-entering edit mode

6. **Verify database:**
   ```sql
   SELECT 
     id, 
     name, 
     copy_data, 
     creative_data, 
     destination_data, 
     setup_snapshot,
     updated_at 
   FROM ads 
   WHERE id = '<ad-id>';
   ```
   - ✅ `copy_data` contains updated copy
   - ✅ `creative_data` contains selected image/creative
   - ✅ `destination_data` contains destination config
   - ✅ `setup_snapshot` contains complete state
   - ✅ `updated_at` is recent timestamp

### Test Scenario 2: Error Handling

**Test 2a: Save without authentication**
1. Clear authentication cookies
2. Try to save ad
3. ✅ Should show "Unauthorized" error

**Test 2b: Save ad from different campaign**
1. Try to save ad with mismatched campaign ID
2. ✅ Should show "Campaign not found" or permission error

**Test 2c: Save with incomplete data**
1. Remove required fields programmatically
2. Try to save
3. ✅ Should show validation error

**Test 2d: Network failure**
1. Disable network or API endpoint
2. Try to save
3. ✅ Should show "Failed to save ad changes" error
4. ✅ User can retry after network restored

### Test Scenario 3: Concurrent Edit Safety

1. Open same ad in two browser tabs
2. Edit different fields in each tab
3. Save from first tab
4. Save from second tab
5. ✅ Second save should overwrite first
6. ✅ No database corruption

### Test Scenario 4: Published Ad Edit

1. Edit a published ad (has meta_ad_id)
2. Make changes to copy/creative
3. Click "Save Changes"
4. ✅ Changes saved as draft
5. ✅ Published version unchanged (requires republish)

## Verification Checklist

- [ ] Save Changes button appears in edit mode
- [ ] Button disabled during save operation
- [ ] Loading state shown during save
- [ ] Success toast appears after save
- [ ] Error toast appears on failure
- [ ] Changes persist after save
- [ ] Database updated correctly (all 4 data fields + snapshot)
- [ ] Navigation to All Ads after save
- [ ] Unsaved changes flag cleared after save
- [ ] API logs show successful save operations
- [ ] No TypeScript/linter errors

## API Request/Response Examples

### Request
```json
PUT /api/campaigns/{campaignId}/ads/{adId}/save

{
  "copy": {
    "primaryText": "Get your free consultation today!",
    "headline": "Professional Accounting Services",
    "description": "Trusted by over 1000 businesses",
    "selectedCopyIndex": 0,
    "variations": [
      {
        "primaryText": "Get your free consultation today!",
        "headline": "Professional Accounting Services",
        "description": "Trusted by over 1000 businesses"
      }
    ]
  },
  "creative": {
    "imageVariations": [
      "https://example.com/image1.png",
      "https://example.com/image2.png",
      "https://example.com/image3.png"
    ],
    "selectedImageIndex": 1,
    "selectedCreativeVariation": {
      "gradient": "from-blue-600 via-blue-500 to-cyan-500",
      "title": "Variation 2"
    },
    "baseImageUrl": "https://example.com/base.png",
    "format": "feed"
  },
  "destination": {
    "type": "website",
    "url": "https://example.com/contact",
    "cta": "Learn More"
  },
  "metadata": {
    "editContext": "manual_save",
    "savedFrom": "edit_mode"
  }
}
```

### Response (Success)
```json
{
  "success": true,
  "ad": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "campaign_id": "789e4567-e89b-12d3-a456-426614174000",
    "name": "Accounting Services Ad",
    "status": "draft",
    "copy_data": { ... },
    "creative_data": { ... },
    "destination_data": { ... },
    "setup_snapshot": { ... },
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Failed to save ad changes"
}
```

## Console Logs to Watch

During save operation, you should see:
```
[AdPreviewContext] Saving ad changes { adId: '...', campaignId: '...' }
[save_ad_1234567890] Save ad changes request: { campaignId: '...', adId: '...' }
[save_ad_1234567890] Validation passed, building update data
[save_ad_1234567890] Updating ad in database
[save_ad_1234567890] Ad saved successfully: { adId: '...', updatedAt: '...' }
[AdPreviewContext] Ad changes saved successfully { adId: '...' }
[handleSave] Ad saved successfully
```

## Known Limitations

1. **Format Detection**: Currently hardcoded to 'feed' format. Need to track active format in state.
2. **Optimistic Locking**: No version field to prevent overwriting concurrent edits.
3. **Undo/Redo**: No ability to rollback to previous version.
4. **Auto-save**: Manual save only; no auto-save on interval (separate feature).

## Future Enhancements

- [ ] Add optimistic locking with version field
- [ ] Add changelog/audit trail for edits
- [ ] Implement auto-save on interval
- [ ] Add conflict resolution UI for concurrent edits
- [ ] Add undo/redo using snapshot history
- [ ] Track and restore active format (feed/story)
- [ ] Add save progress indicator for slow connections

## Files Modified

1. `/lib/types/workspace.ts` - Added Save API types
2. `/app/api/campaigns/[id]/ads/[adId]/save/route.ts` - New save endpoint
3. `/lib/context/ad-preview-context.tsx` - Added saveAdChanges function
4. `/components/campaign-workspace.tsx` - Updated handleSave function

## References

- **Vercel AI SDK V5**: https://ai-sdk.dev/docs/introduction
- **Next.js Route Handlers**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Supabase Updates**: https://supabase.com/docs/reference/javascript/update
- **Database Schema**: `/docs/PUBLISHING_DATABASE_SCHEMA.md`

