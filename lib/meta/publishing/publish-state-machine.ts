/**
 * Feature: Publishing State Machine
 * Purpose: Finite state machine to manage publishing workflow with persistence
 * References:
 *  - State Machine Pattern: https://en.wikipedia.org/wiki/Finite-state_machine
 */

import type { 
  PublishingStage, 
  PublishingState, 
  CreatedMetaObjects,
  PublishError 
} from '../types/publishing';
import { getStageProgress } from '../config/publishing-config';
import { supabaseServer } from '../../supabase/server';

// ============================================================================
// STATE MACHINE CLASS
// ============================================================================

export class PublishStateMachine {
  private campaignId: string;
  private state: PublishingState;

  constructor(campaignId: string) {
    this.campaignId = campaignId;
    this.state = this.getInitialState();
  }

  /**
   * Get initial state
   */
  private getInitialState(): PublishingState {
    return {
      stage: 'IDLE',
      progress: 0,
      message: 'Ready to publish',
      completedOperations: [],
      createdObjects: {}
    };
  }

  /**
   * Get current state
   */
  getState(): PublishingState {
    return { ...this.state };
  }

  /**
   * Get current stage
   */
  getStage(): PublishingStage {
    return this.state.stage;
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    return this.state.progress;
  }

  /**
   * Transition to a new stage
   */
  async transitionTo(
    stage: PublishingStage,
    message: string,
    currentOperation?: string
  ): Promise<void> {
    // Validate transition
    if (!this.isValidTransition(this.state.stage, stage)) {
      throw new Error(`Invalid state transition from ${this.state.stage} to ${stage}`);
    }

    // Update state
    this.state = {
      ...this.state,
      stage,
      progress: getStageProgress(stage),
      message,
      currentOperation
    };

    // Set started time if transitioning from IDLE
    if (this.state.stage === 'PREPARING' && !this.state.startedAt) {
      this.state.startedAt = new Date().toISOString();
    }

    // Set completed time if transitioning to COMPLETE or FAILED
    if (stage === 'COMPLETE' || stage === 'FAILED') {
      this.state.completedAt = new Date().toISOString();
    }

    // Persist state to database
    await this.persistState();
  }

  /**
   * Mark operation as completed
   */
  completeOperation(operation: string): void {
    if (!this.state.completedOperations.includes(operation)) {
      this.state.completedOperations.push(operation);
    }
  }

  /**
   * Store created Meta object IDs
   */
  storeCreatedObject(
    type: 'imageHash' | 'creativeId' | 'campaignId' | 'adSetId' | 'adId',
    value: string
  ): void {
    switch (type) {
      case 'imageHash':
        if (!this.state.createdObjects.imageHashes) {
          this.state.createdObjects.imageHashes = [];
        }
        this.state.createdObjects.imageHashes.push(value);
        break;

      case 'creativeId':
        if (!this.state.createdObjects.creativeIds) {
          this.state.createdObjects.creativeIds = [];
        }
        this.state.createdObjects.creativeIds.push(value);
        break;

      case 'campaignId':
        this.state.createdObjects.campaignId = value;
        break;

      case 'adSetId':
        this.state.createdObjects.adSetId = value;
        break;

      case 'adId':
        if (!this.state.createdObjects.adIds) {
          this.state.createdObjects.adIds = [];
        }
        this.state.createdObjects.adIds.push(value);
        break;
    }
  }

  /**
   * Set error state
   */
  async setError(error: PublishError): Promise<void> {
    this.state = {
      ...this.state,
      stage: 'FAILED',
      progress: 0,
      message: error.userMessage,
      error,
      completedAt: new Date().toISOString()
    };

    await this.persistState();
  }

  /**
   * Reset state to IDLE
   */
  async reset(): Promise<void> {
    this.state = this.getInitialState();
    await this.persistState();
  }

  /**
   * Get created Meta objects
   */
  getCreatedObjects(): CreatedMetaObjects {
    return { ...this.state.createdObjects };
  }

  /**
   * Check if can resume from failed state
   */
  canResume(): boolean {
    return this.state.stage === 'FAILED' && !!this.state.createdObjects.campaignId;
  }

  /**
   * Get resume point (last successful stage)
   */
  getResumePoint(): PublishingStage | null {
    if (!this.canResume()) {
      return null;
    }

    const { createdObjects } = this.state;

    // Determine where we left off based on what was created
    if (createdObjects.adIds && createdObjects.adIds.length > 0) {
      return 'VERIFYING'; // Ads created, just need to verify
    }

    if (createdObjects.adSetId) {
      return 'CREATING_ADS'; // AdSet created, need to create ads
    }

    if (createdObjects.campaignId) {
      return 'CREATING_ADSET'; // Campaign created, need to create adset
    }

    if (createdObjects.creativeIds && createdObjects.creativeIds.length > 0) {
      return 'CREATING_CAMPAIGN'; // Creatives created, need to create campaign
    }

    if (createdObjects.imageHashes && createdObjects.imageHashes.length > 0) {
      return 'CREATING_CREATIVES'; // Images uploaded, need to create creatives
    }

    return 'UPLOADING_IMAGES'; // Start from beginning
  }

  // ============================================================================
  // STATE VALIDATION
  // ============================================================================

  /**
   * Validate state transition
   */
  private isValidTransition(from: PublishingStage, to: PublishingStage): boolean {
    const validTransitions: Record<PublishingStage, PublishingStage[]> = {
      'IDLE': ['PREPARING', 'FAILED'],
      'PREPARING': ['VALIDATING', 'FAILED'],
      'VALIDATING': ['UPLOADING_IMAGES', 'FAILED'],
      'UPLOADING_IMAGES': ['CREATING_CREATIVES', 'FAILED'],
      'CREATING_CREATIVES': ['CREATING_CAMPAIGN', 'FAILED'],
      'CREATING_CAMPAIGN': ['CREATING_ADSET', 'FAILED'],
      'CREATING_ADSET': ['CREATING_ADS', 'FAILED'],
      'CREATING_ADS': ['VERIFYING', 'FAILED'],
      'VERIFYING': ['COMPLETE', 'FAILED'],
      'COMPLETE': ['IDLE'], // Can reset
      'FAILED': ['IDLE', 'ROLLING_BACK'], // Can reset or rollback
      'ROLLING_BACK': ['IDLE', 'FAILED']
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Persist state to database
   */
  private async persistState(): Promise<void> {
    try {
      // Store state in campaign_meta_connections or a dedicated table
      // For now, we'll store minimal state in meta_published_campaigns
      const { error } = await supabaseServer
        .from('meta_published_campaigns')
        .upsert({
          campaign_id: this.campaignId,
          publish_status: this.mapStageToStatus(this.state.stage),
          meta_campaign_id: this.state.createdObjects.campaignId || 'pending',
          meta_adset_id: this.state.createdObjects.adSetId || 'pending',
          meta_ad_ids: this.state.createdObjects.adIds || [],
          error_message: this.state.error?.message || null,
          published_at: this.state.stage === 'COMPLETE' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'campaign_id' });

      if (error) {
        console.error('[PublishStateMachine] Failed to persist state:', error);
        // Don't throw - state persistence failure shouldn't block publishing
      }
    } catch (error) {
      console.error('[PublishStateMachine] Persist exception:', error);
      // Don't throw
    }
  }

  /**
   * Load state from database
   */
  async loadState(): Promise<void> {
    try {
      const { data, error } = await supabaseServer
        .from('meta_published_campaigns')
        .select('*')
        .eq('campaign_id', this.campaignId)
        .maybeSingle();

      if (error) {
        console.error('[PublishStateMachine] Failed to load state:', error);
        return;
      }

      if (data) {
        // Reconstruct state from database
        this.state = {
          stage: this.mapStatusToStage(data.publish_status),
          progress: getStageProgress(this.mapStatusToStage(data.publish_status)),
          message: data.error_message || 'Loaded from database',
          completedOperations: [], // Not stored
          createdObjects: {
            campaignId: data.meta_campaign_id !== 'pending' ? data.meta_campaign_id : undefined,
            adSetId: data.meta_adset_id !== 'pending' ? data.meta_adset_id : undefined,
            adIds: data.meta_ad_ids.length > 0 ? data.meta_ad_ids : undefined
          },
          error: data.error_message ? {
            code: 'UNKNOWN',
            message: data.error_message,
            userMessage: data.error_message,
            recoverable: false,
            stage: this.mapStatusToStage(data.publish_status),
            timestamp: data.updated_at
          } : undefined,
          completedAt: data.published_at || undefined
        };
      }
    } catch (error) {
      console.error('[PublishStateMachine] Load exception:', error);
      // Keep default state
    }
  }

  /**
   * Map publishing stage to database status
   */
  private mapStageToStatus(stage: PublishingStage): string {
    const mapping: Record<PublishingStage, string> = {
      'IDLE': 'idle',
      'PREPARING': 'publishing',
      'VALIDATING': 'publishing',
      'UPLOADING_IMAGES': 'publishing',
      'CREATING_CREATIVES': 'publishing',
      'CREATING_CAMPAIGN': 'publishing',
      'CREATING_ADSET': 'publishing',
      'CREATING_ADS': 'publishing',
      'VERIFYING': 'publishing',
      'COMPLETE': 'active',
      'FAILED': 'error',
      'ROLLING_BACK': 'error'
    };

    return mapping[stage] || 'idle';
  }

  /**
   * Map database status to publishing stage
   */
  private mapStatusToStage(status: string): PublishingStage {
    const mapping: Record<string, PublishingStage> = {
      'idle': 'IDLE',
      'publishing': 'PREPARING',
      'active': 'COMPLETE',
      'paused': 'COMPLETE',
      'error': 'FAILED'
    };

    return mapping[status] || 'IDLE';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a state machine instance
 */
export function createPublishStateMachine(campaignId: string): PublishStateMachine {
  return new PublishStateMachine(campaignId);
}

/**
 * Load existing state machine from database
 */
export async function loadPublishStateMachine(campaignId: string): Promise<PublishStateMachine> {
  const machine = new PublishStateMachine(campaignId);
  await machine.loadState();
  return machine;
}

