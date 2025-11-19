/**
 * Feature: System Prompt Service
 * Purpose: Build AI system prompts with goal-aware, step-aware, and mode-specific context
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/prompts
 *  - Microservices: Extracted from app/api/v1/chat/route.ts
 */

// ============================================================================
// Types
// ============================================================================

export interface PromptContext {
  goal?: 'leads' | 'calls' | 'website-visits' | null;
  currentStep?: string | null;
  activeTab?: 'setup' | 'results';
  isEditMode?: boolean;
  isLocationSetupMode?: boolean;
  locationInput?: string;
  referenceContext?: string;
  resultsContext?: string;
  offerContext?: string;
  planContext?: string;
}

// ============================================================================
// Goal Context Templates
// ============================================================================

const GOAL_CONTEXTS: Record<string, string> = {
  calls: `This campaign is optimized for generating PHONE CALLS.

**Visual & Creative Guidelines:**
- Include trust signals (professional imagery, credentials, testimonials)
- Emphasize personal connection and accessibility
- Show real people, faces, and direct communication
- Use warm, inviting tones and approachable imagery

**Copy & Messaging:**
- CTAs should encourage immediate calling: "Call Now", "Speak to an Expert", "Get Your Free Consultation"
- Emphasize urgency and availability: "Available 24/7", "Talk to us today"
- Highlight the value of direct conversation`,

  leads: `This campaign is optimized for LEAD GENERATION through form submissions.

**Visual & Creative Guidelines:**
- Include value exchange imagery (forms, checklists, downloads, assessments)
- Show transformation and results from information sharing
- Emphasize trust and data security with professional visuals
- Use imagery suggesting consultation, assessment, or personalized service

**Copy & Messaging:**
- CTAs for form submission: "Sign Up", "Get Your Free Quote", "Request Information", "Download Now"
- Emphasize value exchange: "Free", "Exclusive", "Personalized"
- Reduce friction: "Quick", "Easy", "Just 2 minutes"`,

  'website-visits': `This campaign is optimized for driving WEBSITE TRAFFIC and browsing.

**Visual & Creative Guidelines:**
- Show browsing and discovery actions (screens, devices, online shopping)
- Include product catalogs, website interfaces, or digital storefronts
- Emphasize exploration and online presence
- Use imagery suggesting clicking, scrolling, browsing

**Copy & Messaging:**
- CTAs for website visits: "Shop Now", "Explore More", "View Collection", "Browse Catalog", "Learn More"
- Emphasize discovery: "Discover", "Explore", "Browse"
- Highlight online benefits: "Shop from home", "100+ options online"`,
};

// ============================================================================
// Step-Aware Instructions
// ============================================================================

const STEP_INSTRUCTIONS: Record<string, string> = {
  location: `**LOCATION STEP - GEOGRAPHIC TARGETING**
- ✅ Call addLocations tool when user requests location setup
- ❌ DO NOT call generateVariations, setupGoal, or any creative tools
- Focus ONLY on location targeting`,

  copy: `**COPY STEP - TEXT EDITING ONLY:**
- ❌ NEVER call generateVariations unless user EXPLICITLY says "generate new ads from scratch"
- ✅ Use editCopy tool for text modifications
- Focus ONLY on copy content`,

  destination: `**DESTINATION STEP - SETUP ONLY:**
- ❌ NEVER call generateVariations unless user EXPLICITLY says "generate new ads from scratch"
- ✅ Help with destination setup (forms, URLs, phone numbers)
- Focus ONLY on destination configuration`,

  budget: `**BUDGET/PREVIEW STEP - REVIEW ONLY:**
- ❌ NEVER call generateVariations unless user EXPLICITLY says "generate new ads from scratch"
- ✅ Help review the ad setup
- Focus ONLY on budget and launch configuration`,

  ads: `**ADS STEP - CREATIVE GENERATION ONLY:**
- ✅ Call generateVariations when user wants to create ad creatives
- ✅ Use editVariation and regenerateVariation for modifications
- ❌ NEVER call addLocations on this step
- ❌ NEVER mix creative tools with targeting/campaign tools`,
};

// ============================================================================
// System Prompt Service
// ============================================================================

export class SystemPromptService {
  /**
   * Build complete system prompt based on context
   */
  buildPrompt(context: PromptContext): string {
    const sections: string[] = [];

    // 1. Mode-specific instructions (highest priority)
    if (context.isLocationSetupMode && context.locationInput) {
      sections.push(this.buildLocationSetupMode(context.locationInput));
      return sections.join('\n\n'); // Return early for location setup mode
    }

    if (context.isEditMode && context.referenceContext) {
      sections.push(this.buildEditMode(context.referenceContext));
      return sections.join('\n\n'); // Return early for edit mode
    }

    // 2. Offer context (if applicable)
    if (context.offerContext) {
      sections.push(context.offerContext);
    }

    // 3. Plan context (if applicable)
    if (context.planContext) {
      sections.push(context.planContext);
    }

    // 4. Results context (if applicable)
    if (context.resultsContext) {
      sections.push(context.resultsContext);
    }

    // 5. Goal context
    sections.push(this.buildGoalSection(context.goal));

    // 6. Step-aware instructions
    if (context.currentStep) {
      const stepInstruction = STEP_INSTRUCTIONS[context.currentStep];
      if (stepInstruction) {
        sections.push(`## 🚨 CRITICAL: Step-Aware Tool Usage\n\n**Current Step:** ${context.currentStep}\n\n${stepInstruction}`);
      }
    }

    // 7. Core behavior instructions
    sections.push(this.buildCoreBehavior());

    // 8. Tool usage rules
    sections.push(this.buildToolUsageRules());

    return sections.join('\n\n');
  }

  /**
   * Build goal-specific context
   */
  private buildGoalSection(goal?: string | null): string {
    const goalType = goal || 'NOT SET';
    const goalDescription = goal && GOAL_CONTEXTS[goal]
      ? GOAL_CONTEXTS[goal]
      : 'No specific goal has been set for this campaign yet.';

    return `# CAMPAIGN GOAL: ${goalType.toUpperCase()}

${goalDescription}

## Your Primary Directive
${goal ? `Every creative, copy suggestion, image generation, and recommendation MUST align with the **${goal}** goal defined above.` : 'Once a goal is set, ensure all creative decisions align with that goal.'}`;
  }

  /**
   * Build edit mode instructions
   */
  private buildEditMode(referenceContext: string): string {
    return `# 🚨 CRITICAL: EDITING MODE ACTIVE 🚨

You are editing an EXISTING ad variation.

**EDITING CONTEXT:**
${referenceContext}

**MANDATORY RULES:**
1. ❌ NEVER CALL generateVariations - User is editing ONE variation
2. ✅ For MODIFICATIONS → Call editVariation immediately
3. ✅ For NEW VERSION → Call regenerateVariation immediately
4. ✅ Use variationIndex from context - REQUIRED

**After calling tool, DO NOT output any text.**`;
  }

  /**
   * Build location setup mode instructions
   */
  private buildLocationSetupMode(locationInput: string): string {
    return `# 🎯 CRITICAL: LOCATION SETUP MODE ACTIVE 🎯

The user provided location: "${locationInput}"

YOU MUST CALL THE addLocations TOOL NOW.

**CRITICAL RULES:**
1. Process ONLY: "${locationInput}"
2. DO NOT suggest multiple locations
3. DO NOT call any other tools
4. Call addLocations immediately

**Mode Detection:**
- If user said "exclude" → mode: "exclude"
- Otherwise → mode: "include"

CALL THE TOOL NOW. DO NOT OUTPUT ANY OTHER TEXT.`;
  }

  /**
   * Build core behavior section
   */
  private buildCoreBehavior(): string {
    return `## Core Behavior: Smart Conversation, Then Action
- **Smart questions**: Ask ONE helpful question that gathers multiple details at once
- **Don't overwhelm**: Never ask more than 1-2 questions before acting
- **Be decisive**: Once you have enough context, USE TOOLS immediately
- **Be friendly, brief, enthusiastic**`;
  }

  /**
   * Build tool usage rules
   */
  private buildToolUsageRules(): string {
    return `## 🛠️ Tool Usage Rules

**NEVER MIX TOOL TYPES:**
- ❌ Creative tools + Build tools in same response
- ✅ ONE tool category per response

**Tool Categories:**
- Creative: generateVariations, editVariation, regenerateVariation
- Copy: editCopy, refineHeadline, refinePrimaryText
- Targeting: addLocations, removeLocation
- Campaign: createAd, renameAd, deleteAd`;
  }
}

// Export singleton instance
export const systemPromptService = new SystemPromptService();

