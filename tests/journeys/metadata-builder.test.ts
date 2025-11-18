/**
 * Feature: Metadata Builder Tests
 * Purpose: Test journey metadata combination
 * References:
 *  - Jest: https://jestjs.io/docs/getting-started
 */

import { renderHook } from '@testing-library/react';
import { useMetadataBuilder } from '@/components/chat/hooks/use-metadata-builder';

describe('Metadata Builder', () => {
  it('should build base metadata when no journeys active', () => {
    const { result } = renderHook(() => useMetadataBuilder({}));
    
    const metadata = result.current.build('test message');
    
    expect(metadata.timestamp).toBeDefined();
    expect(metadata.source).toBe('chat_input');
    expect(metadata.locationSetupMode).toBeUndefined();
  });
  
  it('should build location metadata when location journey active', () => {
    const { result } = renderHook(() => useMetadataBuilder({
      locationMode: 'exclude',
      locationActive: true
    }));
    
    const metadata = result.current.build('toronto');
    
    expect(metadata.locationSetupMode).toBe(true);
    expect(metadata.locationMode).toBe('exclude');
    expect(metadata.locationInput).toBe('toronto');
  });
  
  it('should build edit metadata when edit mode active', () => {
    const editRef = { variationIndex: 0, type: 'image' };
    const { result } = renderHook(() => useMetadataBuilder({
      editMode: true,
      editReference: editRef
    }));
    
    const metadata = result.current.build('make it brighter');
    
    expect(metadata.editMode).toBe(true);
    expect(metadata.editingReference).toBeDefined();
  });
  
  it('should prioritize location metadata over base', () => {
    const { result } = renderHook(() => useMetadataBuilder({
      locationMode: 'include',
      locationActive: true
    }));
    
    const metadata = result.current.build('new york');
    
    // Should have location metadata
    expect(metadata.locationSetupMode).toBe(true);
    expect(metadata.locationInput).toBe('new york');
    
    // Should still have base metadata
    expect(metadata.timestamp).toBeDefined();
    expect(metadata.source).toBe('chat_input');
  });
});

