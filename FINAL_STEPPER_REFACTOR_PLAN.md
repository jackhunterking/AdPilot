# Final Stepper Refactor Plan - Complete Nuclear Architecture

**Created:** November 17, 2025  
**Priority:** CRITICAL  
**Approach:** Clean, Simple, Ad-Isolated Architecture

---

## Goals

1. ✅ Save when user clicks Next (intentional confirmation)
2. ✅ Icons update INSTANTLY (same as Next button)
3. ✅ User returns to last completed step after refresh
4. ✅ Ad ID isolation prevents state conflicts between ads
5. ✅ Remove all unnecessary complexity (auto-save, useMemo, etc.)

---

## Phase 1: Save on Next Click

### Task 1.1: Add Save Logic to handleNext

**File:** `components/campaign-stepper.tsx` (line 234)

**Current:**
```typescript
const handleNext = () => {
  if (canGoNext && !isLastStep) {
    setDirection('forward')
    setCurrentStepIndex(prev => prev + 1)
    window.dispatchEvent(new CustomEvent('stepNavigation', {detail: {direction: 'next'}}))
  }
}
```

**Replace with:**
```typescript
const handleNext = () => {
  if (!canGoNext || isLastStep) return
  
  // Dispatch save event BEFORE navigating (user confirmed completion)
  window.dispatchEvent(new CustomEvent('saveBeforeNext', {
    detail: { 
      stepId: currentStep.id,
      stepIndex: currentStepIndex
    }
  }))
  
  // Navigate to next step
  setDirection('forward')
  setCurrentStepIndex(prev => prev + 1)
  window.dispatchEvent(new CustomEvent('stepNavigation', {detail: {direction: 'next'}}))
}
```

### Task 1.2: Listen for Save Event in PreviewPanel

**File:** `components/preview-panel.tsx` (add after line 125)

**Add new useEffect:**
```typescript
// Save current step when user clicks Next
useEffect(() => {
  const handleSaveBeforeNext = async (event: Event) => {
    const customEvent = event as CustomEvent<{ stepId: string }>
    const stepId = customEvent.detail.stepId
    
    if (!campaign?.id || !currentAd?.id) {
      console.warn('[PreviewPanel] Cannot save - missing campaign or ad ID')
      return
    }
    
    console.log('[PreviewPanel] Saving step on Next click:', stepId, 'for ad:', currentAd.id)
    
    // Build payload based on which step was completed
    const sections: Record<string, unknown> = {}
    
    switch (stepId) {
      case 'ads':
        if (adContent?.imageVariations && selectedImageIndex !== null) {
          sections.creative = {
            imageVariations: adContent.imageVariations,
            selectedImageIndex,
            format: 'feed'
          }
        }
        break
        
      case 'copy':
        if (adCopyState.customCopyVariations && adCopyState.selectedCopyIndex !== null) {
          sections.copy = {
            variations: adCopyState.customCopyVariations.map(v => ({
              headline: v.headline,
              primaryText: v.primaryText,
              description: v.description || '',
              cta: adContent?.cta || 'Learn More'
            })),
            selectedCopyIndex: adCopyState.selectedCopyIndex
          }
        }
        break
        
      case 'location':
        if (locationState.locations.length > 0) {
          sections.location = {
            locations: locationState.locations
          }
        }
        break
        
      case 'destination':
        if (destinationState.data?.type) {
          sections.destination = {
            type: destinationState.data.type,
            data: destinationState.data
          }
        }
        break
    }
    
    if (Object.keys(sections).length === 0) {
      console.log('[PreviewPanel] No data to save for step:', stepId)
      return
    }
    
    // Save to database
    try {
      const response = await fetch(
        `/api/campaigns/${campaign.id}/ads/${currentAd.id}/snapshot`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sections)
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[PreviewPanel] ✅ Step "${stepId}" saved for ad ${currentAd.id}`, {
          completedSteps: data.completed_steps
        })
      } else {
        console.error('[PreviewPanel] Save failed:', await response.text())
      }
    } catch (error) {
      console.error('[PreviewPanel] Save error:', error)
      // Don't block navigation on save failure - data is in local state
    }
  }
  
  window.addEventListener('saveBeforeNext', handleSaveBeforeNext)
  return () => window.removeEventListener('saveBeforeNext', handleSaveBeforeNext)
}, [campaign?.id, currentAd?.id, adContent, selectedImageIndex, adCopyState, locationState, destinationState])
```

### Task 1.3: Remove Auto-Save Hook

**File:** `components/campaign-workspace.tsx` (line ~253)

**DELETE:**
```typescript
useDraftAutoSave(
  campaignId,
  currentAdId,
  isBuilding
)
```

**File:** `lib/hooks/use-draft-auto-save.ts`

**Add deprecation comment at top:**
```typescript
/**
 * @deprecated - Auto-save removed in favor of save-on-Next pattern
 * Kept for reference but not used
 */
```

---

## Phase 2: Fix Stepper Icons (Use Local State)

### Task 2.1: Icons Use step.completed (Same as Next Button)

**File:** `components/campaign-stepper.tsx`

**Line 349 - Change color logic:**
```typescript
// BEFORE:
completedSteps.includes(step.id)
  ? "border-green-500 bg-green-500 text-white"
  : index === currentStepIndex
  ? "border-yellow-500 bg-yellow-500 text-white"
  : "border-muted-foreground/20 bg-muted text-muted-foreground"

// AFTER:
step.completed  // ✅ Same source as Next button
  ? "border-green-500 bg-green-500 text-white"
  : index === currentStepIndex
  ? "border-yellow-500 bg-yellow-500 text-white"
  : "border-muted-foreground/20 bg-muted text-muted-foreground"
```

**Line 356 - Change icon logic:**
```typescript
// BEFORE:
{completedSteps.includes(step.id) ? (
  <Check className="h-4 w-4" />
) : (
  <AlertTriangle className="h-4 w-4" />
)}

// AFTER:
{step.completed ? (  // ✅ Same source as Next button
  <Check className="h-4 w-4" />
) : (
  <AlertTriangle className="h-4 w-4" />
)}
```

### Task 2.2: Remove Unused completedSteps Prop

**File:** `components/campaign-stepper.tsx`

**Line 56 - Delete:**
```typescript
completedSteps?: string[]  // DELETE
```

**Line 59 - Remove parameter:**
```typescript
// BEFORE:
export function CampaignStepper({ steps, campaignId, completedSteps = [] }: CampaignStepperProps)

// AFTER:
export function CampaignStepper({ steps, campaignId }: CampaignStepperProps)
```

**Line 100 - Use local state:**
```typescript
// BEFORE:
const firstIncomplete = steps.findIndex(s => !completedSteps.includes(s.id))

// AFTER:
const firstIncomplete = steps.findIndex(s => !s.completed)
```

**File:** `components/preview-panel.tsx`

**Line 1245 - Delete:**
```typescript
const completedSteps = (currentAd?.completed_steps as string[]) || []  // DELETE
```

**Line 1250 - Remove prop:**
```typescript
// BEFORE:
<CampaignStepper steps={steps} campaignId={campaign?.id} completedSteps={completedSteps} />

// AFTER:
<CampaignStepper steps={steps} campaignId={campaign?.id} />
```

---

## Phase 3: Ad ID Isolation (Prevent State Conflicts)

### Task 3.1: Add Ad ID Tracking to AdPreviewContext

**File:** `lib/context/ad-preview-context.tsx`

**Add after line 46:**
```typescript
const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
const [stateAdId, setStateAdId] = useState<string | null>(null)  // Track which ad owns this state
```

**Update in loadSnapshot (after line 84):**
```typescript
logger.info('AdPreviewContext', `✅ Loaded ${snapshot.creative.imageVariations.length} creatives from backend`)

// Mark this state as belonging to current ad
setStateAdId(currentAd.id)
```

**Add guard wrapper function:**
```typescript
// Add after useState declarations
const setSelectedImageIndexSafe = useCallback((index: number | null) => {
  if (currentAd?.id && currentAd.id !== stateAdId) {
    logger.warn('AdPreviewContext', 'Ignoring update - state belongs to different ad', {
      currentAd: currentAd.id,
      stateAd: stateAdId
    })
    return
  }
  setSelectedImageIndex(index)
}, [currentAd?.id, stateAdId])
```

**Export safe version in context:**
```typescript
return {
  // ...existing
  setSelectedImageIndex: setSelectedImageIndexSafe,  // Use safe version
}
```

### Task 3.2: Add Ad ID Tracking to AdCopyContext

**File:** `lib/context/ad-copy-context.tsx`

**Same pattern:**
```typescript
const [stateAdId, setStateAdId] = useState<string | null>(null)

// In loadCopyFromBackend after line 92:
setStateAdId(currentAd.id)

// Add safe wrapper:
const setSelectedCopyIndexSafe = useCallback((index: number | null) => {
  if (currentAd?.id && currentAd.id !== stateAdId) {
    logger.warn('AdCopyContext', 'Ignoring update - different ad')
    return
  }
  setAdCopyState(prev => ({
    ...prev,
    selectedCopyIndex: index,
    status: index !== null ? "completed" : "idle"
  }))
}, [currentAd?.id, stateAdId])
```

### Task 3.3: Reset State on Ad ID Change

**File:** `lib/context/ad-preview-context.tsx` (line 52)

**Add explicit ad ID change detection:**
```typescript
useEffect(() => {
  if (!currentAd) {
    // Reset when no ad selected
    setSelectedImageIndex(null)
    setStateAdId(null)
    return
  }
  
  // Check if ad ID changed (switching between ads)
  if (stateAdId && currentAd.id !== stateAdId) {
    console.log('[AdPreviewContext] Ad changed, resetting state', {
      oldAd: stateAdId,
      newAd: currentAd.id
    })
    setSelectedImageIndex(null)
    setSelectedCreativeVariation(null)
    setStateAdId(null)
  }
  
  // Load snapshot for this ad
  loadSnapshot()
}, [currentAd?.id, campaign?.id, stateAdId])
```

---

## Phase 4: Restore to Last Completed Step

### Task 4.1: Store Completed Steps in SessionStorage Per Ad

**File:** `components/preview-panel.tsx` (add new useEffect)

**Add after saveBeforeNext listener:**
```typescript
// Track completed steps per ad in sessionStorage
useEffect(() => {
  if (!campaign?.id || !currentAd?.id) return
  
  // Build array of completed steps from local state
  const completed: string[] = []
  if (selectedImageIndex !== null) completed.push('ads')
  if (adCopyState.selectedCopyIndex !== null) completed.push('copy')
  if (locationState.locations.length > 0) completed.push('location')
  if (destinationState.status === "completed") completed.push('destination')
  
  // Store per ad ID
  const key = `ad:${currentAd.id}:completedSteps`
  try {
    sessionStorage.setItem(key, JSON.stringify(completed))
  } catch (error) {
    console.warn('[PreviewPanel] Failed to save completed steps to sessionStorage')
  }
}, [campaign?.id, currentAd?.id, selectedImageIndex, adCopyState.selectedCopyIndex, locationState.locations.length, destinationState.status])
```

### Task 4.2: Restore to Last Completed Step on Mount

**File:** `components/campaign-stepper.tsx` (update lines 69-112)

**Replace restoration logic:**
```typescript
// Auto-jump to first incomplete step or restore last viewed step on mount
useEffect(() => {
  if (hasInitializedRef.current) return

  // If newAd=true, force step 0
  if (isNewAd) {
    console.log('[CampaignStepper] New ad - starting at step 0')
    setCurrentStepIndex(0)
    hasInitializedRef.current = true
    return
  }

  // Restore last viewed step from sessionStorage (specific to this ad via campaignId)
  let restoredIndex: number | null = null
  
  if (campaignId) {
    try {
      // Try campaign-level restore first (which ad within campaign)
      const savedStepId = sessionStorage.getItem(`campaign:${campaignId}:currentStep`)
      if (savedStepId) {
        const savedIndex = steps.findIndex(s => s.id === savedStepId)
        if (savedIndex >= 0) {
          restoredIndex = savedIndex
          console.log('[CampaignStepper] Restored last viewed step:', savedStepId)
        }
      }
    } catch (error) {
      console.warn('[CampaignStepper] Failed to restore step')
    }
  }

  // If no saved step, find first incomplete step from LOCAL state
  if (restoredIndex === null) {
    const firstIncomplete = steps.findIndex(s => !s.completed)
    restoredIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

    console.log('[CampaignStepper] No saved step, using first incomplete from local state', {
      firstIncompleteStep: steps[restoredIndex]?.id,
      targetIndex: restoredIndex,
      completedSteps: steps.filter(s => s.completed).map(s => s.id)
    })
  }

  setCurrentStepIndex(restoredIndex)
  hasInitializedRef.current = true
}, [steps, isNewAd, campaignId])
```

---

## Phase 5: Icon Update (Use Local State)

### Task 5.1: Change Icon Logic to Match Next Button

**File:** `components/campaign-stepper.tsx`

**Line 349 - Color logic:**
```typescript
// BEFORE:
completedSteps.includes(step.id)
  ? "border-green-500 bg-green-500 text-white"
  : ...

// AFTER:
step.completed  // ✅ Same as Next button logic
  ? "border-green-500 bg-green-500 text-white"
  : ...
```

**Line 356 - Icon rendering:**
```typescript
// BEFORE:
{completedSteps.includes(step.id) ? (
  <Check className="h-4 w-4" />
) : (
  <AlertTriangle className="h-4 w-4" />
)}

// AFTER:
{step.completed ? (  // ✅ Same as Next button logic
  <Check className="h-4 w-4" />
) : (
  <AlertTriangle className="h-4 w-4" />
)}
```

### Task 5.2: Remove Unused completedSteps Prop

**File:** `components/campaign-stepper.tsx`

**Line 56 - Delete from interface:**
```typescript
interface CampaignStepperProps {
  steps: Step[]
  campaignId?: string
  // DELETE: completedSteps?: string[]
}
```

**Line 59 - Remove from params:**
```typescript
// BEFORE:
export function CampaignStepper({ steps, campaignId, completedSteps = [] }: CampaignStepperProps)

// AFTER:
export function CampaignStepper({ steps, campaignId }: CampaignStepperProps)
```

**File:** `components/preview-panel.tsx`

**Line 1245 - Delete unused extraction**

**Line 1250 - Remove from prop:**
```typescript
// BEFORE:
<CampaignStepper steps={steps} campaignId={campaign?.id} completedSteps={completedSteps} />

// AFTER:
<CampaignStepper steps={steps} campaignId={campaign?.id} />
```

---

## Phase 6: Ad ID Safety Guards

### Task 6.1: Add Current Ad ID Tracking

**File:** `lib/context/ad-preview-context.tsx`

**Add state variable (line 46):**
```typescript
const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
const [contextAdId, setContextAdId] = useState<string | null>(null)  // Track which ad this context serves
```

**Set on load (line 64, in loadSnapshot):**
```typescript
logger.debug('AdPreviewContext', `Loading state from ad ${currentAd.id}`)
setContextAdId(currentAd.id)  // Mark context as serving this ad
```

**Add reset on ad change (line 52, at top of useEffect):**
```typescript
useEffect(() => {
  // If ad ID changed, reset state immediately
  if (contextAdId && currentAd?.id && currentAd.id !== contextAdId) {
    logger.info('AdPreviewContext', 'Ad changed - resetting context state', {
      oldAd: contextAdId,
      newAd: currentAd.id
    })
    setSelectedImageIndex(null)
    setSelectedCreativeVariation(null)
    setAdContent(null)
    setContextAdId(null)
  }
  
  if (!currentAd) {
    // No ad selected - reset
    setAdContent(null)
    setSelectedImageIndex(null)
    setContextAdId(null)
    return
  }
  
  // Load snapshot...
}, [currentAd?.id, campaign?.id, contextAdId])
```

### Task 6.2: Add Guard to setSelectedImageIndex Calls

**File:** `components/preview-panel.tsx` (handleSelectAd)

**Add safety check:**
```typescript
const handleSelectAd = (index: number) => {
  // Safety: Verify we're working with current ad
  if (!currentAd?.id) {
    console.warn('[PreviewPanel] Cannot select - no current ad')
    return
  }
  
  console.log('[PreviewPanel] Selecting creative for ad:', currentAd.id)
  
  // ... rest of logic
  setSelectedImageIndex(index)
}
```

### Task 6.3: Same Guards for AdCopyContext

**File:** `lib/context/ad-copy-context.tsx`

**Add same pattern:**
- Track `contextAdId`
- Reset on ad change
- Guard wrapper for `setSelectedCopyIndex`

---

## Phase 7: Clean Up & Remove Dead Code

### Task 7.1: Remove Auto-Save Import

**File:** `components/campaign-workspace.tsx`

**Line 31 - Delete:**
```typescript
import { useDraftAutoSave } from "@/lib/hooks/use-draft-auto-save"  // DELETE
```

### Task 7.2: Remove Database completedSteps Dependencies

**File:** `components/preview-panel.tsx`

**Remove any remaining:**
```typescript
// DELETE if exists:
const completedSteps = (currentAd?.completed_steps as string[]) || []
```

Only keep ONE instance needed for database logging (optional).

---

## Complete Flow After Refactor

### User Journey:

```
[User loads ad]
  ↓
CurrentAdContext loads ad (ID: ad-123)
  ↓
AdPreviewContext loads snapshot for ad-123
  ├─ setContextAdId('ad-123')  ← Marks context as serving ad-123
  ├─ setSelectedImageIndex(1)  ← From database if saved
  └─ step.completed = selectedImageIndex !== null = TRUE
  ↓
CampaignStepper initializes
  ├─ Finds first incomplete: steps.findIndex(s => !s.completed)
  ├─ Jumps to that step (or last viewed from sessionStorage)
  └─ Icons: step.completed ? GREEN : YELLOW
  ↓
[User on Creative step, selects variation 2]
  ↓
setSelectedImageIndex(1)  ← Local state update
  ↓
Component re-renders
  ├─ step.completed = TRUE
  ├─ Icon: step.completed ? <Check /> → GREEN ✅
  └─ Next button: !step.completed → ENABLED ✅
  ↓
[User clicks Next]
  ↓
handleNext() dispatches 'saveBeforeNext' event
  ├─ PreviewPanel listens
  ├─ Saves creative section to database (ad-123)
  ├─ Database updates ads.completed_steps = ["ads"]
  └─ Navigation proceeds
  ↓
[User switches to different ad (ad-456)]
  ↓
currentAd changes
  ↓
AdPreviewContext detects: currentAd.id !== contextAdId
  ├─ Resets selectedImageIndex to null  ← Fresh state for ad-456
  ├─ Resets contextAdId to null
  └─ Loads snapshot for ad-456
  ↓
✅ No state contamination between ads
```

---

## File Changes Summary

| File | Task | Lines Changed | Purpose |
|------|------|---------------|---------|
| campaign-stepper.tsx | Save on Next | +3 | Trigger save |
| campaign-stepper.tsx | Icons local state | -4, +4 | Instant green |
| campaign-stepper.tsx | Remove prop | -3 | Cleanup |
| campaign-stepper.tsx | Restore logic | -12, +25 | Use local state |
| preview-panel.tsx | Save listener | +90 | Handle save |
| preview-panel.tsx | Remove completedSteps | -4 | Cleanup |
| campaign-workspace.tsx | Remove auto-save | -5 | Cleanup |
| ad-preview-context.tsx | Ad ID tracking | +35 | Safety |
| ad-preview-context.tsx | Reset on change | +15 | Safety |
| ad-copy-context.tsx | Ad ID tracking | +35 | Safety |
| ad-copy-context.tsx | Reset on change | +15 | Safety |
| use-draft-auto-save.ts | Deprecate | +3 | Mark unused |

**Total:** 9 files, ~+180 lines (safety), -35 lines (cleanup), net +145 lines

---

## Why This Will Work

### ✅ **Save on Next Click**
- User action = save trigger
- Intentional, clear user intent
- No polling, no wasted saves

### ✅ **Icons Update Instantly**
- Icons use `step.completed` (local state)
- Same source as Next button
- No database wait

### ✅ **Ad ID Isolation**
- Each context tracks which ad it serves
- Resets when ad changes
- Prevents state bleeding

### ✅ **Restore to Last Completed**
- Step restoration uses local `step.completed`
- Jumps to first incomplete
- SessionStorage remembers position

---

## Testing Checklist

- [ ] **Test 1:** Select creative → Icon turns green INSTANTLY
- [ ] **Test 2:** Click Next → Save triggers → Can proceed
- [ ] **Test 3:** Refresh → Loads at correct step with data
- [ ] **Test 4:** Switch to different ad → State resets, no conflicts
- [ ] **Test 5:** Complete all steps → All icons green → Can publish

---

**This is the comprehensive, nuclear refactor that solves all issues properly.**

Ready to implement when you switch to agent mode.

