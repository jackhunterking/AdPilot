/**
 * Feature: Ad Operations Utilities
 * Purpose: Verification and retry utilities for ad operations
 * References:
 *  - Vercel AI SDK: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 */

/**
 * Verify if an ad exists in the backend
 * @param campaignId - Campaign ID
 * @param adId - Ad ID to verify
 * @returns Promise<boolean> - true if ad exists, false otherwise
 */
export async function verifyAdExists(
  campaignId: string,
  adId: string
): Promise<boolean> {
  const traceId = `verify_exists_${Date.now()}`
  
  try {
    console.log(`[${traceId}] Verifying ad exists:`, { campaignId, adId })
    
    const response = await fetch(
      `/api/v1/ads/${adId}`,
      { cache: "no-store" }
    )
    
    if (response.status === 404) {
      console.log(`[${traceId}] Ad not found (404)`)
      return false
    }
    
    if (!response.ok) {
      console.warn(`[${traceId}] Verification request failed:`, {
        status: response.status,
        statusText: response.statusText
      })
      // On error, assume it doesn't exist to be safe
      return false
    }
    
    const data = await response.json()
    const exists = !!data.ad
    
    console.log(`[${traceId}] Verification result:`, { exists })
    return exists
    
  } catch (error) {
    console.error(`[${traceId}] Error verifying ad existence:`, error)
    // On error, assume it doesn't exist to be safe
    return false
  }
}

/**
 * Verify that an ad has been deleted (returns 404)
 * @param campaignId - Campaign ID
 * @param adId - Ad ID to verify deletion
 * @returns Promise<boolean> - true if ad is deleted (404), false if still exists
 */
export async function verifyAdDeleted(
  campaignId: string,
  adId: string
): Promise<boolean> {
  const traceId = `verify_deleted_${Date.now()}`
  
  try {
    console.log(`[${traceId}] Verifying ad is deleted:`, { campaignId, adId })
    
    const response = await fetch(
      `/api/v1/ads/${adId}`,
      { cache: "no-store" }
    )
    
    // 404 means it's deleted - this is success!
    if (response.status === 404) {
      console.log(`[${traceId}] Ad confirmed deleted (404)`)
      return true
    }
    
    // Any other status means it still exists or there's an error
    if (response.ok) {
      console.warn(`[${traceId}] Ad still exists!`, {
        status: response.status
      })
      return false
    }
    
    // Server error - can't verify, assume not deleted
    console.error(`[${traceId}] Server error during verification:`, {
      status: response.status,
      statusText: response.statusText
    })
    return false
    
  } catch (error) {
    console.error(`[${traceId}] Error verifying ad deletion:`, error)
    // On error, assume not deleted to be safe
    return false
  }
}

/**
 * Wait for an ad to be created (poll until it appears)
 * Useful after async operations
 * @param campaignId - Campaign ID
 * @param adId - Ad ID to wait for
 * @param options - Polling options
 * @returns Promise<boolean> - true if ad appeared, false if timeout
 */
export async function waitForAdCreation(
  campaignId: string,
  adId: string,
  options: {
    maxAttempts?: number
    intervalMs?: number
  } = {}
): Promise<boolean> {
  const { maxAttempts = 10, intervalMs = 500 } = options
  const traceId = `wait_for_ad_${Date.now()}`
  
  console.log(`[${traceId}] Waiting for ad creation:`, {
    campaignId,
    adId,
    maxAttempts,
    intervalMs
  })
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const exists = await verifyAdExists(campaignId, adId)
    
    if (exists) {
      console.log(`[${traceId}] Ad appeared after ${attempt} attempts`)
      return true
    }
    
    if (attempt < maxAttempts) {
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }
  
  console.warn(`[${traceId}] Timeout waiting for ad (${maxAttempts} attempts)`)
  return false
}

/**
 * Retry a fetch operation with exponential backoff
 * @param fetchFn - Function that performs the fetch
 * @param options - Retry options
 * @returns Promise<T> - Result of the fetch function
 */
export async function refreshWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
    backoffMultiplier?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 5000,
    backoffMultiplier = 2
  } = options
  
  const traceId = `retry_fetch_${Date.now()}`
  
  let lastError: Error | unknown = null
  let delay = initialDelayMs
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[${traceId}] Fetch attempt ${attempt}/${maxRetries + 1}`)
      
      const result = await fetchFn()
      
      if (attempt > 1) {
        console.log(`[${traceId}] Fetch succeeded after ${attempt} attempts`)
      }
      
      return result
      
    } catch (error) {
      lastError = error
      
      if (attempt <= maxRetries) {
        console.warn(`[${traceId}] Fetch attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Exponential backoff with max delay cap
        delay = Math.min(delay * backoffMultiplier, maxDelayMs)
      } else {
        console.error(`[${traceId}] All ${maxRetries + 1} attempts failed:`, error)
      }
    }
  }
  
  // All retries exhausted
  throw lastError instanceof Error
    ? lastError
    : new Error('Fetch failed after all retries')
}

/**
 * Check if browser is online
 * @returns boolean - true if online, false if offline
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Wait for browser to come online
 * @param timeoutMs - Maximum time to wait (default: 30s)
 * @returns Promise<boolean> - true if came online, false if timeout
 */
export async function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
  if (isOnline()) {
    return true
  }
  
  const traceId = `wait_online_${Date.now()}`
  console.log(`[${traceId}] Waiting for network connection...`)
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('online', onlineHandler)
      console.warn(`[${traceId}] Timeout waiting for connection`)
      resolve(false)
    }, timeoutMs)
    
    const onlineHandler = () => {
      clearTimeout(timeout)
      window.removeEventListener('online', onlineHandler)
      console.log(`[${traceId}] Connection restored`)
      resolve(true)
    }
    
    window.addEventListener('online', onlineHandler)
  })
}

/**
 * Operation lock manager to prevent concurrent operations
 */
class OperationLockManager {
  private locks = new Map<string, Promise<void>>()
  
  /**
   * Acquire a lock for an operation
   * Waits if lock is already held
   */
  async acquire(lockKey: string): Promise<() => void> {
    const traceId = `lock_${Date.now()}`
    
    // Wait for any existing lock to release
    const existingLock = this.locks.get(lockKey)
    if (existingLock) {
      console.log(`[${traceId}] Waiting for lock:`, lockKey)
      await existingLock
    }
    
    // Create new lock
    let releaseLock: (() => void) | null = null
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = () => {
        console.log(`[${traceId}] Lock released:`, lockKey)
        this.locks.delete(lockKey)
        resolve()
      }
    })
    
    this.locks.set(lockKey, lockPromise)
    console.log(`[${traceId}] Lock acquired:`, lockKey)
    
    return releaseLock!
  }
  
  /**
   * Check if a lock is currently held
   */
  isLocked(lockKey: string): boolean {
    return this.locks.has(lockKey)
  }
  
  /**
   * Force release a lock (use with caution)
   */
  forceRelease(lockKey: string): void {
    this.locks.delete(lockKey)
  }
}

// Global operation lock manager instance
export const operationLocks = new OperationLockManager()

