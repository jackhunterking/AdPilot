/**
 * Feature: Journey Error Card
 * Purpose: Standardized error state UI component for all journeys
 * Microservices: Shared UI component
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface JourneyErrorCardProps {
  /**
   * Error message from the tool invocation (part.errorText)
   */
  error: string | undefined;
  
  /**
   * Fallback message if error is undefined
   */
  fallback: string;
  
  /**
   * Optional retry callback for recoverable errors
   */
  onRetry?: () => void;
}

/**
 * Standardized error card for journey operations
 * 
 * Displays error message with AlertCircle icon.
 * Uses consistent spacing (p-3 my-2) and destructive styling.
 * Optional retry button for recoverable errors.
 * 
 * @example
 * ```tsx
 * <JourneyErrorCard 
 *   error={part.errorText} 
 *   fallback="Failed to generate creative"
 * />
 * 
 * <JourneyErrorCard 
 *   error={part.errorText} 
 *   fallback="Failed to save ad"
 *   onRetry={() => handleRetry()}
 * />
 * ```
 */
export function JourneyErrorCard({ 
  error, 
  fallback, 
  onRetry 
}: JourneyErrorCardProps): React.ReactElement {
  return (
    <div className="border rounded-lg p-3 my-2 bg-destructive/5 border-destructive/50">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-destructive">
            {error || fallback}
          </p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="text-xs text-destructive underline mt-1 hover:no-underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

