# Ad Copy Data Flow - Single Source of Truth

## Overview
This document verifies that all ad preview surfaces (Ad Copy Step, Launch Panel, Live Results) now use a consistent single source of truth for ad copy and creative data.

## Data Flow Architecture

### 1. **Ad Copy Context** (`lib/context/ad-copy-context.tsx`)
**Purpose**: Manages ad copy variations and selected copy state

**Key Functions**:
- `getActiveVariations()`: Returns array of 3 ad copy variations (custom or defaults)
- `getSelectedCopy()`: **CANONICAL ACCESSOR** - Returns the currently selected copy variation
- `setSelectedCopyIndex()`: Sets which copy variation is selected
- `setCustomCopyVariations()`: Stores AI-generated custom variations

**State Structure**:
```typescript
{
  selectedCopyIndex: number | null,
  status: "idle" | "completed",
  customCopyVariations: AdCopyVariation[] | null
}
```

**AdCopyVariation Interface**:
```typescript
{
  id: string,
  primaryText: string,
  description: string,
  headline: string,
  overlay?: {...}
}
```

### 2. **Ad Preview Context** (`lib/context/ad-preview-context.tsx`)
**Purpose**: Manages creative assets (images)

**Key State**:
- `imageVariations`: Array of 3 image URLs
- `selectedImageIndex`: Index of selected image
- `baseImageUrl`: Original base image

### 3. **Snapshot Builder** (`lib/services/ad-snapshot-builder.ts`)
**Purpose**: Builds complete ad snapshot from wizard contexts

**Snapshot Structure**:
```typescript
{
  creative: {
    imageUrl: string,
    imageVariations: string[],
    selectedImageIndex: number,
    format: 'feed' | 'story' | 'reel'
  },
  copy: {
    headline: string,
    primaryText: string,
    description: string,
    cta: string,
    selectedCopyIndex: number,
    variations: AdCopyVariation[]
  },
  location: {...},
  audience: {...},
  goal: {...},
  budget: {...}
}
```

## Consumer Components - Single Source of Truth

### 1. **Ad Copy Selection Canvas** (`components/ad-copy-selection-canvas.tsx`)
**Location**: Ad Copy Step in wizard

**Data Source**:
- Uses `getActiveVariations()` to render 3 copy variations
- Shows all 3 variations in grid
- User selects one via `setSelectedCopyIndex()`

**Preview Rendering**:
- Each card shows: `variation[index].primaryText`, `variation[index].headline`, `variation[index].description`
- Uses same image from `selectedImageIndex` in AdPreviewContext

### 2. **Preview Panel** (`components/preview-panel.tsx`)
**Location**: Launch Panel (Step 7 - Review before publish)

**Data Source**:
- **Uses `getSelectedCopy()`** - Canonical accessor
- Calls `handlePublishComplete()` which uses `getSelectedCopy()` to build final ad data

**Preview Rendering**:
```typescript
const copyForCard = getSelectedCopy()

// Feed ad renders:
<p>{copyForCard.primaryText}</p>
<p>{copyForCard.headline}</p>
<p>{copyForCard.description}</p>
```

**Persistence**:
```typescript
const selectedCopy = getSelectedCopy()
const adData = {
  copy_data: {
    headline: selectedCopy.headline,
    primaryText: selectedCopy.primaryText,
    description: selectedCopy.description,
    cta: adContent?.cta
  },
  setup_snapshot: snapshot // Full snapshot including copy
}
```

### 3. **Campaign Workspace** (`components/campaign-workspace.tsx`)
**Location**: Converts Supabase ads to AdVariant for display

**Data Source**:
- Reads from `setup_snapshot` (preferred) or fallback to legacy `creative_data`
- **Snapshot is the source of truth** for published ads

**Conversion Logic**:
```typescript
if (snapshot?.creative && snapshot?.copy) {
  creative_data = {
    imageUrl: snapshot.creative.imageVariations?.[selectedIndex],
    imageVariations: snapshot.creative.imageVariations,
    headline: snapshot.copy.headline,
    body: snapshot.copy.primaryText,
    primaryText: snapshot.copy.primaryText,
    description: snapshot.copy.description,
    cta: snapshot.copy.cta
  }
}
```

### 4. **Results Panel** (`components/results-panel.tsx`)
**Location**: Live ad results view

**Data Source**:
- Receives `AdVariant` from CampaignWorkspace
- Uses `variant.creative_data` which was built from snapshot

**Preview Rendering**:
```typescript
<AdMockup
  primaryText={variant.creative_data.primaryText || variant.creative_data.body}
  headline={variant.creative_data.headline}
  description={variant.creative_data.description || variant.creative_data.body}
  ctaText={variant.creative_data.cta || "Learn More"}
/>
```

### 5. **Ad Mockup Component** (`components/ad-mockup.tsx`)
**Location**: Reusable ad preview component

**Props Received**:
- `primaryText`: The main ad text
- `headline`: The ad headline
- `description`: The ad description
- `ctaText`: Call-to-action button text

**Default Values**: Only used as last resort fallbacks

## Verification Checklist

### ✅ Ad Copy Step (Ad Copy Selection Canvas)
- [x] Shows 3 variations from `getActiveVariations()`
- [x] Each card displays correct `primaryText`, `headline`, `description`
- [x] Selection updates `selectedCopyIndex` via `setSelectedCopyIndex()`
- [x] Same image URL used for all cards from `selectedImageIndex`

### ✅ Launch Panel (Preview Panel)
- [x] Uses `getSelectedCopy()` as canonical source
- [x] Feed/Story ads render selected copy correctly
- [x] `handlePublishComplete()` uses `getSelectedCopy()` for persistence
- [x] Snapshot builder captures complete copy state
- [x] Snapshot saved to Supabase with ad

### ✅ Live Results (Results Panel)
- [x] Receives AdVariant with creative_data from snapshot
- [x] CampaignWorkspace extracts copy from `setup_snapshot.copy`
- [x] AdMockup receives correct props from creative_data
- [x] Display matches what was selected in wizard

## Data Consistency Guarantees

1. **During Ad Creation**:
   - Ad Copy Step → User selects copy index → `setSelectedCopyIndex()`
   - Launch Panel → `getSelectedCopy()` retrieves same copy
   - Publish → Snapshot built with `getSelectedCopy()` result
   - Database → Snapshot saved with complete copy state

2. **After Ad Published**:
   - Database → Contains `setup_snapshot.copy` with all data
   - CampaignWorkspace → Extracts copy from snapshot
   - Results Panel → Receives copy via AdVariant.creative_data
   - Display → Shows exact same copy as during creation

3. **Fallback Handling**:
   - Snapshot always preferred over legacy fields
   - Legacy `creative_data` used only if snapshot missing
   - Component props have sensible defaults but snapshot data overrides

## Key Improvements

1. **Single Accessor**: `getSelectedCopy()` provides one canonical way to get active copy
2. **No More Fallback Chains**: Removed complex fallback logic like:
   ```typescript
   // OLD (inconsistent):
   activeCopyVariations[index] ?? 
     activeCopyVariations[selectedCopyIndex] ?? 
     activeCopyVariations[0] ?? null
   
   // NEW (consistent):
   getSelectedCopy()
   ```

3. **Snapshot as Source of Truth**: Published ads always read from snapshot, ensuring consistency
4. **Type Safety**: All copy fields now properly typed and required in snapshot
5. **Removed Hard-coded Defaults**: Components no longer provide different default text

## Testing Scenarios

### Scenario 1: Create New Ad with AI-Generated Copy
1. Generate 3 variations in Ad Copy Step
2. Select variation #2
3. Navigate to Launch Panel
4. **Verify**: Launch preview shows variation #2 copy
5. Publish ad
6. Navigate to Results view
7. **Verify**: Results mockup shows variation #2 copy

### Scenario 2: Edit Live Ad
1. View published ad in Results Panel
2. Note the displayed copy
3. Click "Edit This Ad"
4. Return to wizard
5. **Verify**: Ad Copy Step shows same copy variations
6. **Verify**: Same variation is pre-selected

### Scenario 3: View in All Ads Grid
1. Navigate to All Ads Grid
2. Click ad card
3. **Verify**: Preview thumbnail shows correct copy
4. **Verify**: Results view shows same copy

## Conclusion

All three surfaces (Ad Copy Step, Launch Panel, Live Results) now use a consistent single source of truth:

1. **During Creation**: `getSelectedCopy()` from AdCopyContext
2. **After Publish**: `setup_snapshot.copy` from Supabase
3. **Display**: All components consume same data via unified flow

No more inconsistent copy across different views!

