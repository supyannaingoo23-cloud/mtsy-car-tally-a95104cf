// Myanmar fuel quota logic: configurable liters every 7 full days, but reset only on EVEN day-of-month.
// Tracked PER REGION — each region has its own countdown.

import type { FuelFill } from "./db";

export const QUOTA_LITERS = 35; // legacy default; user can override in Settings
export const QUOTA_DAYS = 7;

export function isEvenDay(d: Date): boolean {
  return d.getDate() % 2 === 0;
}

/** Days between two dates, calendar-day based, ignoring time-of-day. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatEligibleDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} (${DAY_NAMES[d.getDay()]})`;
}

/**
 * Compute the next eligible refuel date:
 *   1. lastFill + 7 days
 *   2. if the result is an odd calendar day, bump forward to the next even day
 */
export function computeNextEligibleDate(lastFill: Date): Date {
  const base = addDays(lastFill, QUOTA_DAYS);
  return isEvenDay(base) ? base : addDays(base, 1);
}

/** Bump a date forward to the next even calendar day (returns same date if already even). */
function bumpToEvenDay(d: Date): Date {
  return isEvenDay(d) ? d : addDays(d, 1);
}

export type QuotaStatus = {
  region: string;
  lastFillDate: string | null;
  lastFillLiters: number;
  quotaTotal: number;
  remainingLiters: number;
  usedPercent: number; // 0-100
  daysSinceLastFill: number;
  daysUntilEligible: number; // 0 = eligible today
  isEvenToday: boolean;
  canRefuelToday: boolean;
  nextEligibleDate: string | null; // formatted, null if eligible today with no fill
  reason: string;
  badge: "available" | "waiting-even" | "countdown";
};

export function computeQuotaStatus(
  fills: FuelFill[],
  today = new Date(),
  region = "",
  quotaTotal = QUOTA_LITERS,
): QuotaStatus {
  // Defensive: drop malformed records so a bad row can never crash the dashboard.
  const safe = (Array.isArray(fills) ? fills : []).filter(
    (f) =>
      !!f &&
      typeof f.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(f.date) &&
      Number.isFinite(Number(f.liters)),
  );
  const safeQuota =
    Number.isFinite(quotaTotal) && quotaTotal > 0 ? quotaTotal : QUOTA_LITERS;

  const scoped = region
    ? safe.filter((f) => (f.region ?? "") === region)
    : safe;
  const sorted = [...scoped].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const evenToday = isEvenDay(today);

  if (!last) {
    // No fills yet → eligible immediately on the next even calendar day.
    const eligible = bumpToEvenDay(today);
    const daysLeft = Math.max(0, daysBetween(today, eligible));
    const ready = daysLeft === 0;
    return {
      region,
      lastFillDate: null,
      lastFillLiters: 0,
      quotaTotal: safeQuota,
      remainingLiters: safeQuota,
      usedPercent: 0,
      daysSinceLastFill: 0,
      daysUntilEligible: daysLeft,
      isEvenToday: evenToday,
      canRefuelToday: ready,
      nextEligibleDate: ready ? null : formatEligibleDate(eligible),
      reason: ready ? "✅ QUOTA READY" : "🚫 Waiting for Even Day",
      badge: ready ? "available" : "waiting-even",
    };
  }

  const lastDate = new Date(last.date + "T00:00:00");
  const daysSince = Math.max(0, daysBetween(lastDate, today));
  const lastLiters = Math.max(0, Number(last.liters) || 0);
  const usedPercent = Math.min(
    100,
    Math.max(0, Math.round((lastLiters / safeQuota) * 100)),
  );

  // Earliest eligible date is lastFill + 7 days, bumped to next even day if odd.
  // If that already passed, eligibility rolls forward to the next even day from today.
  const baseEligible = computeNextEligibleDate(lastDate);
  const eligibleDate =
    baseEligible.getTime() <= today.getTime()
      ? bumpToEvenDay(today)
      : baseEligible;

  // Days left is always computed dynamically from today → eligibleDate.
  const daysLeft = Math.max(0, daysBetween(today, eligibleDate));
  const ready = daysLeft === 0;

  if (ready) {
    return {
      region,
      lastFillDate: last.date,
      lastFillLiters: lastLiters,
      quotaTotal: safeQuota,
      remainingLiters: safeQuota, // eligible day → full quota available again
      usedPercent: 0,
      daysSinceLastFill: daysSince,
      daysUntilEligible: 0,
      isEvenToday: evenToday,
      canRefuelToday: true,
      nextEligibleDate: formatEligibleDate(eligibleDate),
      reason: "✅ QUOTA READY",
      badge: "available",
    };
  }

  // Pre-eligible: show remaining of the existing quota and dynamic countdown.
  const remaining = Math.max(0, safeQuota - lastLiters);
  const waitingForEven = daysSince >= QUOTA_DAYS && !isEvenDay(today);
  return {
    region,
    lastFillDate: last.date,
    lastFillLiters: lastLiters,
    quotaTotal: safeQuota,
    remainingLiters: remaining,
    usedPercent,
    daysSinceLastFill: daysSince,
    daysUntilEligible: daysLeft,
    isEvenToday: evenToday,
    canRefuelToday: false,
    nextEligibleDate: formatEligibleDate(eligibleDate),
    reason: waitingForEven
      ? "🚫 Waiting for Even Day"
      : `⏳ ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    badge: waitingForEven ? "waiting-even" : "countdown",
  };
}

/** Returns one status per region that has at least one fill (plus the user's selected region if any). */
export function computeAllRegionStatuses(
  fills: FuelFill[],
  selectedRegion: string | null,
  today = new Date(),
  quotaTotal = QUOTA_LITERS,
): QuotaStatus[] {
  const safeFills = Array.isArray(fills) ? fills : [];
  const regions = new Set<string>();
  safeFills.forEach((f) => {
    const r = f?.region?.trim();
    if (r) regions.add(r);
  });
  if (selectedRegion) regions.add(selectedRegion);
  if (regions.size === 0)
    return [computeQuotaStatus(safeFills, today, "", quotaTotal)];
  return Array.from(regions)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
    .map((r) => computeQuotaStatus(safeFills, today, r, quotaTotal));
}
