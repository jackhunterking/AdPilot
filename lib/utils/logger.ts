/**
 * Feature: Simple Logger Utility
 * Purpose: Provide console logging with context labels
 */

export const logger = {
  debug: (context: string, ...args: unknown[]) => {
    if (process.env.NEXT_PUBLIC_DEBUG === '1' || process.env.NODE_ENV === 'development') {
      console.log(`[${context}]`, ...args);
    }
  },
  
  info: (context: string, ...args: unknown[]) => {
    console.log(`[${context}]`, ...args);
  },
  
  warn: (context: string, ...args: unknown[]) => {
    console.warn(`[${context}]`, ...args);
  },
  
  error: (context: string, ...args: unknown[]) => {
    console.error(`[${context}]`, ...args);
  },
};
