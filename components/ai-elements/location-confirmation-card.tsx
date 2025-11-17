/**
 * Feature: Location Confirmation Card
 * Purpose: Confirmation UI for location targeting using generic base
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */
"use client"

import { MapPin } from "lucide-react"
import { ToolConfirmationCard } from "./tool-confirmation-card"

interface LocationConfirmationCardProps {
  locations: Array<{
    name: string
    type: string
    mode: 'include' | 'exclude'
    radius?: number
  }>
  explanation?: string
  onConfirm: () => void
  onCancel: () => void
}

export function LocationConfirmationCard({
  locations,
  explanation,
  onConfirm,
  onCancel
}: LocationConfirmationCardProps) {
  // Convert locations to generic items format
  const items = locations.map(loc => {
    const typeLabel = loc.type === 'radius' && loc.radius 
      ? `${loc.radius} mile radius` 
      : loc.type === 'city' ? 'City'
      : loc.type === 'region' ? 'Province/Region'
      : loc.type === 'country' ? 'Country'
      : loc.type;
    
    const isExcluded = loc.mode === 'exclude';
    
    return {
      label: typeLabel,
      value: loc.name,
      variant: isExcluded ? 'destructive' as const : 'success' as const
    };
  });
  
  return (
    <ToolConfirmationCard
      icon={MapPin}
      iconColor="text-blue-600"
      iconBgColor="bg-blue-600/10"
      title="Set Location Targeting?"
      message={explanation}
      items={items}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmText="Confirm"
      cancelText="Cancel"
      isDestructive={false}
    />
  );
}

