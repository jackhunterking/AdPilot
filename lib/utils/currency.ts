/**
 * Feature: Launch - Budget Currency Formatting
 * Purpose: Map ISO 4217 currency codes to display symbols with safe fallbacks.
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#core-concepts
 *  - AI Elements: https://ai-sdk.dev/elements/overview#styling
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#overview
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "$",
  NZD: "$",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
  SGD: "$",
  MXN: "$",
  BRL: "R$",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
};

export function getCurrencySymbol(code: string | null | undefined): {
  symbol: string;
  code: string;
} {
  const normalized = typeof code === "string" && code.trim().length === 3 ? code.trim().toUpperCase() : "USD";
  const symbol = CURRENCY_SYMBOLS[normalized] ?? "$";
  return { symbol, code: normalized };
}


