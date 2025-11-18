"use client";

/**
 * Feature: Tool Result Renderers
 * Purpose: Centralize UI rendering for tool results in chat
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/streaming
 */

import React, { Fragment, useState } from "react";
import { CheckCircle2, Sparkles, Target, User, Heart, Activity, Loader2 } from "lucide-react";
import { AdMockup } from "@/components/ad-mockup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function deriveEditDescription(inputPrompt?: string): string {
  const p = (inputPrompt || "").trim();
  const m = p.match(/make (?:the )?car\s+(.+)/i);
  if (m && m[1]) {
    const value = m[1].replace(/\.$/, "");
    return `The car has been changed to ${value}. Here's the updated image:`;
  }
  return `Here\'s the updated image:`;
}

export function renderEditImageResult(opts: {
  callId: string;
  keyId?: string;
  input: { imageUrl?: string; variationIndex?: number; prompt?: string };
  output: { editedImageUrl?: string; success?: boolean; error?: string };
  isSubmitting: boolean;
}): React.JSX.Element {
  const { callId, keyId, input, output } = opts;
  const desc = deriveEditDescription(input?.prompt);

  return (
    <Fragment key={keyId || callId}>
      <div key={(keyId || callId) + "-card"} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">Image updated on canvas</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check the ad variations above to see your edit</p>
          </div>
        </div>
      </div>
      <p className="text-base font-medium mb-2">{desc}</p>
      {output.editedImageUrl && (
        <div className="max-w-md mx-auto my-2">
          <AdMockup format="feed" imageUrl={output.editedImageUrl} />
        </div>
      )}
    </Fragment>
  );
}

export function renderRegenerateImageResult(opts: {
  callId: string;
  keyId?: string;
  output: { imageUrl?: string; success?: boolean; variationIndex?: number };
}): React.JSX.Element {
  const { callId, keyId, output } = opts;
  return (
    <Fragment key={keyId || callId}>
      <div key={(keyId || callId) + "-card"} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">Variation regenerated on canvas</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check the ad variations above to see the new version</p>
          </div>
        </div>
      </div>
      <p className="text-base font-medium mb-2">Here&apos;s the updated image:</p>
      {output.imageUrl && (
        <div className="max-w-md mx-auto my-2">
          <AdMockup format="feed" imageUrl={output.imageUrl} />
        </div>
      )}
    </Fragment>
  );
}

export function renderEditAdCopyResult(opts: {
  callId: string;
  keyId?: string;
  input: { prompt?: string; current?: { primaryText?: string; headline?: string; description?: string } };
  output: { success?: boolean; copy?: { primaryText: string; headline: string; description: string } };
  imageUrl?: string;
  format?: 'feed' | 'story';
}): React.JSX.Element {
  const { callId, keyId, output, imageUrl, format } = opts;
  const copy = output.copy;
  return (
    <Fragment key={keyId || callId}>
      <div className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">Ad copy updated</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check the ad variations above to see your edit</p>
          </div>
        </div>
      </div>
      {copy && (
        <div className="max-w-md mx-auto my-2">
          <AdMockup 
            format={format ?? 'feed'} 
            imageUrl={imageUrl}
            primaryText={copy.primaryText} 
            headline={copy.headline} 
            description={copy.description} 
          />
        </div>
      )}
    </Fragment>
  );
}

export function renderLocationUpdateResult(opts: {
  callId: string;
  keyId?: string;
  input: { locations: Array<{ name: string; mode?: string }> };
  output: { success?: boolean; count?: number; locations?: unknown[]; error?: string };
}): React.JSX.Element {
  const { callId, keyId, input, output } = opts;
  
  const includedCount = input.locations.filter(l => l.mode === 'include' || !l.mode).length;
  const excludedCount = input.locations.filter(l => l.mode === 'exclude').length;
  
  // Determine primary action for clear messaging
  const isExcludeAction = excludedCount > 0 && includedCount === 0;
  const isMixedAction = includedCount > 0 && excludedCount > 0;
  
  // Build clear, unambiguous message
  let actionMessage = "Location updated on canvas";
  if (isExcludeAction) {
    actionMessage = excludedCount === 1 ? "Location excluded" : "Locations excluded";
  } else if (includedCount > 0 && excludedCount === 0) {
    actionMessage = includedCount === 1 ? "Location included" : "Locations included";
  } else if (isMixedAction) {
    actionMessage = "Locations updated";
  }
  
  return (
    <Fragment key={keyId || callId}>
      <div key={(keyId || callId) + "-card"} className="border rounded-lg p-3 my-2 bg-green-500/5 border-green-500/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-600">{actionMessage}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {includedCount > 0 && `${includedCount} included`}
              {excludedCount > 0 && includedCount > 0 && ` · `}
              {excludedCount > 0 && `${excludedCount} excluded`}
            </p>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

