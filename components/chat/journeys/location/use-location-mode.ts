/**
 * Feature: Location Mode State Management
 * Purpose: Track include/exclude mode for location targeting
 * Microservices: Single responsibility - mode state only
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { useState, useEffect } from 'react';

export function useLocationMode() {
  const [mode, setMode] = useState<'include' | 'exclude'>('include');
  const [isActive, setIsActive] = useState(false);
  
  // Listen for location setup requests
  useEffect(() => {
    const handleRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: 'include' | 'exclude' }>;
      const requestedMode = customEvent.detail?.mode || 'include';
      
      setMode(requestedMode);  // Store mode
      setIsActive(true);
      
      console.log('[LocationMode] Setup requested:', { mode: requestedMode });
    };
    
    window.addEventListener('requestLocationSetup', handleRequest);
    return () => window.removeEventListener('requestLocationSetup', handleRequest);
  }, []);
  
  const reset = () => {
    setMode('include');
    setIsActive(false);
  };
  
  return { mode, isActive, setMode, setIsActive, reset };
}

