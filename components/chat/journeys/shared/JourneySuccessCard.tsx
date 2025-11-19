/**
 * Feature: Journey Success Card
 * Purpose: Standardized success/info state UI component for all journeys
 * Microservices: Shared UI component
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

"use client";

import React from 'react';

interface JourneySuccessCardProps {
  /**
   * Primary message to display
   */
  message: string;
  
  /**
   * Icon to display (required for semantic clarity)
   */
  icon: React.ReactNode;
  
  /**
   * Visual variant for different operation types
   * - success: Green (create, save, complete operations)
   * - info: Blue (configuration, setup, connection)
   * - warning: Yellow (suggestions, optimizations)
   * - destructive: Red (delete, remove operations)
   * - analytics: Purple (analytics, insights, comparisons)
   */
  variant?: 'success' | 'info' | 'warning' | 'destructive' | 'analytics';
  
  /**
   * Optional secondary description text
   */
  description?: string;
}

/**
 * Standardized success/info card for journey operations
 * 
 * Uses semantic color scheme based on operation type.
 * Consistent spacing (p-3 my-2) across all journeys.
 * 
 * @example
 * ```tsx
 * <JourneySuccessCard 
 *   message="Ad created successfully" 
 *   icon={<Plus className="h-4 w-4" />}
 *   variant="success"
 * />
 * 
 * <JourneySuccessCard 
 *   message="Connected to Meta" 
 *   icon={<Link2 className="h-4 w-4" />}
 *   variant="info"
 *   description="Your account is now linked"
 * />
 * ```
 */
export function JourneySuccessCard({ 
  message, 
  icon, 
  variant = 'success', 
  description 
}: JourneySuccessCardProps): React.ReactElement {
  const colors = {
    success: 'bg-green-500/5 border-green-500/30 text-green-600',
    info: 'bg-blue-500/5 border-blue-500/30 text-blue-600',
    warning: 'bg-yellow-500/5 border-yellow-500/30 text-yellow-600',
    destructive: 'bg-destructive/5 border-destructive/30 text-destructive',
    analytics: 'bg-purple-500/5 border-purple-500/30 text-purple-600',
  };
  
  return (
    <div className={`border rounded-lg p-3 my-2 ${colors[variant]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {description && (
            <p className="text-xs opacity-70 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

