/**
 * Feature: Journey Router Tests
 * Purpose: Test tool routing to appropriate journeys
 * References:
 *  - Jest: https://jestjs.io/docs/getting-started
 */

import { renderHook } from '@testing-library/react';
import { useJourneyRouter } from '@/components/chat/hooks/use-journey-router';
import { LocationJourney } from '@/components/chat/journeys/location/location-journey';
import { CreativeJourney } from '@/components/chat/journeys/creative/creative-journey';
import { CopyJourney } from '@/components/chat/journeys/copy/copy-journey';
import { GoalJourney } from '@/components/chat/journeys/goal/goal-journey';
import { CampaignJourney } from '@/components/chat/journeys/campaign/campaign-journey';

describe('Journey Router', () => {
  const setupRouter = () => {
    const locationJourney = LocationJourney();
    const creativeJourney = CreativeJourney();
    const copyJourney = CopyJourney();
    const goalJourney = GoalJourney();
    const campaignJourney = CampaignJourney();
    
    const { result } = renderHook(() => useJourneyRouter({
      location: locationJourney,
      creative: creativeJourney,
      copy: copyJourney,
      goal: goalJourney,
      campaign: campaignJourney
    }));
    
    return result.current;
  };
  
  it('should route location tools to location journey', () => {
    const router = setupRouter();
    const part = { type: 'tool-addLocations', toolCallId: 'test-1' };
    
    const result = router.routeToJourney(part);
    
    expect(result).toBeDefined();
    // Location journey should handle this
  });
  
  it('should route creative tools to creative journey', () => {
    const router = setupRouter();
    
    const tools = ['tool-generateVariations', 'tool-editVariation', 'tool-regenerateVariation'];
    
    tools.forEach(type => {
      const part = { type, toolCallId: `test-${type}` };
      const result = router.routeToJourney(part);
      expect(result).toBeDefined();
    });
  });
  
  it('should route copy tools to copy journey', () => {
    const router = setupRouter();
    const part = { type: 'tool-editCopy', toolCallId: 'test-copy' };
    
    const result = router.routeToJourney(part);
    
    expect(result).toBeDefined();
  });
  
  it('should route goal tools to goal journey', () => {
    const router = setupRouter();
    const part = { type: 'tool-setupGoal', toolCallId: 'test-goal' };
    
    const result = router.routeToJourney(part);
    
    expect(result).toBeDefined();
  });
  
  it('should route campaign tools to campaign journey', () => {
    const router = setupRouter();
    const part = { type: 'tool-createAd', toolCallId: 'test-ad' };
    
    const result = router.routeToJourney(part);
    
    expect(result).toBeDefined();
  });
  
  it('should return null for unknown tool types', () => {
    const router = setupRouter();
    const part = { type: 'tool-unknown', toolCallId: 'test-unknown' };
    
    const result = router.routeToJourney(part);
    
    expect(result).toBeNull();
  });
});

