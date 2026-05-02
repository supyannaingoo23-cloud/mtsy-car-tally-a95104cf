// Myanmar fuel quota logic: 35L every 7 full days, but reset only on EVEN day-of-month.

import type { FuelFill } from "./db";

export const QUOTA_LITERS = 35;
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
  lastFillDate: string | null; // yyyy-mm-dd or null
  daysSinceLastFill: number; // 0 if no fill yet
  daysUntilEligible: number; // 0 = eligible today, otherwise count
  isEvenToday: boolean;
  canRefuelToday: boolean; // 7+ days passed AND today is even
  reason: string; // human-friendly explanation
};

export function computeQuotaStatus(fills: FuelFill[], today = new Date()): QuotaStatus {
  const sorted = [...fills].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const evenToday = isEvenDay(today);

  if (!last) {
    return {
      lastFillDate: null,
      daysSinceLastFill: 0,
      daysUntilEligible: evenToday ? 0 : 1,
      isEvenToday: evenToday,
      canRefuelToday: evenToday,
      reason: evenToday
        ? "No fill on record — eligible today (even day)."
        : "No fill on record — wait for next even day.",
    };
  }

  const lastDate = new Date(last.date + "T00:00:00");
  const days = daysBetween(lastDate, today);
  const sevenDaysOk = days >= QUOTA_DAYS;

  if (!sevenDaysOk) {
    const remaining = QUOTA_DAYS - days;
    return {
      lastFillDate: last.date,
      daysSinceLastFill: days,
      daysUntilEligible: remaining,
      isEvenToday: evenToday,
      canRefuelToday: false,
      reason: `${remaining} day${remaining === 1 ? "" : "s"} left until 7-day reset.`,
    };
  }

  // 7+ days passed — now need an even day
  if (evenToday) {
    return {
      lastFillDate: last.date,
      daysSinceLastFill: days,
      daysUntilEligible: 0,
      isEvenToday: true,
      canRefuelToday: true,
      reason: "Eligible today — 7 days passed and today is even.",
    };
  }

  // Odd day, find next even day (tomorrow at most)
  return {
    lastFillDate: last.date,
    daysSinceLastFill: days,
    daysUntilEligible: 1,
    isEvenToday: false,
    canRefuelToday: false,
    reason: "7 days passed but today is odd — eligible tomorrow.",
  };
}
