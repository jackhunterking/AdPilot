# Location Targeting Solution Design
## Phase 2: Architecture & Implementation Plan

**Based on:** INVESTIGATION-FINDINGS.md
**Root Cause:** Tool call detection reliability + Missing fallback rendering

---

## Solution Strategy

### Three-Pronged Approach

1. **Fix Tool Call Detection** - Ensure ALL locationTargeting calls are processed
2. **Add Fallback Rendering** - Display SOMETHING even without perfect geometry
3. **Enhance User Feedback** - Clear error messages and loading states

---

## Solution 1: Robust Tool Call Detection

### Problem
Current check is too restrictive:
```typescript
if (callId && state === 'input-available' && input && !processedLocationCalls.current.has(callId))
```

The `state === 'input-available'` condition might miss tool calls that:
- Transition to other states before useEffect runs
- Are in different states due to AI SDK v5 lifecycle
- Are processed by AI but marked differently

### Solution: Multi-State Detection

**Change detection to accept multiple states:**
```typescript
const PROCESSABLE_STATES = ['input-available', 'result', 'partial-call'];

if (
  callId &&
  state &&  // Just check state exists
  input &&
  !processedLocationCalls.current.has(callId)
) {
  // Process regardless of specific state
  processLocationToolCall(callId, input);
}
```

**Benefits:**
- Catches tool calls in any state
- More resilient to AI SDK updates
- Still prevents duplicate processing via `processedLocationCalls` ref

**Risks:**
- Might process calls twice if state changes
- **Mitigation:** The `processedLocationCalls.current.has(callId)` check prevents this

---

## Solution 2: Fallback Rendering Strategy

### Problem
If Nominatim doesn't return geometry, map shows nothing.

### Solution: Three-Tier Fallback

**Priority Order:**
1. **Full Geometry** (Polygon/MultiPolygon) - Most accurate
2. **BBox Rectangle** - Good approximation  
3. **Center Circle** - Minimum viable display

**Implementation in Map Rendering:**
```typescript
// components/location-selection-canvas.tsx

validLocations.forEach((location) => {
  const color = location.mode === "include" ? "#16A34A" : "#DC2626";
  
  // Add marker (always)
  const marker = L.circleMarker([location.coordinates[1], location.coordinates[0]], {...});
  marker.bindPopup(`<strong>${location.name}</strong>`);
  markersRef.current.push(marker);
  
  // Add coverage area (fallback chain)
  if (location.type === "radius" && location.radius) {
    // Tier 3: Explicit radius
    const radiusInMeters = location.radius * 1609.34;
    const circle = L.circle([location.coordinates[1], location.coordinates[0]], {
      radius: radiusInMeters, ...
    });
    shapesRef.current.push(circle);
    
  } else if (location.geometry) {
    // Tier 1: Full geometry (best)
    try {
      const geoJsonLayer = L.geoJSON(location.geometry, {
        style: { fillColor: color, ... }
      });
      shapesRef.current.push(geoJsonLayer);
    } catch (error) {
      console.error("Error rendering geometry, falling back to bbox");
      // Fall through to bbox fallback
      if (location.bbox) {
        renderBboxRectangle(location.bbox, color);
      }
    }
    
  } else if (location.bbox) {
    // Tier 2: BBox rectangle
    const bounds = [
      [location.bbox[1], location.bbox[0]],  // SW corner
      [location.bbox[3], location.bbox[2]]   // NE corner
    ];
    const rectangle = L.rectangle(bounds, {
      fillColor: color,
      fillOpacity: 0.15,
      color: color,
      weight: 2,
      opacity: 0.6,
    });
    shapesRef.current.push(rectangle);
    
  } else {
    // Tier 3: Default radius fallback (50km for regions/countries)
    const defaultRadius = location.type === 'country' ? 500000 :
                         location.type === 'region' ? 100000 :
                         50000;  // 50km default
    const circle = L.circle([location.coordinates[1], location.coordinates[0]], {
      radius: defaultRadius,
      fillColor: color,
      fillOpacity: 0.1,
      color: color,
      weight: 2,
      opacity: 0.4,
      dashArray: '5, 10',  // Dashed to indicate approximation
    });
    shapesRef.current.push(circle);
  }
});
```

**Benefits:**
- ALWAYS shows something to user
- Graceful degradation
- Visual distinction (dashed line) for approximations

---

## Solution 3: Enhanced Error Handling & User Feedback

### Problem
Silent failures - user doesn't know when location setup fails.

### Solution A: Status-Based UI Feedback

**Add intermediate status to LocationState:**
```typescript
type LocationStatus = 
  | 'idle' 
  | 'setup-in-progress'  // Existing
  | 'partial-success'     // NEW: Some locations failed
  | 'completed' 
  | 'error';

interface LocationState {
  locations: Location[];
  status: LocationStatus;
  errorMessage?: string;
  warnings?: string[];  // NEW: Non-fatal issues
}
```

**Update processLocationToolCall to track warnings:**
```typescript
const processed = await Promise.all(input.locations.map(async (loc) => {
  try {
    const geoResult = await searchLocations(loc.name);
    if (!geoResult.success) {
      console.warn('Geocoding failed:', loc.name);
      return { location: null, warning: `Couldn't find "${loc.name}"` };
    }
    
    // Try to get boundary
    let geometry = undefined;
    let warning = undefined;
    
    if (loc.type !== 'radius') {
      const boundaryData = await getLocationBoundary(center, place_name);
      if (!boundaryData) {
        warning = `Using approximate boundary for "${place_name}"`;
        // Will fall back to bbox or circle rendering
      } else {
        geometry = boundaryData.geometry;
      }
    }
    
    return {
      location: { ...finalLocation, geometry },
      warning
    };
  } catch (error) {
    return { location: null, warning: `Error processing "${loc.name}": ${error.message}` };
  }
}));

const validLocations = processed.filter(p => p.location !== null);
const warnings = processed.map(p => p.warning).filter(Boolean);

// Set status based on results
if (validLocations.length === 0) {
  updateLocationStatus('error');
  updateErrorMessage('Failed to set up location targeting');
} else if (warnings.length > 0) {
  updateLocationStatus('partial-success');
  updateWarnings(warnings);
  // Still save valid locations
} else {
  updateLocationStatus('completed');
}
```

### Solution B: User-Visible Warning Banner

**Add banner to LocationSelectionCanvas:**
```typescript
{locationState.status === 'partial-success' && locationState.warnings && (
  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-900">
          Location targeting set with warnings
        </p>
        <ul className="mt-2 text-sm text-yellow-800 space-y-1">
          {locationState.warnings.map((warning, idx) => (
            <li key={idx}>• {warning}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)}
```

---

## Solution 4: Retry Logic for Failed API Calls

### Problem
Network blips or rate limiting can cause temporary failures.

### Solution: Exponential Backoff Retry

**Add retry wrapper to geocoding.ts:**
```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Retry 5xx errors (server errors)
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error as Error;
    }
    
    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Use in getLocationBoundary:
const response = await fetchWithRetry(
  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=geojson&polygon_geojson=1&limit=1`,
  { headers: { 'User-Agent': 'AdPilot-LocationTargeting/1.0' } },
  3,  // max 3 retries
  1000  // start with 1s delay
);
```

---

## Solution 5: Explicit Location Status Field

### Problem
`location_status` is currently `null` in database (from Toronto record).

### Solution: Always Set Status

**In LocationContext save function:**
```typescript
await updateAdSnapshot({
  location: {
    locations: state.locations,
    status: state.status || 'completed',  // Never save null status
  }
})
```

**In processLocationToolCall:**
```typescript
// Explicitly set status
updateLocationStatus(validLocations.length > 0 ? 'completed' : 'error');
```

---

## Implementation Order

### Phase 1: Critical Fixes (Do First)
1. ✅ **Relax tool call detection** - Remove strict state check
2. ✅ **Add fallback rendering** - BBox rectangle and default circle
3. ✅ **Fix status saving** - Never save null status

### Phase 2: Enhanced UX (Do Second)
4. ⏳ **Add warning status** - Track partial successes
5. ⏳ **Add warning banner** - Show user what failed
6. ⏳ **Add retry logic** - Handle temporary API failures

### Phase 3: Polish (Do Third)
7. ⏳ **Loading spinner** - Visual feedback during processing
8. ⏳ **Better error messages** - Specific, actionable errors
9. ⏳ **Retry button** - Let user manually retry failed locations

---

## Files To Modify

### Critical Path (Phase 1)

1. **`components/ai-chat.tsx`**
   - Line ~845: Remove `state === 'input-available'` check
   - Or change to accept multiple states

2. **`components/location-selection-canvas.tsx`**
   - Lines ~280-320: Add fallback rendering logic
   - Add bbox rectangle rendering
   - Add default circle fallback

3. **`lib/context/location-context.tsx`**
   - Line ~167: Ensure status is never null when saving

### Enhancement Path (Phase 2)

4. **`app/actions/geocoding.ts`**
   - Add `fetchWithRetry` function
   - Use in `getLocationBoundary` and `searchLocations`

5. **`lib/types/location.ts`**
   - Add `'partial-success'` to LocationStatus enum
   - Add `warnings?: string[]` to LocationState

6. **`components/ai-chat.tsx`**
   - Modify `processLocationToolCall` to collect warnings
   - Set `partial-success` status when some locations fail

7. **`components/location-selection-canvas.tsx`**
   - Add warning banner component
   - Display warnings to user

---

## Testing Plan

### Test Cases

1. **Florida (Previously Failed)**
   - Add "Florida" as location
   - Expected: Should now process and display (with fallback if needed)
   - Verify: Console logs show processing, database has record, map shows boundary

2. **Toronto (Previously Worked)**
   - Add "Toronto" as location
   - Expected: Should continue to work perfectly
   - Verify: Full geometry displays, no regressions

3. **Invalid Location**
   - Add "asdfasdf" as location
   - Expected: Error message, no partial state
   - Verify: User sees clear error, can retry

4. **Multiple Locations**
   - Add "Florida, California, Toronto"
   - Expected: All three process and display
   - Verify: Map shows all three, correct colors (include=green)

5. **Network Failure Simulation**
   - Temporarily block Nominatim API
   - Expected: Retry logic attempts 3 times, then fails gracefully
   - Verify: User sees error after ~7 seconds (1s + 2s + 4s retries)

---

## Success Criteria

✅ **Must Have (Phase 1):**
- [ ] Florida successfully geocodes and saves to database
- [ ] Map displays Florida coverage area (geometry, bbox, or circle)
- [ ] LocationCard appears for Florida below map
- [ ] No regressions for Toronto or other working locations
- [ ] Console logs show complete processing flow

✅ **Should Have (Phase 2):**
- [ ] Warnings shown to user when boundary fetch fails
- [ ] Retry logic handles temporary API failures
- [ ] Partial successes saved (some locations work, some fail)

✅ **Nice to Have (Phase 3):**
- [ ] Loading spinner during processing
- [ ] Retry button for failed locations
- [ ] Visual distinction for approximate boundaries (dashed lines)

---

## Rollback Plan

If solution causes regressions:

1. **Immediate:** Revert tool call detection change
2. **Keep:** Fallback rendering (low risk, high value)
3. **Remove:** Retry logic if causing timeouts
4. **Adjust:** Warning messages if confusing users

---

## Next Step

**Implement Phase 1 (Critical Fixes) immediately:**
1. Modify tool call detection in ai-chat.tsx
2. Add fallback rendering in location-selection-canvas.tsx
3. Fix status saving in location-context.tsx
4. Test with Florida
5. Verify no regressions

**Estimated Time:** 30-45 minutes
**Risk Level:** Low (changes are additive, not destructive)

