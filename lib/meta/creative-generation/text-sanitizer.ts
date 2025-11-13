/**
 * Feature: Creative Text Sanitizer
 * Purpose: Sanitize and validate creative text for Meta policy compliance
 * References:
 *  - Meta Ad Policies: https://www.facebook.com/policies/ads
 *  - Meta Text Specifications: https://developers.facebook.com/docs/marketing-api/creative-specifications
 */

import { TEXT_LIMITS } from '../config/publishing-config';

// ============================================================================
// TYPES
// ============================================================================

export interface SanitizationResult {
  sanitized: string;
  original: string;
  wasTruncated: boolean;
  wasModified: boolean;
  warnings: string[];
}

export interface PolicyCheckResult {
  compliant: boolean;
  violations: PolicyViolation[];
  warnings: string[];
}

export interface PolicyViolation {
  type: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  suggestion?: string;
}

// ============================================================================
// TEXT SANITIZER CLASS
// ============================================================================

export class TextSanitizer {
  /**
   * Sanitize text for Meta creative use
   * Removes control characters, normalizes whitespace, truncates to limit
   */
  sanitize(text: string, maxLength: number, preserveWordBoundaries: boolean = true): SanitizationResult {
    const original = text;
    let sanitized = text;
    const warnings: string[] = [];
    let wasTruncated = false;
    let wasModified = false;

    // Step 1: Remove control characters
    const withoutControl = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    if (withoutControl !== sanitized) {
      wasModified = true;
      warnings.push('Removed control characters');
    }
    sanitized = withoutControl;

    // Step 2: Normalize whitespace
    const normalized = sanitized.replace(/\s+/g, ' ').trim();
    if (normalized !== sanitized) {
      wasModified = true;
    }
    sanitized = normalized;

    // Step 3: Remove excessive punctuation
    const withoutExcessivePunct = sanitized.replace(/([!?]){3,}/g, '$1$1');
    if (withoutExcessivePunct !== sanitized) {
      wasModified = true;
      warnings.push('Reduced excessive punctuation');
    }
    sanitized = withoutExcessivePunct;

    // Step 4: Truncate if needed
    if (sanitized.length > maxLength) {
      wasTruncated = true;
      wasModified = true;

      if (preserveWordBoundaries) {
        // Try to cut at word boundary
        const truncated = sanitized.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');

        // If we have a word boundary and it's not too far back (>80% of max), use it
        if (lastSpace > maxLength * 0.8) {
          sanitized = truncated.substring(0, lastSpace).trim();
        } else {
          // Hard cut
          sanitized = truncated.trim();
        }
      } else {
        sanitized = sanitized.substring(0, maxLength).trim();
      }

      warnings.push(`Truncated from ${original.length} to ${sanitized.length} characters`);
    }

    return {
      sanitized,
      original,
      wasTruncated,
      wasModified,
      warnings
    };
  }

  /**
   * Sanitize primary text (125 chars for feed)
   */
  sanitizePrimaryText(text: string): SanitizationResult {
    return this.sanitize(text, TEXT_LIMITS.primaryText.feed, true);
  }

  /**
   * Sanitize headline (40 chars max)
   */
  sanitizeHeadline(text: string): SanitizationResult {
    return this.sanitize(text, TEXT_LIMITS.headline.max, true);
  }

  /**
   * Sanitize description (30 chars max)
   */
  sanitizeDescription(text: string): SanitizationResult {
    return this.sanitize(text, TEXT_LIMITS.description.max, true);
  }

  /**
   * Check text for policy violations
   */
  checkPolicyCompliance(text: string): PolicyCheckResult {
    const violations: PolicyViolation[] = [];
    const warnings: string[] = [];

    // Check for excessive caps (>80% capitals)
    if (this.hasExcessiveCaps(text)) {
      violations.push({
        type: 'EXCESSIVE_CAPS',
        severity: 'WARNING',
        message: 'Text contains excessive capitalization',
        suggestion: 'Use sentence case or title case instead of ALL CAPS'
      });
    }

    // Check for prohibited content patterns
    const prohibitedPatterns = this.getProhibitedPatterns();
    for (const pattern of prohibitedPatterns) {
      if (pattern.regex.test(text.toLowerCase())) {
        violations.push({
          type: pattern.type,
          severity: 'WARNING',
          message: pattern.message,
          suggestion: pattern.suggestion
        });
      }
    }

    // Check for suspicious patterns (before/after, weight loss claims, etc.)
    const suspiciousPatterns = this.getSuspiciousPatterns();
    for (const pattern of suspiciousPatterns) {
      if (pattern.regex.test(text.toLowerCase())) {
        warnings.push(pattern.message);
      }
    }

    // Check for excessive emoji
    if (this.hasExcessiveEmoji(text)) {
      warnings.push('Text contains many emojis, which may reduce engagement');
    }

    // Check for special characters that might cause issues
    if (this.hasProblematicCharacters(text)) {
      warnings.push('Text contains special characters that may not render correctly');
    }

    return {
      compliant: violations.filter(v => v.severity === 'ERROR').length === 0,
      violations,
      warnings
    };
  }

  /**
   * Remove emoji from text
   */
  removeEmoji(text: string): string {
    // Remove emoji using ES2017 compatible regex
    // eslint-disable-next-line no-misleading-character-class
    return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Surrogate pairs (emoji)
      .replace(/[\u2600-\u27BF]/g, '') // Misc symbols
      .replace(/\s+/g, ' ') // Clean up extra spaces
      .trim();
  }

  /**
   * Clean text for Meta (comprehensive)
   */
  cleanForMeta(text: string): string {
    return text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([!?]){3,}/g, '$1$1') // Reduce excessive punctuation
      .trim();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Check if text has excessive capitalization
   */
  private hasExcessiveCaps(text: string): boolean {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return false;

    const caps = text.replace(/[^A-Z]/g, '');
    const capsRatio = caps.length / letters.length;

    return capsRatio > 0.8; // >80% caps
  }

  /**
   * Check if text has excessive emoji
   */
  private hasExcessiveEmoji(text: string): boolean {
    // Count surrogate pairs (most emoji) and basic emoji symbols
    // eslint-disable-next-line no-misleading-character-class
    const surrogatePairs = (text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length;
    const basicEmoji = (text.match(/[\u2600-\u27BF]/g) || []).length;
    const emojiCount = surrogatePairs + basicEmoji;
    
    return emojiCount > 3;
  }

  /**
   * Check for problematic characters
   */
  private hasProblematicCharacters(text: string): boolean {
    // Check for zero-width characters, RTL marks, etc.
    const problematic = /[\u200B-\u200D\uFEFF\u202A-\u202E]/;
    return problematic.test(text);
  }

  /**
   * Get patterns for prohibited content
   */
  private getProhibitedPatterns(): Array<{
    regex: RegExp;
    type: string;
    message: string;
    suggestion: string;
  }> {
    return [
      {
        regex: /\b(click here|click now)\b/i,
        type: 'CLICKBAIT',
        message: 'Avoid generic click instructions',
        suggestion: 'Use specific action-oriented language'
      },
      {
        regex: /\b(100% free|totally free|absolutely free)\b/i,
        type: 'MISLEADING',
        message: 'Avoid absolute claims unless genuinely accurate',
        suggestion: 'Be specific about what is free'
      }
    ];
  }

  /**
   * Get patterns for suspicious content
   */
  private getSuspiciousPatterns(): Array<{
    regex: RegExp;
    message: string;
  }> {
    return [
      {
        regex: /\b(lose \d+ (pounds|lbs|kg)|lose weight fast)\b/i,
        message: 'Weight loss claims may require additional review by Meta'
      },
      {
        regex: /\b(before and after|results may vary)\b/i,
        message: 'Before/after claims require proper disclaimers'
      },
      {
        regex: /\b(limited time|ends soon|hurry|act now)\b/i,
        message: 'Urgency claims should be genuine and specific'
      },
      {
        regex: /\b(guaranteed|promise|100%)\b/i,
        message: 'Absolute guarantees may be flagged'
      }
    ];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a text sanitizer instance
 */
export function createTextSanitizer(): TextSanitizer {
  return new TextSanitizer();
}

/**
 * Quick sanitize text to character limit
 */
export function sanitizeToLimit(text: string, maxLength: number): string {
  const sanitizer = new TextSanitizer();
  return sanitizer.sanitize(text, maxLength, true).sanitized;
}

/**
 * Remove all emoji from text
 */
export function removeAllEmoji(text: string): string {
  const sanitizer = new TextSanitizer();
  return sanitizer.removeEmoji(text);
}

/**
 * Clean text for Meta (remove HTML, control chars, etc.)
 */
export function cleanTextForMeta(text: string): string {
  const sanitizer = new TextSanitizer();
  return sanitizer.cleanForMeta(text);
}

/**
 * Truncate text at word boundary
 */
export function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace).trim();
  }

  return truncated.trim();
}

/**
 * Count emoji in text
 */
export function countEmoji(text: string): number {
  // eslint-disable-next-line no-misleading-character-class
  const surrogatePairs = (text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length;
  const basicEmoji = (text.match(/[\u2600-\u27BF]/g) || []).length;
  return surrogatePairs + basicEmoji;
}

/**
 * Check if text is likely to be policy compliant
 */
export function isLikelyCompliant(text: string): boolean {
  const sanitizer = new TextSanitizer();
  const result = sanitizer.checkPolicyCompliance(text);
  return result.compliant && result.violations.length === 0;
}

/**
 * Get policy warnings for text
 */
export function getPolicyWarnings(text: string): string[] {
  const sanitizer = new TextSanitizer();
  const result = sanitizer.checkPolicyCompliance(text);
  return [
    ...result.violations.map(v => v.message),
    ...result.warnings
  ];
}

