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

export function renderAudienceModeResult(opts: {
  callId: string;
  keyId?: string;
  input: { mode: 'ai' | 'manual'; explanation?: string };
  output: { success?: boolean; mode?: 'ai' | 'manual'; explanation?: string };
}): React.JSX.Element {
  const { callId, keyId, input, output } = opts;
  const mode = output.mode || input.mode;
  const isAI = mode === 'ai';

  return (
    <div 
      key={keyId || callId} 
      className={`border rounded-lg p-3 my-2 ${
        isAI 
          ? 'bg-green-500/5 border-green-500/30' 
          : 'bg-blue-500/5 border-blue-500/30'
      }`}
    >
      <div className="flex items-center gap-2">
        {isAI ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            isAI ? 'text-green-600' : 'text-blue-600'
          }`}>
            {isAI ? 'AI Advantage+ Enabled' : 'Manual Targeting Selected'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAI 
              ? 'Automatic optimization enabled' 
              : 'Answer questions in chat to define your audience'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function renderSwitchTargetingModeResult(opts: {
  callId: string;
  keyId?: string;
  input: { newMode: 'ai' | 'manual'; currentMode: 'ai' | 'manual' };
  output: { success: boolean; newMode: 'ai' | 'manual'; message: string };
}): React.JSX.Element {
  const { callId, keyId, output } = opts;
  const isAI = output.newMode === 'ai';

  return (
    <Fragment key={keyId || callId}>
      <div 
        className={`border rounded-lg p-4 my-2 ${
          isAI 
            ? 'bg-green-500/5 border-green-500/30' 
            : 'bg-blue-500/5 border-blue-500/30'
        }`}
      >
        <div className="flex items-start gap-3">
          {isAI ? (
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${
                isAI ? 'text-green-600' : 'text-blue-600'
              }`} />
              <p className={`text-sm font-semibold ${
                isAI ? 'text-green-600' : 'text-blue-600'
              }`}>
                {isAI ? 'Switched to AI Advantage+' : 'Switched to Manual Targeting'}
              </p>
            </div>
            <p className="text-sm text-foreground mb-2">
              {output.message}
            </p>
            {isAI ? (
              <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-green-500/10">
                <Badge className="bg-green-600 text-white text-xs">
                  22% Better ROAS
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Meta&apos;s AI will automatically optimize your audience
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-blue-500/10">
                <p className="text-xs text-muted-foreground">
                  I&apos;ll help you set up your target audience through conversation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

// Component for manual targeting parameters with confirmation
function ManualTargetingParametersCard(props: {
  callId: string;
  keyId?: string;
  demographics?: { ageMin: number; ageMax: number; gender: 'all' | 'male' | 'female' };
  interests: Array<{ id: string; name: string }>;
  behaviors: Array<{ id: string; name: string }>;
  explanation: string;
  needsConfirmation: boolean;
}) {
  const { callId, keyId, demographics, interests, behaviors, explanation, needsConfirmation } = props;
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!demographics) return;
    
    setIsConfirming(true);
    
    // Dispatch event with parameters to update audience context
    window.dispatchEvent(new CustomEvent('audienceParametersConfirmed', {
      detail: {
        demographics,
        interests,
        behaviors,
      }
    }));
    
    // Show confirmed state
    setTimeout(() => {
      setIsConfirming(false);
      setIsConfirmed(true);
    }, 500);
  };

  return (
    <Fragment>
      <div 
        className="border rounded-lg p-3 my-2 bg-blue-500/5 border-blue-500/30"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-600">
              Targeting Parameters Generated
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and refine these AI-generated parameters
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-3">
          {/* Demographics */}
          {demographics && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Demographics</p>
                <p className="text-xs text-muted-foreground">
                  {demographics.gender && demographics.gender !== "all" 
                    ? demographics.gender.charAt(0).toUpperCase() + demographics.gender.slice(1) + ", " 
                    : ""}
                  Age {demographics.ageMin}-{demographics.ageMax}
                </p>
              </div>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <Heart className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Interests</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {interests.slice(0, 3).map((interest) => (
                    <Badge key={interest.id} variant="secondary" className="text-xs">
                      {interest.name}
                    </Badge>
                  ))}
                  {interests.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{interests.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Behaviors */}
          {behaviors.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <Activity className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Behaviors</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {behaviors.slice(0, 3).map((behavior) => (
                    <Badge key={behavior.id} variant="secondary" className="text-xs">
                      {behavior.name}
                    </Badge>
                  ))}
                  {behaviors.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{behaviors.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Button */}
        {needsConfirmation && !isConfirmed && (
          <div className="mt-4 pt-3 border-t border-border">
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Targeting
                </>
              )}
            </Button>
          </div>
        )}

        {/* Confirmed State */}
        {isConfirmed && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-medium">Confirmed! Check the canvas to refine your targeting.</p>
            </div>
          </div>
        )}
      </div>
      {explanation && !isConfirmed && (
        <p className="text-sm text-muted-foreground my-2">{explanation}</p>
      )}
    </Fragment>
  );
}

export function renderManualTargetingParametersResult(opts: {
  callId: string;
  keyId?: string;
  input: {
    description?: string;
    demographics?: { ageMin: number; ageMax: number; gender: 'all' | 'male' | 'female' };
    interests?: Array<{ id: string; name: string }>;
    behaviors?: Array<{ id: string; name: string }>;
    explanation?: string;
  };
  output: {
    success?: boolean;
    needsConfirmation?: boolean;
    demographics?: { ageMin: number; ageMax: number; gender: 'all' | 'male' | 'female' };
    interests?: Array<{ id: string; name: string }>;
    behaviors?: Array<{ id: string; name: string }>;
    explanation?: string;
  };
}): React.JSX.Element {
  const { callId, keyId, input, output } = opts;
  const demographics = output.demographics || input.demographics;
  const interests = output.interests || input.interests || [];
  const behaviors = output.behaviors || input.behaviors || [];
  const explanation = output.explanation || input.explanation || '';
  const needsConfirmation = output.needsConfirmation ?? false;

  return (
    <ManualTargetingParametersCard
      key={keyId || callId}
      callId={callId}
      keyId={keyId}
      demographics={demographics}
      interests={interests}
      behaviors={behaviors}
      explanation={explanation}
      needsConfirmation={needsConfirmation}
    />
  );
}


