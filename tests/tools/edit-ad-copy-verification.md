# Edit Ad Copy Tool - Verification Plan

## Summary of Changes

We've stabilized the `editAdCopyTool` to prevent infinite error loops when editing ad copy. The changes include:

### 1. Relaxed Schema (`RelaxedCopyItemSchema`)
- Allows AI to generate text up to 500 chars for primaryText, 200 chars for headline/description
- Prevents immediate Zod validation failures when AI generates longer text

### 2. Clamping Function (`clampCopy`)
- Intelligently trims text to Meta's limits (125/40/30 chars)
- Preserves word boundaries when possible (cuts at last space if within 80% of limit)
- Applied after AI generation but before returning to UI

### 3. Error Handling
- Tool now catches all errors in a try-catch block
- Returns `{ success: false, error: "..." }` instead of throwing
- UI already handles this error format and displays it to user

## Root Cause
The previous implementation used `SingleCopySchema` with strict limits (125/40/30 chars). When the AI generated text exceeding these limits (especially when user asks to "add emojis"), `generateObject` threw a Zod validation error. This error wasn't caught, causing the stream to fail with "An error occurred during AI generation." The user would then retry, triggering the same error in an infinite loop.

## Fix Verification

### Automated Tests (Created)
File: `tests/tools/edit-ad-copy-tool.test.ts`

Tests cover:
1. Over-length primaryText (150 chars) → should clamp to ≤125
2. Over-length headline (60 chars) → should clamp to ≤40
3. Over-length description (50 chars) → should clamp to ≤30
4. Zod validation errors → should return error instead of throwing
5. Valid copy → should pass through unchanged

**Note**: Tests require vitest to be installed. To run:
```bash
npm install -D vitest @vitest/ui
npm test tests/tools/edit-ad-copy-tool.test.ts
```

### Manual Verification Steps

1. **Test emoji edit that previously caused loop**:
   - Create a campaign with ad copy
   - Click "Edit" on a variation
   - Type: "add more emojis to make it fun"
   - Expected: Tool generates new copy with emojis, clamps if needed, updates UI
   - Previous: "An error occurred during AI generation" loop

2. **Test long copy generation**:
   - Edit a variation
   - Type: "make the text much longer and more descriptive"
   - Expected: AI generates long text, tool clamps to limits, shows result
   - Previous: Zod validation error

3. **Test normal edits still work**:
   - Edit a variation
   - Type: "change the tone to more professional"
   - Expected: Works as before, generates appropriate copy

4. **Check error display**:
   - If any validation error occurs, verify UI shows:
     - Red error box with message
     - "The AI generated text that was too long. Please try again with a simpler instruction."
   - Not the generic "An error occurred during AI generation"

### Console Verification

Check browser console for:
- `[editAdCopyTool] Successfully generated and clamped copy for variation X`
- No uncaught errors or stack traces
- Logs show clamping when text exceeds limits

### Files Modified

1. `lib/ai/schemas/ad-copy.ts` - Added `RelaxedCopyItemSchema` and `clampCopy` function
2. `tools/edit-ad-copy-tool.ts` - Uses relaxed schema, clamps output, added error handling
3. `tests/tools/edit-ad-copy-tool.test.ts` - Test suite (requires vitest)

## Expected Behavior After Fix

✅ User can request emoji edits without infinite loops
✅ AI-generated text automatically clamped to Meta limits
✅ Errors displayed with actionable messages
✅ No impact on valid edit operations
✅ Word boundaries preserved when clamping (better readability)

## Rollback Plan

If issues arise, revert these files:
- `lib/ai/schemas/ad-copy.ts` - Remove `RelaxedCopyItemSchema` and `clampCopy`
- `tools/edit-ad-copy-tool.ts` - Revert to use `SingleCopySchema` directly

The UI error handling doesn't need reverting as it was already correct.

