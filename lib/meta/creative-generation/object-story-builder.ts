/**
 * Feature: Object Story Spec Builder
 * Purpose: Build Meta API v24.0 object_story_spec structures for ad creatives
 * References:
 *  - Object Story Spec: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-object-story-spec
 *  - Link Data: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data
 *  - Call to Action: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action
 */

import type {
  ObjectStorySpec,
  LinkData,
  CallToAction,
  CTAType,
  GoalType,
  DestinationType
} from '../types/publishing';
import { TEXT_LIMITS } from '../config/publishing-config';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildObjectStorySpecParams {
  pageId: string;
  instagramActorId?: string | null;
  destinationType: DestinationType;
  destinationUrl?: string;
  leadFormId?: string;
  phoneNumber?: string;
  primaryText: string;
  headline: string;
  description?: string;
  ctaType: CTAType;
  imageHash?: string;
  imageUrl?: string;
}

export interface BuildLinkDataParams {
  link: string;
  message: string;
  name: string;
  description?: string;
  ctaType: CTAType;
  imageHash?: string;
  imageUrl?: string;
  leadFormId?: string;
}

// ============================================================================
// OBJECT STORY SPEC BUILDER CLASS
// ============================================================================

export class ObjectStoryBuilder {
  /**
   * Build complete object_story_spec for Meta creative
   */
  buildObjectStorySpec(params: BuildObjectStorySpecParams): ObjectStorySpec {
    const {
      pageId,
      instagramActorId,
      destinationType,
      destinationUrl,
      leadFormId,
      phoneNumber,
      primaryText,
      headline,
      description,
      ctaType,
      imageHash,
      imageUrl
    } = params;

    // Validate required fields
    if (!pageId) {
      throw new Error('pageId is required for object_story_spec');
    }

    // Build base spec
    const spec: ObjectStorySpec = {
      page_id: pageId
    };

    // Add Instagram actor if available
    if (instagramActorId) {
      spec.instagram_actor_id = instagramActorId;
    }

    // Build link_data based on destination type
    if (destinationType === 'website' || destinationType === 'call') {
      const link = this.getDestinationLink(destinationType, destinationUrl, phoneNumber);

      spec.link_data = this.buildLinkData({
        link,
        message: primaryText,
        name: headline,
        description,
        ctaType,
        imageHash,
        imageUrl,
        leadFormId: undefined
      });
    } else if (destinationType === 'form') {
      // Lead form destination
      if (!leadFormId) {
        throw new Error('leadFormId is required for form destination type');
      }

      // For lead forms, still provide a link (to privacy policy or fallback)
      const link = destinationUrl || 'https://www.facebook.com/';

      spec.link_data = this.buildLinkData({
        link,
        message: primaryText,
        name: headline,
        description,
        ctaType,
        imageHash,
        imageUrl,
        leadFormId
      });
    }

    return spec;
  }

  /**
   * Build link_data object for object_story_spec
   */
  buildLinkData(params: BuildLinkDataParams): LinkData {
    const {
      link,
      message,
      name,
      description,
      ctaType,
      imageHash,
      imageUrl,
      leadFormId
    } = params;

    // Validate and sanitize text
    const sanitizedMessage = this.sanitizeText(message, TEXT_LIMITS.primaryText.max);
    const sanitizedHeadline = this.sanitizeText(name, TEXT_LIMITS.headline.max);
    const sanitizedDescription = description 
      ? this.sanitizeText(description, TEXT_LIMITS.description.max)
      : undefined;

    // Build call to action
    const callToAction = this.buildCallToAction(ctaType, link, leadFormId);

    // Build link data
    const linkData: LinkData = {
      link,
      message: sanitizedMessage,
      name: sanitizedHeadline,
      call_to_action: callToAction
    };

    // Add optional fields
    if (sanitizedDescription) {
      linkData.description = sanitizedDescription;
    }

    if (imageHash) {
      linkData.image_hash = imageHash;
    }

    // Note: image_hash is preferred over picture URL
    // If only imageUrl is provided (no hash yet), we'll set it later after upload
    if (!imageHash && imageUrl) {
      linkData.picture = imageUrl;
    }

    return linkData;
  }

  /**
   * Build call_to_action object
   */
  buildCallToAction(
    ctaType: CTAType,
    destinationLink?: string,
    leadFormId?: string
  ): CallToAction {
    const cta: CallToAction = {
      type: ctaType
    };

    // Add value object for specific CTA types
    if (leadFormId) {
      cta.value = {
        lead_gen_form_id: leadFormId
      };
    } else if (destinationLink && ctaType !== 'NO_BUTTON') {
      cta.value = {
        link: destinationLink
      };
    }

    return cta;
  }

  /**
   * Get destination link based on type
   */
  private getDestinationLink(
    destinationType: DestinationType,
    websiteUrl?: string,
    phoneNumber?: string
  ): string {
    if (destinationType === 'call') {
      if (!phoneNumber) {
        throw new Error('Phone number required for call destination');
      }
      // Meta expects tel: protocol for call CTAs
      return phoneNumber.startsWith('tel:') ? phoneNumber : `tel:${phoneNumber}`;
    }

    if (destinationType === 'website') {
      if (!websiteUrl) {
        throw new Error('Website URL required for website destination');
      }
      return this.normalizeUrl(websiteUrl);
    }

    throw new Error(`Unsupported destination type: ${destinationType}`);
  }

  /**
   * Normalize URL to ensure it has protocol
   */
  private normalizeUrl(url: string): string {
    const trimmed = url.trim();

    // If URL already has protocol, return as-is
    if (trimmed.match(/^https?:\/\//i)) {
      return trimmed;
    }

    // Add https:// by default
    return `https://${trimmed}`;
  }

  /**
   * Basic text sanitization (removes control characters)
   */
  private sanitizeText(text: string, maxLength: number): string {
    // Remove control characters and excessive whitespace
    let sanitized = text
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Truncate if needed
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an object story builder instance
 */
export function createObjectStoryBuilder(): ObjectStoryBuilder {
  return new ObjectStoryBuilder();
}

/**
 * Quick helper to build link_data for common use cases
 */
export function buildSimpleLinkData(
  link: string,
  primaryText: string,
  headline: string,
  ctaType: CTAType = 'LEARN_MORE',
  imageHash?: string
): LinkData {
  const builder = new ObjectStoryBuilder();
  return builder.buildLinkData({
    link,
    message: primaryText,
    name: headline,
    ctaType,
    imageHash
  });
}

/**
 * Build call to action for lead form
 */
export function buildLeadFormCTA(leadFormId: string, ctaType: CTAType = 'SIGN_UP'): CallToAction {
  const builder = new ObjectStoryBuilder();
  return builder.buildCallToAction(ctaType, undefined, leadFormId);
}

/**
 * Build call to action for website
 */
export function buildWebsiteCTA(websiteUrl: string, ctaType: CTAType = 'LEARN_MORE'): CallToAction {
  const builder = new ObjectStoryBuilder();
  return builder.buildCallToAction(ctaType, websiteUrl);
}

/**
 * Build call to action for phone call
 */
export function buildCallCTA(phoneNumber: string): CallToAction {
  const builder = new ObjectStoryBuilder();
  const tel = phoneNumber.startsWith('tel:') ? phoneNumber : `tel:${phoneNumber}`;
  return builder.buildCallToAction('CALL_NOW', tel);
}

