# Testing Guide - AdPilot

## Setup Test Environment

### 1. Install Test Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/react-hooks @testing-library/jest-dom @vitejs/plugin-react jsdom
```

### 2. Configuration Files Already Created

- `vitest.config.ts` ✅
- `tests/setup.ts` ✅
- `package.json` scripts updated ✅

### 3. Run Tests

```bash
# Run all tests
npm test

# Run journey tests specifically
npm test tests/journeys/

# Run with UI
npm run test:ui

# Run once (CI mode)
npm run test:run
```

---

## Test Suites

### Location Journey Tests
**File**: `tests/journeys/location-journey.test.ts`

Tests:
- useLocationMode hook initialization
- Exclude mode tracking from events
- Reset functionality
- createLocationMetadata function
- Mode flow integration

**Run**: `npm test tests/journeys/location-journey.test.ts`

### Journey Router Tests
**File**: `tests/journeys/journey-router.test.ts`

Tests:
- Tool routing to correct journey
- All 5 journeys coverage
- Unknown tool handling

**Run**: `npm test tests/journeys/journey-router.test.ts`

### Metadata Builder Tests
**File**: `tests/journeys/metadata-builder.test.ts`

Tests:
- Base metadata creation
- Location journey metadata
- Edit mode metadata
- Priority handling

**Run**: `npm test tests/journeys/metadata-builder.test.ts`

---

## Critical Test: Exclude Mode (Manual)

### Verify Architectural Fix Works

**Steps**:
1. Start dev server: `npm run dev`
2. Navigate to location step
3. Click "Exclude Location" button
4. Say "toronto"

**Expected Console Logs**:
```
[LocationMode] Setup requested: { mode: 'exclude' }
[AI Chat] Message metadata: { locationMode: 'exclude', locationInput: 'toronto' }
[addLocationsTool] Processing locations with mode: 'exclude'
[PreviewPanel] Saving 1 exclude location(s)
POST /api/v1/ads/[id]/locations/exclude
[PreviewPanel] ✅ Exclude locations saved
```

**Expected UI**:
- AI chat: RED card "Location excluded"
- Map: Toronto marker in RED
- "Excluded" section: Toronto appears
- Not in "Included" section

**Expected Database**:
```sql
SELECT * FROM ad_target_locations WHERE ad_id = '[your-ad-id]';
-- Should show: inclusion_mode = 'exclude'
```

**Expected After Refresh**:
- Exclusion persists
- RED card still in chat history
- Map still shows RED

---

## Test Results Template

Create `TEST_RESULTS.md` after running tests with:

```markdown
# Test Results

## Date: [DATE]

### Unit Tests
- Location Journey: [PASS/FAIL]
- Journey Router: [PASS/FAIL]
- Metadata Builder: [PASS/FAIL]

### Manual Tests
- Exclude Mode: [PASS/FAIL]
  - Console logs: [OK/FAIL]
  - UI red colors: [OK/FAIL]
  - Map red marker: [OK/FAIL]
  - Database save: [OK/FAIL]
  - Persistence: [OK/FAIL]

### Issues Found
[List any failures or bugs]

### Status
[READY FOR PRODUCTION / NEEDS FIXES]
```

---

*Testing Guide - AdPilot Journey Modules*

