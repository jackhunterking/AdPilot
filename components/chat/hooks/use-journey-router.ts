/**
 * Feature: Journey Router
 * Purpose: Route tool parts to appropriate journey modules
 * Microservices: Orchestration logic only
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import type { Journey, ToolPart } from '../types/journey-types';

interface JourneyMap {
  location: Journey;
  creative: Journey;
  copy: Journey;
  goal: Journey;
  campaign: Journey;
}

export function useJourneyRouter(journeys: JourneyMap) {
  const routeToJourney = (part: ToolPart): React.ReactNode => {
    const toolType = part.type;
    
    // Route based on tool type prefix
    if (toolType.includes('Location') || toolType === 'tool-addLocations') {
      return journeys.location.renderTool(part);
    }
    
    if (toolType.includes('Variation') || toolType.includes('Image') || toolType === 'tool-generateVariations') {
      return journeys.creative.renderTool(part);
    }
    
    if (toolType.includes('Copy') || toolType === 'tool-editCopy') {
      return journeys.copy.renderTool(part);
    }
    
    if (toolType.includes('Goal') || toolType === 'tool-setupGoal') {
      return journeys.goal.renderTool(part);
    }
    
    if (toolType.includes('Ad') || toolType === 'tool-createAd' || toolType.includes('deleteAd') || toolType.includes('duplicateAd')) {
      return journeys.campaign.renderTool(part);
    }
    
    // Unknown tool type
    console.warn('[JourneyRouter] Unknown tool type:', toolType);
    return null;
  };
  
  return { routeToJourney };
}

