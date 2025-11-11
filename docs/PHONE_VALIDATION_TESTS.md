# Phone Number Validation - Smoke Tests

This document outlines manual smoke test steps and considerations for the phone number validation feature that validates call destination phone numbers against Meta's Marketing API before saving.

## Feature Overview

When users configure a phone number for call ads, the system:
1. Validates the format locally (E.164 format)
2. Calls Meta Marketing API with `validate_only` execution option
3. Only saves the phone number if Meta confirms it will be accepted
4. Shows clear error messages from Meta if validation fails

## Prerequisites

Before testing, ensure:
- User is authenticated
- Campaign exists and is loaded
- Meta account is connected (Business, Page, Ad Account selected)
- Meta connection has valid token stored in localStorage

## Test Scenarios

### 1. Happy Path - Valid Phone Number

**Steps:**
1. Navigate to campaign with "Calls" goal
2. Open phone number configuration screen
3. Select country code (e.g., "+1 United States / Canada")
4. Enter a valid phone number (e.g., "415-555-0123")
5. Verify preview shows E.164 format: "+14155550123"
6. Click "Save Phone Number" button

**Expected Results:**
- Button shows "Validating with Meta..." with spinner
- After ~1-2 seconds, success message appears
- Green confirmation box shows: "Phone Number Validated - Meta confirmed: +14155550123"
- Toast notification: "Phone number validated and saved successfully"
- Phone number is saved to destination context
- User can proceed to next step

### 2. Format Error - Invalid Local Format

**Steps:**
1. Navigate to phone configuration screen
2. Enter invalid format (e.g., "123")
3. Click "Save Phone Number"

**Expected Results:**
- Immediate error before API call
- Red error box shows: "Please enter a valid phone number in international format"
- No API call is made to Meta
- Phone number is NOT saved

### 3. Meta Validation Error - Invalid Phone Number

**Steps:**
1. Navigate to phone configuration screen
2. Enter a phone number that passes format check but is invalid (e.g., "555-0000")
3. Click "Save Phone Number"

**Expected Results:**
- Button shows "Validating with Meta..." with spinner
- After API call completes, error message appears
- Red error box shows Meta's error message (e.g., "Invalid phone number for call ads")
- Toast notification shows error
- Phone number is NOT saved
- User can correct and retry

### 4. Connection Error - No Meta Connection

**Steps:**
1. Clear localStorage Meta connection
2. Navigate to phone configuration screen
3. Enter valid phone number
4. Click "Save Phone Number"

**Expected Results:**
- Error message: "Meta connection not found. Please connect your Meta account first."
- Phone number is NOT saved
- User is prompted to connect Meta account

### 5. Missing Assets - No Ad Account or Page

**Steps:**
1. Connect Meta but don't select ad account or page
2. Try to save phone number

**Expected Results:**
- Error message indicates missing asset (e.g., "Meta ad account not selected")
- Clear guidance on what needs to be configured
- Phone number is NOT saved

### 6. Update Existing Phone Number

**Steps:**
1. Save a valid phone number (follow happy path)
2. Change the phone number to a different valid number
3. Click "Update Phone Number"

**Expected Results:**
- Same validation flow as initial save
- New phone number validated with Meta
- Success confirmation shown
- Destination context updated with new number

### 7. Network Error Handling

**Steps:**
1. Disconnect from internet or use browser dev tools to simulate offline
2. Try to save phone number

**Expected Results:**
- Error message: "Failed to validate phone number with Meta"
- Graceful error handling without app crash
- User can retry when connection is restored

## API Endpoint Tests

### Endpoint: `POST /api/meta/destination/phone`

#### Test 1: Valid Request
```bash
curl -X POST http://localhost:3000/api/meta/destination/phone \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "test-campaign-id",
    "phoneNumber": "+14155550123"
  }'
```

**Expected Response (200):**
```json
{
  "valid": true,
  "e164Phone": "+14155550123",
  "message": "Phone number validated successfully"
}
```

#### Test 2: Invalid Phone Format
```bash
curl -X POST http://localhost:3000/api/meta/destination/phone \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "test-campaign-id",
    "phoneNumber": "123"
  }'
```

**Expected Response (200):**
```json
{
  "valid": false,
  "e164Phone": "+123",
  "error": "Phone number format is invalid. Use E.164 format (e.g., +15551234567)",
  "errorCode": "INVALID_FORMAT"
}
```

#### Test 3: Missing Campaign ID
```bash
curl -X POST http://localhost:3000/api/meta/destination/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+14155550123"
  }'
```

**Expected Response (400):**
```json
{
  "valid": false,
  "error": "campaignId is required",
  "errorCode": "MISSING_CAMPAIGN_ID"
}
```

## Automated Test Coverage

### Unit Tests

**File:** `tests/normalize-phone.test.ts`

Existing tests cover:
- ✅ Local number formatting with country code
- ✅ International number handling
- ✅ Invalid number detection

These tests validate the E.164 normalization logic that runs before the Meta API call.

### Integration Tests (Recommended)

Consider adding tests for:
- Mock Meta API responses (success/error cases)
- API endpoint request/response handling
- Error code mapping
- Token validation

## Common Issues & Troubleshooting

### Issue: "Meta connection not found"
**Cause:** localStorage doesn't have Meta connection for this campaign
**Solution:** Navigate to Meta connection wizard and complete setup

### Issue: "Meta page not selected"
**Cause:** User completed Meta OAuth but didn't select assets
**Solution:** Go to Meta settings and select a Facebook page

### Issue: Phone number works locally but fails Meta validation
**Cause:** Number format is correct but Meta has specific requirements (e.g., must be able to receive calls)
**Solution:** Verify the phone number can receive calls and is not blacklisted by Meta

### Issue: Validation is slow
**Cause:** Meta API call can take 1-3 seconds
**Solution:** This is expected - loading state informs user

## References

- **Meta Call Ads Documentation:** https://developers.facebook.com/docs/marketing-api/call-ads
- **Meta validate_only Parameter:** https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads
- **E.164 Phone Number Format:** https://en.wikipedia.org/wiki/E.164

## Notes

- The validation uses `validate_only` execution option, which checks the payload without creating actual ad creatives
- Meta's response may include specific error codes for different rejection reasons
- Phone numbers must be in E.164 format (international format with country code)
- The feature requires an active Meta connection with proper permissions

