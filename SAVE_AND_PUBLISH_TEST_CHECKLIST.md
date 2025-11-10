# Save & Publish Button - Test Checklist

## Implementation Summary

Added a "Save & Publish" button in the workspace header that appears when editing any ad (live, draft, or paused). The button validates all required sections before publishing and uses the existing publish flow dialog.

## Files Modified

1. ✅ `lib/types/workspace.ts` - Added `onSaveAndPublish` and `isSaveAndPublishDisabled` props to `WorkspaceHeaderProps`
2. ✅ `lib/utils/ad-validation.ts` - Created validation utility functions
3. ✅ `components/workspace-header.tsx` - Added Save & Publish button UI
4. ✅ `components/campaign-workspace.tsx` - Added handlers and wired up PublishFlowDialog

## Test Scenarios

### 1. UI Display Tests

#### Test 1.1: Button Visibility in Edit Mode
- [ ] Navigate to an existing ad in edit mode (`?view=edit&adId=...`)
- [ ] Verify "Save & Publish" button appears in top-right header
- [ ] Verify button is positioned next to "Editing Live Campaign" badge
- [ ] Verify button has gradient background (blue to cyan)
- [ ] Verify button shows Rocket icon + "Save & Publish" text

#### Test 1.2: Button Hidden in Other Modes
- [ ] Navigate to build mode (`?view=build`)
- [ ] Verify "Save & Publish" button does NOT appear
- [ ] Navigate to results mode (`?view=results`)
- [ ] Verify "Save & Publish" button does NOT appear
- [ ] Navigate to all-ads grid (no query params)
- [ ] Verify "Save & Publish" button does NOT appear

### 2. Validation Tests

#### Test 2.1: Incomplete Creative
- [ ] Edit an ad and ensure no creative is selected (selectedImageIndex = null)
- [ ] Click "Save & Publish"
- [ ] Verify toast error: "Select an ad creative"
- [ ] Verify publish dialog does NOT open

#### Test 2.2: Incomplete Ad Copy
- [ ] Edit an ad with creative but incomplete ad copy
- [ ] Click "Save & Publish"
- [ ] Verify toast error mentions "Complete ad copy selection"
- [ ] Verify publish dialog does NOT open

#### Test 2.3: Incomplete Location
- [ ] Edit an ad with location not completed
- [ ] Click "Save & Publish"
- [ ] Verify toast error mentions "Set target locations"
- [ ] Verify publish dialog does NOT open

#### Test 2.4: Incomplete Audience
- [ ] Edit an ad with audience not completed
- [ ] Click "Save & Publish"
- [ ] Verify toast error mentions "Define target audience"
- [ ] Verify publish dialog does NOT open

#### Test 2.5: Incomplete Goal
- [ ] Edit an ad with goal not completed
- [ ] Click "Save & Publish"
- [ ] Verify toast error mentions "Set campaign goal"
- [ ] Verify publish dialog does NOT open

#### Test 2.6: No Meta Connection
- [ ] Edit an ad without Meta connection
- [ ] Click "Save & Publish"
- [ ] Verify toast error mentions "Connect Facebook & Instagram"
- [ ] Verify publish dialog does NOT open

#### Test 2.7: No Payment Method
- [ ] Edit an ad without payment method
- [ ] Click "Save & Publish"
- [ ] Verify toast error mentions "Add payment method"
- [ ] Verify publish dialog does NOT open

#### Test 2.8: No Budget
- [ ] Edit an ad without budget set
- [ ] Click "Save & Publish"
- [ ] Verify toast error mentions "Set campaign budget"
- [ ] Verify publish dialog does NOT open

#### Test 2.9: Multiple Missing Requirements
- [ ] Edit an ad with multiple incomplete sections
- [ ] Click "Save & Publish"
- [ ] Verify toast error lists all missing requirements
- [ ] Verify publish dialog does NOT open

### 3. Publish Flow Tests

#### Test 3.1: Successful Edit Save for Draft Ad
- [ ] Edit a draft ad with all sections complete
- [ ] Click "Save & Publish"
- [ ] Verify publish dialog opens
- [ ] Verify dialog title shows "Saving Changes"
- [ ] Verify progress steps execute
- [ ] Verify dialog closes automatically on completion
- [ ] Verify redirects to all-ads grid
- [ ] Verify success modal shows "Changes Saved"
- [ ] Verify ad is updated in database

#### Test 3.2: Successful Edit Save for Live Ad
- [ ] Edit a live ad with all sections complete
- [ ] Click "Save & Publish"
- [ ] Verify publish dialog opens with "Saving Changes" title
- [ ] Verify dialog shows "isEditMode" messaging
- [ ] Wait for completion
- [ ] Verify ad is updated in database
- [ ] Verify meta_ad_id is preserved
- [ ] Verify status remains 'active'

#### Test 3.3: Successful Edit Save for Paused Ad
- [ ] Edit a paused ad with all sections complete
- [ ] Click "Save & Publish"
- [ ] Verify publish dialog opens
- [ ] Wait for completion
- [ ] Verify ad is updated in database
- [ ] Verify meta_ad_id is preserved
- [ ] Verify status remains 'paused' or updates to 'active' as designed

### 4. Button State Tests

#### Test 4.1: Button Disabled During Publish
- [ ] Edit an ad with all sections complete
- [ ] Click "Save & Publish"
- [ ] While publish dialog is showing progress
- [ ] Verify "Save & Publish" button is disabled
- [ ] Verify button has reduced opacity
- [ ] Verify cannot click button again

#### Test 4.2: Button Re-enabled After Publish
- [ ] Complete a publish flow
- [ ] Navigate back to edit the same ad
- [ ] Verify "Save & Publish" button is enabled again

### 5. Error Handling Tests

#### Test 5.1: Network Error During Save
- [ ] Disconnect network or mock API failure
- [ ] Edit an ad and click "Save & Publish"
- [ ] Verify toast error: "Failed to save changes"
- [ ] Verify publish dialog remains open (doesn't auto-close on error)
- [ ] Verify button becomes enabled again for retry

#### Test 5.2: Snapshot Validation Failure
- [ ] Mock a snapshot validation failure (requires code modification)
- [ ] Click "Save & Publish"
- [ ] Verify appropriate error toast
- [ ] Verify publish dialog closes
- [ ] Verify button becomes enabled

#### Test 5.3: API 404/500 Error
- [ ] Mock API to return 404 or 500
- [ ] Click "Save & Publish"
- [ ] Verify error toast
- [ ] Verify graceful error handling

### 6. Integration Tests

#### Test 6.1: Edit-Save-Edit Flow
- [ ] Edit an ad and save
- [ ] Verify redirects to all-ads grid
- [ ] Click edit on the same ad again
- [ ] Verify ad loads with saved changes
- [ ] Make another change and save
- [ ] Verify second save works correctly

#### Test 6.2: Multiple Ads in Campaign
- [ ] Create campaign with 3+ ads
- [ ] Edit ad #1 and save
- [ ] Edit ad #2 and save
- [ ] Edit ad #3 and save
- [ ] Verify each ad is updated independently
- [ ] Verify no cross-contamination of data

#### Test 6.3: Auto-save Still Works
- [ ] Edit an ad
- [ ] Make a change to creative or copy
- [ ] Wait for auto-save (if implemented)
- [ ] Verify auto-save still functions
- [ ] Verify "Save & Publish" saves the auto-saved data

### 7. Edge Cases

#### Test 7.1: Rapid Button Clicks
- [ ] Edit an ad
- [ ] Click "Save & Publish" multiple times rapidly
- [ ] Verify only one publish dialog opens
- [ ] Verify no duplicate API calls
- [ ] Verify proper debouncing

#### Test 7.2: Dialog Close Before Completion
- [ ] Edit an ad and click "Save & Publish"
- [ ] Try to close dialog while progress is showing
- [ ] Verify dialog cannot be closed during publish
- [ ] Verify message: "Please don't close this window..."

#### Test 7.3: Browser Refresh During Edit
- [ ] Edit an ad
- [ ] Refresh browser
- [ ] Verify edit mode is restored with ad ID
- [ ] Verify "Save & Publish" button still appears
- [ ] Verify can save after refresh

#### Test 7.4: Deep Link to Edit Mode
- [ ] Copy URL with `?view=edit&adId=...`
- [ ] Open in new tab
- [ ] Verify edit mode loads correctly
- [ ] Verify "Save & Publish" button appears
- [ ] Verify can save successfully

## Success Criteria

All test scenarios must pass for the implementation to be considered complete:

- ✅ Button appears only in edit mode
- ✅ Button positioned correctly in header
- ✅ Validation prevents publish with incomplete sections
- ✅ Draft ads can be updated
- ✅ Live/paused ads can be updated
- ✅ Error handling shows user-friendly messages
- ✅ Publish dialog shows correct messaging for edit mode
- ✅ Success flow returns to all-ads grid
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ No ESLint errors

## Known Limitations

1. Meta API integration is simulated - actual Meta publishing not implemented
2. Auto-save may conflict with Save & Publish if both modify same data
3. Network error retry requires manual button click (no automatic retry)

## Future Enhancements

1. Add loading spinner in button while validating
2. Add confirmation dialog if changes are significant
3. Add "Save as Draft" vs "Save & Publish" options
4. Add preview before publish
5. Add undo/revert changes option

