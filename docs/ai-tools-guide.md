# AI Tools Development Guide

**Version:** 2.0 - Granular Microservice Architecture  
**Last Updated:** November 17, 2025

---

## Overview

AdPilot uses a microservice-style granular tool architecture where each AI tool performs ONE specific operation. This design provides clarity, testability, and scalability.

---

## Tool Patterns

### **Pattern A: Confirmation Required (NO execute)**

**Used for:** Expensive operations, resource creation, irreversible actions

**Characteristics:**
- No `execute` function in tool definition
- Tool remains in `state: 'input-available'` 
- Client shows confirmation card before processing
- User must explicitly approve
- Client handles execution and calls `addToolResult`

**Example Tools:**
- `generateVariationsTool` - Creates 3 images (expensive)
- `addLocationsTool` - Geocodes locations (3 API calls per location)
- `createAdTool` - Creates new resource
- `clearLocationsTool` - Destructive operation

**Flow:**
```
AI calls tool → tool-call part created (state: input-available)
    ↓
Client renders confirmation card
    ↓
User clicks "Confirm"
    ↓
Client executes operation
    ↓
Client calls addToolResult(output)
    ↓
Tool transitions to output-available
```

### **Pattern B: Direct Execution (HAS execute)**

**Used for:** Cheap operations, reversible actions, simple data modifications

**Characteristics:**
- Has `execute` function in tool definition
- Executes immediately on server when AI calls it
- No confirmation needed
- Returns result directly
- Tool goes straight to `state: 'output-available'`

**Example Tools:**
- `selectVariationTool` - Simple index selection
- `removeLocationTool` - Array filter operation
- `editCopyTool` - Text generation (fast LLM call)
- `refineHeadlineTool` - Focused text edit

**Flow:**
```
AI calls tool → execute runs on server
    ↓
Returns result immediately
    ↓
Tool part created (state: output-available)
    ↓
Client renders success
```

---

## Tool Organization

### **Directory Structure**

```
lib/ai/tools/
├── creative/          # Image/visual operations
│   ├── generate-variations-tool.ts
│   ├── select-variation-tool.ts
│   ├── edit-variation-tool.ts
│   ├── regenerate-variation-tool.ts
│   ├── delete-variation-tool.ts
│   └── index.ts
├── copy/              # Ad copy operations
│   ├── generate-copy-variations-tool.ts
│   ├── select-copy-variation-tool.ts
│   ├── edit-copy-tool.ts
│   ├── refine-headline-tool.ts
│   ├── refine-primary-text-tool.ts
│   ├── refine-description-tool.ts
│   └── index.ts
├── targeting/         # Location/audience targeting
│   ├── add-locations-tool.ts
│   ├── remove-location-tool.ts
│   ├── clear-locations-tool.ts
│   └── index.ts
├── campaign/          # Campaign/ad management
│   ├── create-ad-tool.ts
│   ├── rename-ad-tool.ts
│   ├── duplicate-ad-tool.ts
│   ├── delete-ad-tool.ts
│   └── index.ts
├── goal/              # Campaign objectives
│   ├── setup-goal-tool.ts
│   └── index.ts
└── index.ts           # Master export with aliases
```

---

## Creating a New Tool

### **Step-by-Step Guide**

#### **1. Choose Tool Pattern**

Ask yourself:
- Is this expensive (>500ms)? → Pattern A (NO execute)
- Does it create new resources? → Pattern A (NO execute)
- Is it destructive/irreversible? → Pattern A (NO execute)
- Is it cheap and reversible? → Pattern B (HAS execute)

#### **2. Choose Category**

- Visual/image operations → `creative/`
- Text/copy operations → `copy/`
- Geographic/audience → `targeting/`
- Ad/campaign management → `campaign/`
- Campaign setup → `goal/`

#### **3. Name Your Tool**

Follow the pattern: `[verb][Noun]Tool`

**Approved verbs:**
- `generate` - Create multiple (generateVariations)
- `create` - Create single (createAd)
- `select` - Choose from options (selectVariation)
- `edit` - Modify extensively (editVariation)
- `refine` - Minor tweaks (refineHeadline)
- `regenerate` - Recreate fresh (regenerateVariation)
- `add` - Add to collection (addLocations)
- `remove` - Delete from collection (removeLocation)
- `delete` - Permanent removal (deleteAd)
- `clear` - Remove all (clearLocations)
- `set` - Assign value (setRadius)
- `rename` - Change name (renameAd)
- `duplicate` - Copy (duplicateAd)

#### **4. Create Tool File**

**Template for Pattern A (NO execute):**

```typescript
/**
 * Feature: [Tool Name]
 * Purpose: [What it does]
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const myNewTool = tool({
  description: 'Clear description of what this tool does and when to use it.',
  
  inputSchema: z.object({
    param1: z.string().describe('What this parameter is for'),
    param2: z.number().optional().describe('Optional parameter'),
  }),
  
  // NO execute function - client handles confirmation and execution
});
```

**Template for Pattern B (HAS execute):**

```typescript
/**
 * Feature: [Tool Name]
 * Purpose: [What it does]
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const myNewTool = tool({
  description: 'Clear description with usage examples.',
  
  inputSchema: z.object({
    param1: z.string().describe('Required parameter'),
  }),
  
  execute: async ({ param1 }) => {
    console.log('[myNewTool] Executing with:', param1);
    
    try {
      // Perform operation
      const result = await doSomething(param1);
      
      return {
        success: true,
        data: result,
        message: `Operation completed for ${param1}`,
      };
    } catch (error) {
      console.error('[myNewTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      };
    }
  },
});
```

#### **5. Export from Category Index**

Add to `lib/ai/tools/[category]/index.ts`:

```typescript
export { myNewTool } from './my-new-tool';
```

#### **6. Register in API**

Add to `app/api/chat/route.ts` in the `tools` object:

```typescript
const tools = {
  // ... existing tools ...
  myNew: categoryTools.myNewTool,
};
```

#### **7. Add to System Prompt**

Update the tool guide section in `app/api/chat/route.ts`:

```
### **[Category] Operations**
- **myNew**: What it does [DIRECT or NEEDS CONFIRMATION]
  - Use when: Specific use case
  - Example: myNew({param1: "value"})
```

#### **8. Create Confirmation Card (if Pattern A)**

Create in `components/ai-elements/`:

```typescript
export function MyNewConfirmationCard({ ... }) {
  return (
    <ToolConfirmationCard
      icon={MyIcon}
      iconColor="text-blue-600"
      iconBgColor="bg-blue-600/10"
      title="Confirm Operation?"
      items={[...]}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
```

#### **9. Add Client Handler (if Pattern A)**

In `components/ai-chat.tsx`, add case for your tool in the rendering switch.

#### **10. Write Tests**

Create `tests/ai/tools/[category]/my-new-tool.test.ts`:

```typescript
describe('myNewTool', () => {
  it('validates input schema', () => {
    // Test zod validation
  });
  
  it('executes correctly', async () => {
    // Test execution (if Pattern B)
  });
  
  it('handles errors gracefully', async () => {
    // Test error cases
  });
});
```

---

## Tool Naming Conventions

### **Good Names** ✅
- `generateVariationsTool` - Clear verb + plural noun
- `selectVariationTool` - Action + singular noun
- `addLocationsTool` - Add to collection (plural)
- `removeLocationTool` - Remove from collection (singular)
- `refineHeadlineTool` - Specific field operation
- `editCopyTool` - Broad operation on entity

### **Bad Names** ❌
- `locationTool` - No verb, unclear
- `imageTool` - Too vague
- `toolForLocations` - Wrong format
- `handleLocation` - Not a tool name pattern
- `locationTargetingTool` - Verb unclear (target? set? add?)

---

## Testing Strategy

### **Unit Tests**

Test each tool in isolation:

```typescript
import { myNewTool } from '@/lib/ai/tools/category/my-new-tool';

describe('myNewTool', () => {
  it('has correct schema', () => {
    expect(myNewTool.inputSchema).toBeDefined();
  });
  
  it('executes with valid input', async () => {
    const result = await myNewTool.execute?.({ param1: 'test' });
    expect(result.success).toBe(true);
  });
});
```

### **Integration Tests**

Test tool composition:

```typescript
it('complete ad creation flow', async () => {
  // 1. createAd
  // 2. generateVariations
  // 3. selectVariation (index: 0)
  // 4. generateCopyVariations
  // 5. selectCopyVariation (index: 1)
  // 6. addLocations
  // Verify all data persists
});
```

---

## Common Patterns

### **Location-Aware Tools**

Tools that need current ad/campaign context:

```typescript
inputSchema: z.object({
  // ... other params ...
  campaignId: z.string().describe('Campaign ID from context'),
  adId: z.string().optional().describe('Ad ID if applicable'),
})
```

### **Variation-Aware Tools**

Tools that operate on specific variations:

```typescript
inputSchema: z.object({
  variationIndex: z.number().min(0).max(2).describe('Which variation (0-2)'),
  // ... other params ...
})
```

### **Error Handling Pattern**

All tools with execute functions should handle errors gracefully:

```typescript
execute: async (input) => {
  try {
    // Operation
    return { success: true, ...result };
  } catch (error) {
    console.error('[toolName] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Operation failed',
    };
  }
}
```

---

## Migration Checklist

When adding a new tool or refactoring existing:

- [ ] Tool file created in correct category folder
- [ ] Follow naming convention (`[verb][Noun]Tool`)
- [ ] Choose correct pattern (A or B)
- [ ] Input schema uses `.describe()` for all fields
- [ ] Execute function has error handling (if Pattern B)
- [ ] Exported from category index.ts
- [ ] Registered in app/api/chat/route.ts
- [ ] Added to system prompt tool guide
- [ ] Confirmation card created (if Pattern A)
- [ ] Client handler added (if Pattern A)
- [ ] Tests written
- [ ] Documentation updated

---

## Tool Composition Examples

### **Example 1: Complete Creative Flow**

```
User: "create new ad"
AI: calls createAd → confirmation → confirmed
AI: "Generate creatives?"  
User: "yes"
AI: calls generateVariations → 3 images created
User: "use variation 2"
AI: calls selectVariation({variationIndex: 1}) → selected
User: "make headline punchier"
AI: calls refineHeadline({...}) → headline updated
```

### **Example 2: Location Targeting**

```
User: "target Toronto and exclude New York"
AI: calls addLocations({
  locations: [
    {name: "Toronto", type: "city", mode: "include"},
    {name: "New York", type: "city", mode: "exclude"}
  ]
}) → confirmation → confirmed → geocoding → map updates
User: "actually remove New York"
AI: calls removeLocation({locationName: "New York"}) → removed directly
```

### **Example 3: Copy Refinement**

```
User: "make headline shorter"
AI: calls refineHeadline({...}) → quick edit
User: "now make primary text more professional"
AI: calls refinePrimaryText({...}) → quick edit
User: "actually rewrite everything"
AI: calls editCopy({...}) → complete rewrite
```

---

## Benefits of Granular Architecture

### **1. Clarity**
- Each tool name clearly indicates its purpose
- AI understands intent better
- Users see exactly what will happen

### **2. Performance**
- Granular tools are faster (refineHeadline vs editCopy)
- Only execute what's needed
- Reduced token usage

### **3. Testability**
- Each tool tested in isolation
- Easier to debug failures
- Clear responsibility boundaries

### **4. Scalability**
- Easy to add new capabilities
- No modification of existing tools
- Minimal regression risk

### **5. Composability**
- Tools can be chained naturally
- AI can build complex workflows
- Each step is explicit

---

## Future Roadmap

### **Planned Tool Categories**

**Audience Targeting:**
- `setAudienceDemographicsTool`
- `setAudienceInterestsTool`
- `removeAudienceSegmentTool`

**Budget:**
- `setBudgetTool`
- `adjustDailyBudgetTool`

**Scheduling:**
- `setScheduleTool`
- `extendScheduleTool`

**Creative Formats:**
- `generateStoryVariationsTool`
- `generateReelVariationsTool`

---

## Troubleshooting

### **Tool Not Being Called**

1. Check tool is registered in `app/api/chat/route.ts`
2. Verify tool name matches in system prompt
3. Check description is clear for AI
4. Ensure step-aware rules allow tool on current step

### **Confirmation Not Showing**

1. Verify tool has NO execute function
2. Check client handler exists in `components/ai-chat.tsx`
3. Ensure no automatic processing useEffect bypasses confirmation

### **Tool Fails Silently**

1. Add comprehensive logging in execute function
2. Check error handling returns proper structure
3. Verify input validation in schema

---

## Best Practices

1. **One Responsibility:** Each tool does ONE thing
2. **Clear Names:** Verb + noun, no ambiguity
3. **Rich Descriptions:** Help AI understand when to use
4. **Type Safety:** Use strict Zod schemas
5. **Error Handling:** Always catch and return errors
6. **Logging:** Console.log all operations
7. **Testing:** Unit test every tool
8. **Documentation:** Keep this guide updated

---

## References

- AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- AI SDK Streaming: https://ai-sdk.dev/docs/ai-sdk-core/streaming
- Vercel AI Gateway: https://vercel.com/docs/ai-gateway
- Supabase: https://supabase.com/docs

