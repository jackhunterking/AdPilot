# Meta Instant Form Preview - QA Smoke Test Checklist

## Overview
This document provides a comprehensive manual testing checklist for the pixel-perfect Meta Instant Form preview feature.

## Test Environment Setup
- [ ] Ensure you have a Meta Business account connected
- [ ] Have at least one Facebook Page with admin access
- [ ] Create at least 2 test instant forms in Meta Ads Manager (or use existing ones)
- [ ] Have campaign with "Leads" goal selected

## 1. Create New Form Flow

### Form Builder
- [ ] Navigate to campaign goal step
- [ ] Select "Leads" as goal
- [ ] Click "Create New" tab
- [ ] **Preview Updates**: Verify form name appears in preview as you type
- [ ] **Preview Updates**: Verify privacy URL updates preview when changed
- [ ] **Preview Updates**: Verify field changes reflect in preview
- [ ] **Preview Updates**: Verify thank you page content shows in preview

### Form Creation
- [ ] Fill in form name (e.g., "Test Lead Form")
- [ ] Set privacy policy URL (e.g., https://adpilot.studio/general-privacy-policy)
- [ ] Verify default fields are present: Email, Full Name, Phone
- [ ] Set thank you title (e.g., "Thanks for your interest!")
- [ ] Set thank you message (optional)
- [ ] Click "Create and select form" button
- [ ] Verify form is created in Meta (check Meta Ads Manager)
- [ ] Verify form is auto-selected after creation
- [ ] Verify stepper advances automatically

## 2. Select Existing Form Flow

### Form List
- [ ] Click "Select Existing" tab
- [ ] Verify list of existing forms loads
- [ ] Verify search box filters forms correctly
- [ ] Verify form cards show: name, icon, creation date
- [ ] Verify selected form has blue border and checkmark

### Form Selection
- [ ] Click on a form card
- [ ] **Preview Updates**: Verify preview updates to show selected form
- [ ] Verify form name appears correctly in preview
- [ ] Verify fields match the actual form
- [ ] Verify privacy text appears
- [ ] Click "Use this form" button
- [ ] Verify selection is saved
- [ ] Verify stepper advances automatically

## 3. Preview UI Pixel-Perfect Validation

### Device Frame
- [ ] Verify iPhone-style frame with rounded corners
- [ ] Verify black border around device (8px)
- [ ] Verify frame width is 360px
- [ ] Verify status bar appears at top
- [ ] Verify notch is centered
- [ ] Verify time shows "9:41"
- [ ] Verify battery icon in top right

### Stage 1: Prefill Information
- [ ] Verify header says "Prefill information"
- [ ] Verify "1 of 3" appears below header
- [ ] Verify progress bar is 33% filled
- [ ] Verify form name appears as title
- [ ] Verify Email field is visible with icon
- [ ] Verify Full Name field is visible with icon
- [ ] Verify Continue button is blue (#1877F2)
- [ ] Verify privacy text at bottom with info icon

### Stage 2: Contact Information
- [ ] Press right arrow or click next
- [ ] Verify header changes to "Contact information"
- [ ] Verify "2 of 3" appears
- [ ] Verify progress bar is 66% filled
- [ ] Verify Phone field is visible with icon
- [ ] Verify Continue button is present
- [ ] Verify privacy text at bottom

### Stage 3: Review
- [ ] Navigate to stage 3
- [ ] Verify header says "Review"
- [ ] Verify "3 of 3" appears
- [ ] Verify progress bar is 100% filled
- [ ] Verify summary card shows all fields
- [ ] Verify sample values appear (user@example.com, John Doe, +1 (555) 123-4567)
- [ ] Verify Submit button is present

### Stage 4: Thank You (if configured)
- [ ] Complete form submission (or set showThankYou prop)
- [ ] Verify green checkmark icon appears
- [ ] Verify thank you title appears
- [ ] Verify thank you body text (if configured)
- [ ] Verify CTA button (if configured)
- [ ] Verify button text matches configuration

### Navigation
- [ ] Verify left arrow navigates to previous stage
- [ ] Verify right arrow navigates to next stage
- [ ] Verify keyboard arrow keys work
- [ ] Verify stage wraps around (3 → 1 and 1 → 3)

### Typography & Spacing
- [ ] Verify font sizes match Meta's design:
  - Status bar: 11px
  - Privacy text: 13px
  - Body text: 15px
  - Headers: 17px
  - Thank you title: 20px
- [ ] Verify spacing is consistent (use browser DevTools to measure)
- [ ] Verify text is left-aligned (except privacy/centered content)

### Colors
- [ ] Verify background is #F7F8FA (light gray)
- [ ] Verify text is #050505 (near black)
- [ ] Verify button is #1877F2 (Meta blue)
- [ ] Verify borders are #DADDE1
- [ ] Verify placeholders are tertiary color (#8A8D91)

## 4. Dynamic Mapping Verification

### Create Flow Mapping
- [ ] Change form name → verify preview updates
- [ ] Change privacy URL → verify preview updates
- [ ] Change privacy link text → verify preview updates
- [ ] Change thank you title → verify preview updates
- [ ] Change thank you message → verify preview updates
- [ ] Verify all changes are reflected in real-time

### Select Existing Mapping
- [ ] Select form A → verify preview shows form A details
- [ ] Select form B → verify preview updates to form B
- [ ] Verify field count matches actual form
- [ ] Verify privacy URL matches actual form
- [ ] Verify form name matches actual form

## 5. State Persistence

### Reload Test
- [ ] Create or select a form
- [ ] Reload the page
- [ ] Navigate back to goal step
- [ ] Verify selected form is still shown
- [ ] Verify preview displays correct form

### Navigation Test
- [ ] Select a form
- [ ] Navigate to next step (Location)
- [ ] Navigate back to Goal step
- [ ] Verify form is still selected
- [ ] Verify preview is correct

## 6. Error Handling

### No Connection
- [ ] Clear Meta connection (localStorage)
- [ ] Try to load forms
- [ ] Verify helpful error message appears
- [ ] Verify user is prompted to reconnect

### Network Errors
- [ ] Simulate network error (DevTools offline mode)
- [ ] Try to create form
- [ ] Verify error message appears
- [ ] Reconnect network
- [ ] Verify retry works

### Invalid Data
- [ ] Try to submit form with empty name
- [ ] Verify validation error appears
- [ ] Try invalid privacy URL
- [ ] Verify validation error appears

## 7. Responsive Behavior

### Container Sizing
- [ ] Verify preview stays 360px wide on large screens
- [ ] Verify preview is centered in container
- [ ] Verify no horizontal scroll in preview
- [ ] Resize browser window
- [ ] Verify preview maintains aspect ratio

## 8. Accessibility

### Keyboard Navigation
- [ ] Tab through form controls
- [ ] Verify focus indicators are visible
- [ ] Use arrow keys for stage navigation
- [ ] Verify stage changes work with keyboard only

### Screen Reader (Optional)
- [ ] Enable screen reader
- [ ] Navigate through preview
- [ ] Verify labels are announced
- [ ] Verify stage changes are announced

## 9. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Verify consistent appearance across browsers
- [ ] Verify no console errors

## 10. Performance

### Load Time
- [ ] Measure time to render preview
- [ ] Should be < 500ms for initial render
- [ ] Verify no layout shifts during load

### Interaction Responsiveness
- [ ] Stage transitions should be smooth (300ms)
- [ ] Form updates should reflect within 100ms
- [ ] No jank or stuttering during navigation

## Pass Criteria

For the feature to pass QA:
- [ ] All "Create New" flows complete successfully
- [ ] All "Select Existing" flows complete successfully
- [ ] Preview is visually accurate (≤2px variance from Meta)
- [ ] Dynamic mapping works in real-time
- [ ] State persists across reloads/navigation
- [ ] No console errors or warnings
- [ ] No TypeScript errors
- [ ] All fields render correctly
- [ ] Navigation works flawlessly

## Known Limitations (Expected)

These are NOT bugs:
- Only core fields supported (Email, Full Name, Phone)
- No custom questions support
- No conditional logic
- No multi-language support
- Preview is static (not interactive)
- Thank you button doesn't actually navigate

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshot or screen recording
5. Console errors (if any)
6. Network tab showing API calls (if relevant)

## Sign-off

- [ ] Tester Name: ___________________
- [ ] Date: ___________________
- [ ] Result: PASS / FAIL / PARTIAL
- [ ] Notes: ___________________

