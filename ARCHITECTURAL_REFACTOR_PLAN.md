# Architectural Refactor Plan - Next Button & Step Completion

**Created:** November 17, 2025  
**Priority:** CRITICAL  
**Approach:** Clean Architecture - Single Source of Truth

---

## Problem Statement

After multiple fixes, Next button still doesn't enable. Console shows:
- ✅ Save completes
- ✅ reloadAd() executes
- ✅ Database updates completed_steps
- ❌ Steps array doesn't re-compute (no log appears)
- ❌ Next button stays disabled

**Root Cause:** The architectural pattern is fundamentally flawed. We're fighting React's optimization instead of working with it.

---

## The Three Fundamental Problems

### Problem 1: Over-Optimization with useMemo

**Current Issue:**
```typescript
const steps = useMemo(() => {
  // ... 50 lines of step definitions
}, [currentAd, allStepsComplete, adsContent, launchContent])
```

**Why It Fails:**
- useMemo is a **micro-optimization** for expensive computations
- Creating a 5-item array is NOT expensive (microseconds)
- React's dependency tracking is NOT reliable for object references
- The "optimization" costs more than it saves (debugging time, code complexity)

**Lean Solution: Remove useMemo Entirely**
```typescript
// Just compute on every render - simple and reliable
const completedSteps = (currentAd?.completed_steps as string[]) || []
const steps = [
  {id: "ads", completed: completedSteps.includes("ads"), ...},
  // ... 4 more steps
]
```

**Benefits:**
- ✅ Always up-to-date (no dependency tracking issues)
- ✅ Simpler code (no useMemo complexity)
- ✅ Negligible performance cost (5 objects)
- ✅ Guaranteed to work

### Problem 2: Immediate Save + Auto-Save Conflict

**Current Issue:**
- Two separate save mechanisms
- `handleSelectAd()` in preview-panel.tsx (immediate)
- `useDraftAutoSave` hook (15-second interval)
- Both call `reloadAd()` but might conflict

**Lean Solution: One Save Path Only**
```typescript
// Remove immediate save from Select button
// Rely ONLY on auto-save (simpler, more predictable)
// OR make immediate save update local state only (no backend call)
```

### Problem 3: currentAd Object Not Changing Reference

**Current Issue:**
```typescript
// Line 144 in current-ad-context.tsx
setCurrentAd(data.ad)  // Sets to new object
```

**But if `data.ad` has same values, React might optimize away the update!**

**Lean Solution: Force New Reference**
```typescript
setCurrentAd({...data.ad})  // Spread creates guaranteed new reference
// OR
setCurrentAd(prev => ({...data.ad}))  // Functional update
```

---

## The Lean Architectural Refactor

### Principle: Simplicity Over Optimization

**Remove ALL premature optimizations:**
1. ❌ Remove useMemo from steps array
2. ❌ Remove useMemo from allStepsComplete  
3. ❌ Remove dual save mechanisms
4. ✅ Compute everything on every render
5. ✅ Single save path
6. ✅ Direct database queries

**Why This Is Lean:**
- Fewer moving parts = fewer bugs
- Easier to reason about = faster development
- Performance impact = negligible (modern React handles this)

---

## Implementation Plan

### Phase 1: Remove useMemo Optimizations

**File:** `components/preview-panel.tsx`

**Remove ALL useMemo wrappers:**

```typescript
// BEFORE (Complex):
const allStepsComplete = useMemo(() => {
  const completedSteps = (currentAd?.completed_steps as string[]) || []
  return completedSteps.includes("ads") && ...
}, [currentAd?.completed_steps, ...])

const steps = useMemo(() => {
  const completedSteps = (currentAd?.completed_steps as string[]) || []
  return [...]
}, [currentAd, ...])

// AFTER (Simple):
const completedSteps = (currentAd?.completed_steps as string[]) || []

const allStepsComplete = 
  completedSteps.includes("ads") &&
  completedSteps.includes("copy") &&
  completedSteps.includes("destination") &&
  completedSteps.includes("location") &&
  isMetaConnectionComplete &&
  hasPaymentMethod &&
  isComplete()

const steps = [
  {id: "ads", completed: completedSteps.includes("ads"), content: adsContent, ...},
  {id: "copy", completed: completedSteps.includes("copy"), content: <AdCopySelectionCanvas />, ...},
  {id: "location", completed: completedSteps.includes("location"), content: <LocationSelectionCanvas />, ...},
  {id: "destination", completed: completedSteps.includes("destination"), content: <DestinationSetupCanvas />, ...},
  {id: "budget", completed: allStepsComplete, content: launchContent, ...},
]
```

**Result:** Steps always fresh, no dependency issues

### Phase 2: Force currentAd Reference Change

**File:** `lib/context/current-ad-context.tsx` (line 144)

**Current:**
```typescript
setCurrentAd(data.ad)
```

**Fixed:**
```typescript
// Force new object reference to trigger React re-renders
setCurrentAd({...data.ad, _reloaded: Date.now()})
```

### Phase 3: Consolidate Save Logic

**Remove duplicate immediate save, use auto-save only:**

**File:** `components/preview-panel.tsx` (handleSelectAd function)

**Current:** Calls `/snapshot` API immediately + auto-save later

**Lean:** Just update local state, let auto-save handle backend:
```typescript
const handleSelectAd = async (index: number) => {
  // Just update local state - auto-save will sync to backend
  setSelectedImageIndex(index)
  setSelectedCreativeVariation(variations[index])
  
  // No immediate backend call = simpler, faster UX
  // Auto-save (15s) handles persistence
}
```

### Phase 4: Add Force Update Trigger (Fallback)

**If React still doesn't re-render:**

```typescript
const [updateTrigger, setUpdateTrigger] = useState(0)

const handleSelectAd = async (index: number) => {
  setSelectedImageIndex(index)
  // ... save logic ...
  await reloadAd()
  setUpdateTrigger(prev => prev + 1)  // Force re-render
}

// In render:
const completedSteps = (currentAd?.completed_steps as string[]) || []
const _trigger = updateTrigger  // Reference forces re-computation
const steps = [...] // Always fresh
```

### Phase 5: Verify Step Completion Calculation

**File:** `app/api/campaigns/[id]/ads/[adId]/snapshot/route.ts`

Ensure `calculateCompletedSteps()` properly checks:
```typescript
// Creative step: MUST have creatives AND selected one
if (snapshot.creative?.imageVariations?.length > 0 && 
    snapshot.creative.selectedImageIndex != null && 
    snapshot.creative.selectedImageIndex >= 0) {
  completedSteps.push('ads')
}
```

---

## Recommended Implementation Order

### Option A: Nuclear Option (Simplest, Most Reliable)

1. Remove ALL useMemo from preview-panel.tsx
2. Remove immediate save logic
3. Rely ONLY on auto-save
4. Force currentAd reference change in reload

**Pros:**
- Guaranteed to work
- Simplest code
- Easiest to maintain

**Cons:**
- 15-second delay before save
- Re-renders more often (negligible cost)

### Option B: Hybrid (Keep Immediate Save, Remove useMemo)

1. Remove useMemo optimizations
2. Keep immediate save
3. Force reference change
4. Add update trigger

**Pros:**
- Immediate feedback
- Still simple

**Cons:**
- Dual save paths (more complexity)

---

## My Recommendation: Option A (Nuclear)

**Remove these:**
- ❌ useMemo for steps
- ❌ useMemo for allStepsComplete
- ❌ Immediate save on Select click
- ❌ All React "optimizations"

**Keep these:**
- ✅ Auto-save (15-second interval)
- ✅ Database as single source of truth
- ✅ Direct computation on every render

**Why:**
- Modern React re-renders 1000x/sec anyway
- Creating 5-item array = 0.001ms
- useMemo overhead > computation cost
- Debugging time > microseconds saved
- Simple code > clever code

---

## Success Criteria

After refactor:
- [ ] No useMemo in step computation
- [ ] Steps array always reflects currentAd.completed_steps
- [ ] Next button enables immediately after currentAd updates
- [ ] No React dependency tracking issues
- [ ] Code is simple and understandable

---

## Testing Plan

1. Remove useMemo
2. Deploy
3. Select creative
4. Wait 15 seconds (auto-save)
5. Verify Next button enables
6. If works → Done
7. If doesn't work → Add force update trigger

---

This plan eliminates complexity instead of adding more patches. Should I implement Option A (nuclear - simplest) or Option B (hybrid)?

