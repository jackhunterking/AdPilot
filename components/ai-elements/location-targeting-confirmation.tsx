"use client";

/**
 * Feature: Location Targeting Confirmation Component
 * Purpose: Show confirmation dialog for location targeting setup
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI Elements: https://ai-sdk.dev/elements/tool#overview
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type LocationTargetingConfirmationProps = {
  onConfirm: (locations: string[]) => void;
  onCancel: () => void;
  existingLocations?: Array<{ name: string }>;
};

export const LocationTargetingConfirmation = ({ 
  onConfirm, 
  onCancel,
  existingLocations = []
}: LocationTargetingConfirmationProps) => {
  const [locationInput, setLocationInput] = useState("");
  
  const handleConfirm = () => {
    const locations = locationInput
      .split(',')
      .map(l => l.trim())
      .filter(Boolean);
    
    if (locations.length > 0) {
      onConfirm(locations);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && locationInput.trim()) {
      e.preventDefault();
      handleConfirm();
    }
  };
  
  return (
    <>
      <div className="mb-3">
        <p className="font-medium text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Where would you like to target your ad?
        </p>
      </div>
      
      {existingLocations.length > 0 && (
        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Currently targeting:</p>
          <div className="flex flex-wrap gap-1.5">
            {existingLocations.map((loc, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {loc.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      <label className="text-sm text-muted-foreground mb-2 block">
        Enter location names (separate multiple with commas)
      </label>
      <Input 
        value={locationInput}
        onChange={(e) => setLocationInput(e.target.value)}
        onKeyPress={handleKeyPress}
        className="mb-4"
        placeholder="e.g., Vancouver, Toronto, Montreal"
        autoFocus
      />
      
      <div className="text-xs text-muted-foreground mb-4 space-y-1">
        <p>• Enter cities: "Vancouver", "New York"</p>
        <p>• Enter regions: "California", "Ontario"</p>
        <p>• Enter countries: "Canada", "United States"</p>
        <p>• Specify radius: "30 miles around Toronto"</p>
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={handleConfirm}
          disabled={!locationInput.trim()}
          className="flex-1 gap-2"
        >
          <Plus className="h-4 w-4" />
          {existingLocations.length > 0 ? "Add Locations" : "Set Location"}
        </Button>
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </>
  );
};

