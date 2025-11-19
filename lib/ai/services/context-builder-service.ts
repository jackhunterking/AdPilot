/**
 * Feature: Context Builder Service
 * Purpose: Build AI context from conversation state and metrics
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Microservices: Extracted from app/api/v1/chat/route.ts
 */

import { getCachedMetrics } from '@/lib/meta/insights';
import type { ParsedMetadata } from './metadata-service';

// ============================================================================
// Types
// ============================================================================

export interface Conversation {
  id: string;
  campaign_id?: string | null;
  metadata?: unknown;
  title?: string | null;
  [key: string]: unknown;
}

export interface ContextBuilderInput {
  conversation: Conversation | null;
  parsed: ParsedMetadata;
  goalType?: string | null;
}

export interface BuiltContext {
  resultsContext: string;
  offerContext: string;
  planContext: string;
  tabInstructions: string;
}

// ============================================================================
// Context Builder Service
// ============================================================================

export class ContextBuilderService {
  /**
   * Build all context sections for AI
   */
  async buildContext(input: ContextBuilderInput): Promise<BuiltContext> {
    const { conversation, parsed, goalType } = input;

    // Build results context (if on results tab)
    const resultsContext = await this.buildResultsContext(
      parsed.activeTab,
      conversation?.campaign_id || null,
      goalType
    );

    // Build offer context
    const offerContext = this.buildOfferContext(conversation);

    // Build plan context
    const planContext = this.buildPlanContext(conversation);

    // Build tab instructions
    const tabInstructions = this.buildTabInstructions(parsed.activeTab);

    return {
      resultsContext,
      offerContext,
      planContext,
      tabInstructions,
    };
  }

  /**
   * Build results context (metrics snapshot)
   */
  private async buildResultsContext(
    activeTab: string,
    campaignId: string | null,
    goalType?: string | null
  ): Promise<string> {
    if (activeTab !== 'results' || !campaignId) {
      return '';
    }

    try {
      const metrics = await getCachedMetrics(campaignId, '7d');
      
      if (!metrics) {
        return '\n[RESULTS SNAPSHOT]\nNo cached metrics yet. Invite the user to refresh the Results tab.';
      }

      const resultLabel = goalType === 'leads' ? 'leads' : goalType === 'calls' ? 'calls' : 'results';
      
      return `\n[RESULTS SNAPSHOT]
- People reached: ${this.formatNumber(metrics.reach)}
- Total ${resultLabel}: ${this.formatNumber(metrics.results)}
- Amount spent: $${this.formatNumber(metrics.spend)}
- Cost per result: ${metrics.cost_per_result != null ? '$' + this.formatNumber(metrics.cost_per_result) : 'not enough data yet'}`;
    } catch (error) {
      console.warn('[ContextBuilder] Failed to load metrics:', error);
      return '';
    }
  }

  /**
   * Build offer context from conversation
   */
  private buildOfferContext(conversation: Conversation | null): string {
    if (!conversation?.metadata) {
      return '';
    }

    const conversationMeta = conversation.metadata as { offerText?: string };
    const offerText = conversationMeta.offerText;

    if (!offerText) {
      return `\n[OFFER REQUIRED - INITIAL SETUP]\nAsk ONE concise question to capture the user's concrete offer/value.
Do NOT call any tools yet. Wait for user's response.
After user answers: Acknowledge briefly (1 sentence) then IMMEDIATELY call generateVariations ONLY.`;
    }

    return `\n[CREATIVE PLAN ACTIVE]\nFollow plan coverage and constraints. Respect copy limits: primary ≤125, headline ≤40, description ≤30.`;
  }

  /**
   * Build plan context
   */
  private buildPlanContext(conversation: Conversation | null): string {
    // Placeholder for creative plan integration
    return '';
  }

  /**
   * Build tab-specific instructions
   */
  private buildTabInstructions(activeTab: string): string {
    if (activeTab === 'results') {
      return `\n[RESULTS MODE]\nThe user is viewing the Results tab. Focus on:
- Explaining metrics in plain language
- Suggesting optimizations based on the numbers above
- Offering to adjust budget, schedule, or targeting when helpful
Do NOT ask setup questions unless the user switches back to Setup.`;
    }

    return '';
  }

  /**
   * Format number helper
   */
  private formatNumber(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '0';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  }
}

// Export singleton
export const contextBuilderService = new ContextBuilderService();

