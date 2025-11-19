/**
 * Feature: Base Service with Retry Logic
 * Purpose: Reusable fetch utilities with exponential backoff
 * Microservices: Shared utility for all client services
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries?: number; // Default: 3
  baseDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 10000ms
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Execute fetch with exponential backoff retry
 * 
 * @param fetchFn - Function that returns a fetch Promise
 * @param config - Retry configuration
 * @returns ServiceResult<T>
 */
export async function executeWithRetry<T>(
  fetchFn: () => Promise<Response>,
  config: RetryConfig = {}
): Promise<ServiceResult<T>> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      // Retry on network errors and 5xx server errors
      if (error instanceof TypeError) return true; // Network error
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        return status >= 500 && status < 600;
      }
      return false;
    },
  } = config;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchFn();
      
      // Check if we should retry based on status code
      if (!response.ok && shouldRetry({ status: response.status })) {
        lastError = { status: response.status, statusText: response.statusText };
        
        if (attempt < maxRetries - 1) {
          const delay = getBackoffDelay(attempt, baseDelay, maxDelay);
          console.log(`[BaseService] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await sleep(delay);
          continue;
        }
      }
      
      // Parse response
      const result: unknown = await response.json();
      
      if (!response.ok) {
        const errorResult = result as { success: false; error: { code: string; message: string } };
        return {
          success: false,
          error: errorResult.error,
        };
      }
      
      const successResult = result as { success: true; data: T };
      return {
        success: true,
        data: successResult.data,
      };
      
    } catch (error) {
      lastError = error;
      
      if (shouldRetry(error) && attempt < maxRetries - 1) {
        const delay = getBackoffDelay(attempt, baseDelay, maxDelay);
        console.log(`[BaseService] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms due to error:`, error);
        await sleep(delay);
        continue;
      }
      
      // If we've exhausted retries or shouldn't retry, throw
      if (attempt === maxRetries - 1) {
        break;
      }
    }
  }

  // If we get here, all retries failed
  return {
    success: false,
    error: {
      code: 'max_retries_exceeded',
      message: lastError instanceof Error 
        ? lastError.message 
        : 'Request failed after multiple retries',
      details: lastError,
    },
  };
}

/**
 * Standard fetch with credentials and headers
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * POST request with retry
 */
export async function postWithRetry<T>(
  url: string,
  body: unknown,
  config?: RetryConfig
): Promise<ServiceResult<T>> {
  return executeWithRetry<T>(
    () => fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    config
  );
}

/**
 * GET request with retry
 */
export async function getWithRetry<T>(
  url: string,
  config?: RetryConfig
): Promise<ServiceResult<T>> {
  return executeWithRetry<T>(
    () => fetchWithAuth(url, {
      method: 'GET',
    }),
    config
  );
}

/**
 * PATCH request with retry
 */
export async function patchWithRetry<T>(
  url: string,
  body: unknown,
  config?: RetryConfig
): Promise<ServiceResult<T>> {
  return executeWithRetry<T>(
    () => fetchWithAuth(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    config
  );
}

/**
 * DELETE request with retry
 */
export async function deleteWithRetry<T>(
  url: string,
  config?: RetryConfig
): Promise<ServiceResult<T>> {
  return executeWithRetry<T>(
    () => fetchWithAuth(url, {
      method: 'DELETE',
    }),
    config
  );
}

