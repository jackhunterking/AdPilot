# Context Refactoring Guide

## Purpose
Transform context providers from "business logic containers" to "thin state holders" that delegate to services.

## Pattern: Before → After

### BEFORE (Monolithic Context)
```typescript
// lib/context/ad-preview-context.tsx (207 lines)
export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const [adContent, setAdContent] = useState<AdContent | null>(null);
  
  // ❌ Business logic mixed with state management
  const generateImageVariations = async (baseImageUrl: string, campaignId?: string) => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ baseImageUrl, campaignId }),
    });
    const data = await response.json();
    setAdContent(data);
  };
  
  return <AdPreviewContext.Provider value={{ adContent, generateImageVariations }}>
    {children}
  </AdPreviewContext.Provider>
}
```

### AFTER (Thin State Holder + Service)
```typescript
// lib/context/ad-preview-context.tsx (80 lines - 61% reduction)
export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const [adContent, setAdContent] = useState<AdContent | null>(null);
  const creativeService = useCreativeService(); // ✅ Inject service
  
  // ✅ Thin wrapper delegating to service
  const generateImageVariations = async (baseImageUrl: string, campaignId?: string) => {
    const result = await creativeService.generateVariations.execute({
      prompt: baseImageUrl,
      campaignId: campaignId || '',
    });
    
    if (result.success && result.data) {
      setAdContent({
        imageVariations: result.data.variations.map(v => v.url),
        baseImageUrl: result.data.baseImageUrl,
      });
    }
  };
  
  return <AdPreviewContext.Provider value={{ adContent, generateImageVariations }}>
    {children}
  </AdPreviewContext.Provider>
}
```

## Refactoring Checklist

For each context provider:

### 1. Identify Business Logic
- [ ] Find all API calls
- [ ] Find all data transformations
- [ ] Find all validation logic
- [ ] Find all external integrations

### 2. Extract to Service
- [ ] Create service method matching the contract
- [ ] Move business logic to service
- [ ] Return ServiceResult<T>
- [ ] Add error handling in service

### 3. Update Context
- [ ] Import service hook (useXService)
- [ ] Replace inline logic with service.execute()
- [ ] Handle ServiceResult in context
- [ ] Update state based on result

### 4. Update Consumers
- [ ] Check all components using the context
- [ ] Verify no breaking API changes
- [ ] Update error handling if needed
- [ ] Test user flows

### 5. Clean Up
- [ ] Remove unused imports
- [ ] Remove commented code
- [ ] Add JSDoc comments
- [ ] Update file header

## Context Priority Order

1. **ad-preview-context.tsx** - Most complex, good starting point
2. **ad-copy-context.tsx** - Similar pattern to ad-preview
3. **location-context.tsx** - Uses targeting-service
4. **destination-context.tsx** - Uses destination-service
5. **budget-context.tsx** - Uses budget-service
6. **goal-context.tsx** - Uses campaign-service
7. **campaign-context.tsx** - Uses campaign-service

## Service Mapping

| Context | Service | Methods to Use |
|---------|---------|----------------|
| ad-preview-context | creative-service | generateVariations, editVariation |
| ad-copy-context | copy-service | generateCopyVariations, editCopy |
| location-context | targeting-service | addLocations, removeLocation |
| destination-context | destination-service | setupDestination |
| budget-context | budget-service | setBudget, setSchedule |
| goal-context | campaign-service | configureGoal |
| campaign-context | campaign-service | updateCampaign |

## Expected Outcomes

- **File Size Reduction:** 40-60% smaller context files
- **Testability:** Services can be mocked for testing
- **Reusability:** Services can be used outside React components
- **Maintainability:** Single responsibility per module
- **Type Safety:** Consistent ServiceResult<T> pattern

## Notes

- Contexts keep their existing API to avoid breaking all consumers
- Internal implementation switches to service delegation
- This is the **thin orchestrator** pattern
- Services are unit-testable independently
- Can be done incrementally, one context at a time

