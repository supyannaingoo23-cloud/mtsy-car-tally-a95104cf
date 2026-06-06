// Global number formatting helpers — three-digit comma separators

/** Format a number with thousands separators. Returns "" for null/undefined/NaN. */
export function fmtNumber(n: number | null | undefined, opts?: { decimals?: number }): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: opts?.decimals ?? 0,
    maximumFractionDigits: opts?.decimals ?? 0,
  });
}

/**
 * Format a liters value, preserving up to 2 decimals when fractional,
 * otherwise showing as an integer. Examples: 35 -> "35", 19.05 -> "19.05".
 */
export function fmtLiters(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  const num = Number(n);
  const hasFraction = Math.abs(num - Math.trunc(num)) > 1e-9;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

/** Strip non-numeric chars (keep digits, minus, decimal point) and parse. */
export function parseNumber(input: string): number {
  if (!input) return 0;
  const cleaned = String(input).replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Format a string while user types — adds commas to integer part, preserves decimal tail. */
export function formatWhileTyping(raw: string): string {
  if (raw === "" || raw === "-") return raw;
  // Allow trailing dot during typing
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const cleaned = body.replace(/[^\d.]/g, "");
  if (!cleaned) return negative ? "-" : "";
  const [intPart, ...rest] = cleaned.split(".");
  const decPart = rest.length ? "." + rest.join("").slice(0, 2) : "";
  const intNum = intPart.replace(/^0+(?=\d)/, "") || "0";
  const withCommas = Number(intNum).toLocaleString("en-US");
  return (negative ? "-" : "") + withCommas + decPart;
}
