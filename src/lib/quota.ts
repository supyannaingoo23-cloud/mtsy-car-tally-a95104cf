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

export type QuotaStatus = {
  region: string;
  lastFillDate: string | null;
  daysSinceLastFill: number;
  daysUntilEligible: number; // 0 = eligible today
  isEvenToday: boolean;
  canRefuelToday: boolean;
  reason: string;
  badge: "available" | "waiting-even" | "countdown";
};

export function computeQuotaStatus(
  fills: FuelFill[],
  today = new Date(),
  region = "",
): QuotaStatus {
  const scoped = region
    ? fills.filter((f) => (f.region ?? "") === region)
    : fills;
  const sorted = [...scoped].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const evenToday = isEvenDay(today);

  if (!last) {
    return {
      region,
      lastFillDate: null,
      daysSinceLastFill: 0,
      daysUntilEligible: evenToday ? 0 : 1,
      isEvenToday: evenToday,
      canRefuelToday: evenToday,
      reason: evenToday
        ? "✅ Quota Available — no fill on record."
        : "🚫 Waiting for Even Day.",
      badge: evenToday ? "available" : "waiting-even",
    };
  }

  const lastDate = new Date(last.date + "T00:00:00");
  const days = daysBetween(lastDate, today);
  const sevenDaysOk = days >= QUOTA_DAYS;

  if (!sevenDaysOk) {
    const remaining = QUOTA_DAYS - days;
    return {
      region,
      lastFillDate: last.date,
      daysSinceLastFill: days,
      daysUntilEligible: remaining,
      isEvenToday: evenToday,
      canRefuelToday: false,
      reason: `⏳ ${remaining} day${remaining === 1 ? "" : "s"} left.`,
      badge: "countdown",
    };
  }

  if (evenToday) {
    return {
      region,
      lastFillDate: last.date,
      daysSinceLastFill: days,
      daysUntilEligible: 0,
      isEvenToday: true,
      canRefuelToday: true,
      reason: "✅ Quota Available.",
      badge: "available",
    };
  }

  return {
    region,
    lastFillDate: last.date,
    daysSinceLastFill: days,
    daysUntilEligible: 1,
    isEvenToday: false,
    canRefuelToday: false,
    reason: "🚫 Waiting for Even Day.",
    badge: "waiting-even",
  };
}

/** Returns one status per region that has at least one fill (plus the user's selected region if any). */
export function computeAllRegionStatuses(
  fills: FuelFill[],
  selectedRegion: string | null,
  today = new Date(),
): QuotaStatus[] {
  const regions = new Set<string>();
  fills.forEach((f) => f.region && regions.add(f.region));
  if (selectedRegion) regions.add(selectedRegion);
  if (regions.size === 0) return [computeQuotaStatus(fills, today, "")];
  return Array.from(regions)
    .sort()
    .map((r) => computeQuotaStatus(fills, today, r));
}
