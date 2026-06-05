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

/** Compute the next eligible refuel date: lastFill + 7 days exactly. */
export function computeNextEligibleDate(lastFill: Date): Date {
  return addDays(lastFill, QUOTA_DAYS);
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
    return {
      region,
      lastFillDate: null,
      lastFillLiters: 0,
      quotaTotal: safeQuota,
      remainingLiters: safeQuota,
      usedPercent: 0,
      daysSinceLastFill: 0,
      daysUntilEligible: evenToday ? 0 : 1,
      isEvenToday: evenToday,
      canRefuelToday: evenToday,
      nextEligibleDate: evenToday ? null : formatEligibleDate(addDays(today, 1)),
      reason: evenToday
        ? "✅ QUOTA READY"
        : "🚫 Waiting for Even Day",
      badge: evenToday ? "available" : "waiting-even",
    };
  }

  const lastDate = new Date(last.date + "T00:00:00");
  const days = daysBetween(lastDate, today);
  const sevenDaysOk = days >= QUOTA_DAYS;
  const eligibleDate = computeNextEligibleDate(lastDate);
  const lastLiters = Math.max(0, Number(last.liters) || 0);
  const remaining = Math.max(0, safeQuota - lastLiters);
  const usedPercent = Math.min(
    100,
    Math.max(0, Math.round((lastLiters / safeQuota) * 100)),
  );

  if (!sevenDaysOk) {
    const remainingDays = QUOTA_DAYS - days;
    return {
      region,
      lastFillDate: last.date,
      lastFillLiters: lastLiters,
      quotaTotal: safeQuota,
      remainingLiters: remaining,
      usedPercent,
      daysSinceLastFill: days,
      daysUntilEligible: remainingDays,
      isEvenToday: evenToday,
      canRefuelToday: false,
      nextEligibleDate: formatEligibleDate(eligibleDate),
      reason: `⏳ ${remainingDays} day${remainingDays === 1 ? "" : "s"} left`,
      badge: "countdown",
    };
  }

  if (evenToday) {
    return {
      region,
      lastFillDate: last.date,
      lastFillLiters: lastLiters,
      quotaTotal: safeQuota,
      remainingLiters: safeQuota, // 7-day wait elapsed on an even day → ready for a full refill
      usedPercent: 0,
      daysSinceLastFill: days,
      daysUntilEligible: 0,
      isEvenToday: true,
      canRefuelToday: true,
      nextEligibleDate: formatEligibleDate(today),
      reason: "✅ QUOTA READY",
      badge: "available",
    };
  }

  return {
    region,
    lastFillDate: last.date,
    lastFillLiters: lastLiters,
    quotaTotal: safeQuota,
    remainingLiters: remaining,
    usedPercent,
    daysSinceLastFill: days,
    daysUntilEligible: 1,
    isEvenToday: false,
    canRefuelToday: false,
    nextEligibleDate: formatEligibleDate(addDays(today, 1)),
    reason: "🚫 Waiting for Even Day",
    badge: "waiting-even",
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
