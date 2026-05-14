// Hard-coded prices to prevent admin-edit accidents from breaking pricing.
// Source of truth — overrides anything in the DB.
export const HARD_PRICES: Record<string, number> = {
  xeno: 15.99,
  superxeno: 24.99,
  hyperxeno: 39.99,
};

function normalizeKey(key: string): string {
  return (key || "").toLowerCase().replace(/[^a-z]/g, "");
}

/** Returns USD price. Hardcoded prices override fallback when a known key matches. */
export function getPrice(productKey: string, fallbackCents: number): number {
  const k = normalizeKey(productKey);
  if (k in HARD_PRICES) return HARD_PRICES[k];
  return (fallbackCents || 0) / 100;
}

export function formatPrice(productKey: string, fallbackCents: number, digits = 2): string {
  return `$${getPrice(productKey, fallbackCents).toFixed(digits)}`;
}
