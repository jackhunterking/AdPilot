/**
 * Feature: Journey Loading Card
 * Purpose: Standardized loading state UI component for all journeys
 * Microservices: Shared UI component
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import React from 'react';

interface JourneyLoadingCardProps {
  /**
   * Loading message to display
   */
  message: string;
  
  /**
   * Optional custom icon to display instead of spinner
   */
  icon?: React.ReactNode;
}

/**
 * Standardized loading card for journey operations
 * 
 * Displays a spinner (or custom icon) with a message.
 * Uses consistent spacing (p-3 my-2) and styling across all journeys.
 * 
 * @example
 * ```tsx
 * <JourneyLoadingCard message="Generating creative variations..." />
 * <JourneyLoadingCard message="Processing..." icon={<Loader2 />} />
 * ```
 */
export function JourneyLoadingCard({ message, icon }: JourneyLoadingCardProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card my-2">
      {icon || (
        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      )}
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

