# AdPilot Journey Architecture Documentation

**Version**: 1.0  
**Last Updated**: November 18, 2025  
**Status**: Production Ready

---

## Overview

AdPilot uses a **journey-based microservices architecture** for AI chat functionality. Each user journey (location targeting, creative generation, copy editing, etc.) is an independent service module with clear boundaries and contracts.

---

## Microservices Principles Applied

### 1. Single Responsibility
Each journey module handles ONE user workflow:
- **Location Journey**: Location targeting (include/exclude)
- **Creative Journey**: Image generation and editing
- **Copy Journey**: Ad copy editing
- **Goal Journey**: Campaign goal setup
- **Campaign Journey**: Ad creation and management

### 2. Clear Service Boundaries
```
Journey Module
├── OWNS: Tool rendering, state management, metadata
├── DEPENDS ON: Context providers (via dependency injection)
├── COMMUNICATES VIA: Browser events
└── EXPOSES: Journey interface contract
```

### 3. Event-Driven Communication
Journeys communicate via browser events:
- `locationUpdated` - Location added/excluded
- `locationRemoved` - Location deleted
- `locationsCleared` - All locations cleared
- `imageEdited` - Image variation updated
- `copyEdited` - Ad copy updated

### 4. Contract-Based Integration
All journeys implement the `Journey` interface:

```typescript
export interface Journey {
  renderTool: (part: ToolPart) => React.ReactNode;
  buildMetadata?: (input: string) => Record<string, unknown>;
  reset?: () => void;
  mode?: 'include' | 'exclude';  // Journey-specific
  isActive?: boolean;
}
```

---

## Directory Structure

```
components/chat/
├── chat-container.tsx              # Orchestrator (104 lines)
├── message-renderer.tsx            # Routing (48 lines)
│
├── journeys/                       # Independent services
│   ├── location/
│   │   ├── location-journey.tsx    # Rendering service
│   │   ├── use-location-mode.ts    # Mode state
│   │   └── location-metadata.ts    # Metadata builder
│   ├── creative/
│   │   └── creative-journey.tsx    # Image operations
│   ├── copy/
│   │   └── copy-journey.tsx        # Copy editing
│   ├── goal/
│   │   └── goal-journey.tsx        # Goal setup
│   └── campaign/
│       └── campaign-journey.tsx    # Ad management
│
├── hooks/
│   ├── use-journey-router.ts       # Route to journeys
│   └── use-metadata-builder.ts     # Build metadata
│
└── types/
    ├── journey-types.ts            # Journey contracts
    ├── chat-types.ts               # Chat interfaces
    └── metadata-types.ts           # Metadata types
```

---

## Journey Service Pattern

### Template for New Journey

```typescript
/**
 * Feature: [Journey Name] Journey
 * Purpose: [What this journey handles]
 * Microservices: Self-contained [domain] service
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

"use client";

import React from 'react';
import type { Journey, ToolPart } from '@/components/chat/types/journey-types';

export function [JourneyName]Journey(): Journey {
  // 1. Journey-specific state (if needed)
  const [state, setState] = useState(...);
  
  // 2. Tool rendering logic
  const renderTool = (part: ToolPart): React.ReactNode => {
    if (part.type !== 'tool-[toolName]') {
      return null;
    }
    
    switch (part.state) {
      case 'input-available':
        return <LoadingState />;
      case 'output-available':
        return <SuccessState output={part.output} />;
      case 'output-error':
        return <ErrorState error={part.errorText} />;
      default:
        return null;
    }
  };
  
  // 3. Metadata builder (optional)
  const buildMetadata = (input: string) => {
    return {
      // Journey-specific metadata
    };
  };
  
  // 4. Return Journey interface
  return {
    renderTool,
    buildMetadata,
    // ... journey-specific exports
  };
}
```

---

## Location Journey (Reference Implementation)

### Responsibility
- Handle location targeting setup (include/exclude)
- Track mode state (include vs exclude)
- Build location metadata for AI
- Render location tool results

### Dependencies
- `LocationContext` - Location state management
- `PreviewPanel` - Event listener for database saves
- `location-tool-renderers.tsx` - Render utilities

### Events
**Emitted** (by AI chat after tool execution):
- `locationUpdated` - New locations added/excluded

**Consumed** (by PreviewPanel):
- `locationUpdated` → Save to database
- `locationRemoved` → Delete from database
- `locationsCleared` → Clear all from database

### API Contracts

**Input** (from button click):
```typescript
CustomEvent<{ mode: 'include' | 'exclude' }>
```

**Output** (metadata to AI):
```typescript
{
  locationSetupMode: true,
  locationMode: 'include' | 'exclude',
  locationInput: string
}
```

### Database
**Table**: `ad_target_locations`  
**Writes**: Via PreviewPanel event listeners  
**Reads**: Via LocationContext on mount

### Testing
Run: `npm test tests/journeys/location-journey.test.ts`

---

## Creative Journey

### Responsibility
- Handle image generation (3 variations)
- Handle image editing (single variation)
- Handle image regeneration

### Tools Handled
- `tool-generateVariations`
- `tool-editVariation`
- `tool-regenerateVariation`

### Events
**Emitted**:
- `imageEdited` - Image variation updated

**Consumed**:
- `imageEdited` → PreviewPanel updates ad content

---

## Copy Journey

### Responsibility
- Handle ad copy editing

### Tools Handled
- `tool-editCopy`

### Events
**Emitted**:
- `copyEdited` (future)

---

## Goal Journey

### Responsibility
- Handle campaign goal setup

### Tools Handled
- `tool-setupGoal`

---

## Campaign Journey

### Responsibility
- Handle ad creation
- Handle ad deletion (future)
- Handle ad management operations

### Tools Handled
- `tool-createAd`
- `tool-deleteAd` (future)
- `tool-renameAd` (future)
- `tool-duplicateAd` (future)

---

## Orchestration Flow

### Message Processing

```
User types message
    ↓
ChatContainer receives input
    ↓
MetadataBuilder.build() - Combine journey metadata
    ↓
sendMessage({ text, metadata })
    ↓
AI processes with metadata
    ↓
AI calls tool
    ↓
Tool part in response
    ↓
MessageRenderer receives message
    ↓
JourneyRouter.routeToJourney(part)
    ↓
Journey.renderTool(part)
    ↓
UI renders tool result
```

### Mode Flow (Location Example)

```
User clicks "Exclude Location"
    ↓
Event: requestLocationSetup { mode: 'exclude' }
    ↓
useLocationMode hook captures mode
    ↓
AI asks: "What location would you like to exclude?"
    ↓
User types: "toronto"
    ↓
createLocationMetadata('exclude', 'toronto')
    ↓
Metadata: { locationMode: 'exclude', locationInput: 'toronto' }
    ↓
AI receives metadata, calls addLocations with mode='exclude'
    ↓
Tool returns locations with mode='exclude'
    ↓
LocationJourney renders RED card
    ↓
Event emitted: locationUpdated
    ↓
PreviewPanel saves to database with inclusion_mode='exclude'
    ↓
Success! ✅
```

---

## Adding a New Journey

### Step 1: Create Journey Module

```typescript
// components/chat/journeys/[name]/[name]-journey.tsx
export function [Name]Journey(): Journey {
  const renderTool = (part: ToolPart) => {
    // Handle your tools
  };
  
  return { renderTool };
}
```

### Step 2: Add to Journey Router

```typescript
// components/chat/hooks/use-journey-router.ts
if (toolType.includes('[YourPattern]')) {
  return journeys.[name].renderTool(part);
}
```

### Step 3: Initialize in Container

```typescript
// components/chat/chat-container.tsx
const [name]Journey = [Name]Journey();

const { routeToJourney } = useJourneyRouter({
  // ... existing journeys
  [name]: [name]Journey
});
```

### Step 4: Create Tests

```typescript
// tests/journeys/[name]-journey.test.ts
describe('[Name] Journey', () => {
  it('should handle tool-[toolName]', () => {
    // Test logic
  });
});
```

---

## Best Practices

### DO ✅
- Keep journey modules < 200 lines
- Use pure functions for metadata builders
- Implement Journey interface
- Write tests for each journey
- Document events emitted/consumed
- Use type guards for safety

### DON'T ❌
- Import business logic across journeys
- Share state between journeys
- Mix journey responsibilities
- Skip type definitions
- Forget to handle error states
- Create circular dependencies

---

## Troubleshooting

### Issue: Mode gets lost
**Solution**: Ensure mode is stored in journey hook and passed in metadata

### Issue: Tool not rendering
**Solution**: Check journey router includes your tool type pattern

### Issue: Events not firing
**Solution**: Verify event names match exactly, check console for warnings

### Issue: TypeScript errors
**Solution**: Ensure Journey interface is properly implemented

---

## Performance Considerations

### Lightweight Modules
Each journey: 50-200 lines → Fast to load and parse

### Event-Based
Loose coupling → No re-render cascades

### Type-Safe
Compile-time checks → No runtime overhead

### Independent
Journeys can be lazy-loaded (future optimization)

---

## References

- **Master Plan**: `ad-location.plan.md`
- **API Docs**: `MASTER_API_DOCUMENTATION.mdc`
- **Architecture**: `MASTER_PROJECT_ARCHITECTURE.mdc`
- **Cursor Rules**: `.cursor/rules/cursor-project-rule.mdc`
- **AI SDK v5**: https://ai-sdk.dev/docs/introduction
- **Microservices**: Cursor Rules Section 3

---

*Journey Architecture Documentation - AdPilot*  
*November 18, 2025*

