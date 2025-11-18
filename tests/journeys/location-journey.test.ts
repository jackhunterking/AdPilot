/**
 * Feature: Location Journey Tests
 * Purpose: Isolated testing of location targeting service
 * References:
 *  - Jest: https://jestjs.io/docs/getting-started
 *  - React Testing Library: https://testing-library.com/docs/react-testing-library/intro
 */

import { renderHook, act } from '@testing-library/react';
import { useLocationMode } from '@/components/chat/journeys/location/use-location-mode';
import { createLocationMetadata } from '@/components/chat/journeys/location/location-metadata';

describe('Location Journey - useLocationMode Hook', () => {
  it('should initialize with include mode', () => {
    const { result } = renderHook(() => useLocationMode());
    
    expect(result.current.mode).toBe('include');
    expect(result.current.isActive).toBe(false);
  });
  
  it('should track exclude mode from requestLocationSetup event', () => {
    const { result } = renderHook(() => useLocationMode());
    
    act(() => {
      window.dispatchEvent(new CustomEvent('requestLocationSetup', {
        detail: { mode: 'exclude' }
      }));
    });
    
    expect(result.current.mode).toBe('exclude');
    expect(result.current.isActive).toBe(true);
  });
  
  it('should default to include mode if no mode specified in event', () => {
    const { result } = renderHook(() => useLocationMode());
    
    act(() => {
      window.dispatchEvent(new CustomEvent('requestLocationSetup', {
        detail: {}
      }));
    });
    
    expect(result.current.mode).toBe('include');
  });
  
  it('should reset mode and isActive', () => {
    const { result } = renderHook(() => useLocationMode());
    
    // Set to exclude mode
    act(() => {
      window.dispatchEvent(new CustomEvent('requestLocationSetup', {
        detail: { mode: 'exclude' }
      }));
    });
    
    expect(result.current.mode).toBe('exclude');
    expect(result.current.isActive).toBe(true);
    
    // Reset
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.mode).toBe('include');
    expect(result.current.isActive).toBe(false);
  });
});

describe('Location Journey - createLocationMetadata', () => {
  it('should create metadata with include mode', () => {
    const metadata = createLocationMetadata('include', 'toronto');
    
    expect(metadata.locationSetupMode).toBe(true);
    expect(metadata.locationMode).toBe('include');
    expect(metadata.locationInput).toBe('toronto');
    expect(metadata.source).toBe('chat_input');
  });
  
  it('should create metadata with exclude mode', () => {
    const metadata = createLocationMetadata('exclude', 'markham');
    
    expect(metadata.locationSetupMode).toBe(true);
    expect(metadata.locationMode).toBe('exclude');
    expect(metadata.locationInput).toBe('markham');
  });
  
  it('should include timestamp', () => {
    const metadata = createLocationMetadata('include', 'ontario');
    
    expect(metadata.timestamp).toBeDefined();
    expect(typeof metadata.timestamp).toBe('string');
  });
});

describe('Location Journey - Integration', () => {
  it('should flow mode from event to metadata', () => {
    const { result } = renderHook(() => useLocationMode());
    
    // Simulate exclude button click
    act(() => {
      window.dispatchEvent(new CustomEvent('requestLocationSetup', {
        detail: { mode: 'exclude' }
      }));
    });
    
    // Build metadata with current mode
    const metadata = createLocationMetadata(result.current.mode, 'toronto');
    
    // Verify mode flows through
    expect(result.current.mode).toBe('exclude');
    expect(metadata.locationMode).toBe('exclude');
    expect(metadata.locationInput).toBe('toronto');
  });
});

