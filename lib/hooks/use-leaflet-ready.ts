/**
 * Feature: Leaflet Script Load Detection
 * Purpose: Detect when Leaflet library is fully loaded and ready to use
 * References:
 *  - Leaflet API: https://leafletjs.com/reference.html
 *  - Next.js Script Loading: https://nextjs.org/docs/app/api-reference/components/script#beforeinteractive
 */

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement, options?: unknown) => unknown;
      [key: string]: unknown;
    };
  }
}

/**
 * Hook that detects when Leaflet library is fully loaded and ready to use
 * Handles the race condition between React component mounting and CDN script loading
 * 
 * @returns Object with isReady boolean and error state
 */
export function useLeafletReady() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if Leaflet is already loaded
    if (typeof window !== 'undefined' && window.L) {
      console.log('[useLeafletReady] Leaflet already loaded');
      setIsReady(true);
      return;
    }

    let checkCount = 0;
    const maxChecks = 50; // 50 checks * 100ms = 5 seconds max wait
    const checkInterval = 100; // Check every 100ms

    // Poll for Leaflet availability with exponential backoff
    const checkLeaflet = () => {
      checkCount++;
      
      if (typeof window !== 'undefined' && window.L) {
        console.log(`[useLeafletReady] Leaflet loaded after ${checkCount} checks (${checkCount * checkInterval}ms)`);
        setIsReady(true);
        return true;
      }

      if (checkCount >= maxChecks) {
        const err = new Error('Leaflet library failed to load within timeout');
        console.error('[useLeafletReady]', err);
        setError(err);
        return true; // Stop checking
      }

      return false;
    };

    // Initial check
    if (checkLeaflet()) {
      return;
    }

    // Set up polling interval
    const intervalId = setInterval(() => {
      if (checkLeaflet()) {
        clearInterval(intervalId);
      }
    }, checkInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return { isReady, error };
}

