/**
 * Feature: Journey Validation Utilities
 * Purpose: Input/output validation helpers for journeys and services
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

import type { ValidationResult } from '../types/journey-contracts';

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation Rule
 */
export type ValidationRule<T = unknown> = (value: T) => ValidationError | null;

/**
 * Create a validation result
 */
export function createValidationResult(
  valid: boolean,
  errors: ValidationError[] = []
): ValidationResult {
  return { valid, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Success validation result
 */
export function validationSuccess(): ValidationResult {
  return { valid: true };
}

/**
 * Failure validation result
 */
export function validationFailure(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}

// ============================================================================
// Common Validation Rules
// ============================================================================

/**
 * Required field validation
 */
export function required(fieldName: string, message?: string): ValidationRule {
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return {
        field: fieldName,
        message: message || `${fieldName} is required`,
        code: 'required',
      };
    }
    return null;
  };
}

/**
 * String length validation
 */
export function stringLength(
  fieldName: string,
  min?: number,
  max?: number,
  message?: string
): ValidationRule<string> {
  return (value: string) => {
    if (typeof value !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName} must be a string`,
        code: 'type_error',
      };
    }

    if (min !== undefined && value.length < min) {
      return {
        field: fieldName,
        message: message || `${fieldName} must be at least ${min} characters`,
        code: 'min_length',
      };
    }

    if (max !== undefined && value.length > max) {
      return {
        field: fieldName,
        message: message || `${fieldName} must be at most ${max} characters`,
        code: 'max_length',
      };
    }

    return null;
  };
}

/**
 * Number range validation
 */
export function numberRange(
  fieldName: string,
  min?: number,
  max?: number,
  message?: string
): ValidationRule<number> {
  return (value: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return {
        field: fieldName,
        message: `${fieldName} must be a number`,
        code: 'type_error',
      };
    }

    if (min !== undefined && value < min) {
      return {
        field: fieldName,
        message: message || `${fieldName} must be at least ${min}`,
        code: 'min_value',
      };
    }

    if (max !== undefined && value > max) {
      return {
        field: fieldName,
        message: message || `${fieldName} must be at most ${max}`,
        code: 'max_value',
      };
    }

    return null;
  };
}

/**
 * Email validation
 */
export function email(fieldName: string, message?: string): ValidationRule<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return (value: string) => {
    if (typeof value !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName} must be a string`,
        code: 'type_error',
      };
    }

    if (!emailRegex.test(value)) {
      return {
        field: fieldName,
        message: message || `${fieldName} must be a valid email`,
        code: 'invalid_email',
      };
    }

    return null;
  };
}

/**
 * URL validation
 */
export function url(fieldName: string, message?: string): ValidationRule<string> {
  return (value: string) => {
    if (typeof value !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName} must be a string`,
        code: 'type_error',
      };
    }

    try {
      new URL(value);
      return null;
    } catch {
      return {
        field: fieldName,
        message: message || `${fieldName} must be a valid URL`,
        code: 'invalid_url',
      };
    }
  };
}

/**
 * Enum validation
 */
export function enumValue<T extends string>(
  fieldName: string,
  allowedValues: readonly T[],
  message?: string
): ValidationRule<T> {
  return (value: T) => {
    if (!allowedValues.includes(value)) {
      return {
        field: fieldName,
        message: message || `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        code: 'invalid_enum',
      };
    }
    return null;
  };
}

/**
 * Array validation
 */
export function array(
  fieldName: string,
  minLength?: number,
  maxLength?: number,
  message?: string
): ValidationRule<unknown[]> {
  return (value: unknown[]) => {
    if (!Array.isArray(value)) {
      return {
        field: fieldName,
        message: `${fieldName} must be an array`,
        code: 'type_error',
      };
    }

    if (minLength !== undefined && value.length < minLength) {
      return {
        field: fieldName,
        message: message || `${fieldName} must have at least ${minLength} items`,
        code: 'min_items',
      };
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return {
        field: fieldName,
        message: message || `${fieldName} must have at most ${maxLength} items`,
        code: 'max_items',
      };
    }

    return null;
  };
}

/**
 * Custom validation rule
 */
export function custom<T = unknown>(
  fieldName: string,
  predicate: (value: T) => boolean,
  message: string,
  code = 'custom_validation'
): ValidationRule<T> {
  return (value: T) => {
    if (!predicate(value)) {
      return { field: fieldName, message, code };
    }
    return null;
  };
}

// ============================================================================
// Validation Runner
// ============================================================================

/**
 * Run multiple validation rules
 */
export function validate<T = unknown>(
  value: T,
  rules: ValidationRule<T>[]
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const error = rule(value);
    if (error) {
      errors.push(error);
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate an object with field-specific rules
 */
export function validateObject<T extends Record<string, unknown>>(
  obj: T,
  rules: { [K in keyof T]?: ValidationRule<T[K]>[] }
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    if (!fieldRules || !Array.isArray(fieldRules)) continue;

    const value = obj[field as keyof T];
    
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors.push(error);
      }
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Combine validation results
 */
export function combineValidationResults(
  ...results: ValidationResult[]
): ValidationResult {
  const allErrors: ValidationError[] = [];

  for (const result of results) {
    if (!result.valid && result.errors) {
      allErrors.push(...result.errors);
    }
  }

  return createValidationResult(allErrors.length === 0, allErrors);
}

/**
 * Assert validation result (throws if invalid)
 */
export function assertValid(result: ValidationResult, errorPrefix = 'Validation failed'): void {
  if (!result.valid) {
    const messages = result.errors?.map(e => `${e.field}: ${e.message}`).join(', ') || 'Unknown error';
    throw new Error(`${errorPrefix}: ${messages}`);
  }
}

