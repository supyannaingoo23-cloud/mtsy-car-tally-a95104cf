import { differenceInMonths, parseISO } from "date-fns";
import { MaintenancePart } from "./db";

export type AlertLevel = "ok" | "due-soon" | "overdue";

export type MaintenanceStatus = {
  part: MaintenancePart;
  kmSinceService: number;
  kmRemaining: number;
  monthsSinceService: number;
  monthsRemaining: number | null;
  level: AlertLevel;
  reason: string;
};

export function computeStatus(part: MaintenancePart, currentMileage: number): MaintenanceStatus {
  const kmSince = Math.max(0, currentMileage - (part.lastServiceMileage || 0));
  // kmInterval = 0 means this part is time-only (wiper, battery, tyre pressure).
  const hasKm = (part.kmInterval || 0) > 0;
  const kmRemaining = hasKm ? part.kmInterval - kmSince : 0;

  let monthsSince = 0;
  try {
    monthsSince = differenceInMonths(new Date(), parseISO(part.lastServiceDate));
  } catch {
    monthsSince = 0;
  }
  const monthsRemaining = part.monthsInterval ? part.monthsInterval - monthsSince : null;

  // KM thresholds (skipped when kmInterval is 0)
  let level: AlertLevel = "ok";
  let reason = "";
  if (hasKm) {
    const kmDuePct = kmSince / part.kmInterval;
    if (kmDuePct >= 1) {
      level = "overdue";
      reason = `Overdue by ${Math.abs(kmRemaining).toLocaleString()} km`;
    } else if (kmDuePct >= 0.9) {
      level = "due-soon";
      reason = `Due in ${kmRemaining.toLocaleString()} km`;
    }
  }

  if (monthsRemaining !== null) {
    if (monthsRemaining <= 0 && level !== "overdue") {
      level = "overdue";
      reason = `Overdue by ${Math.abs(monthsRemaining)} mo`;
    } else if (monthsRemaining <= 1 && level === "ok") {
      level = "due-soon";
      reason = `Due in ${Math.max(0, monthsRemaining)} mo`;
    }
  }

  if (level === "ok") {
    const km = hasKm ? `${kmRemaining.toLocaleString()} km left` : "";
    const mo = monthsRemaining !== null ? `${monthsRemaining} mo left` : "";
    reason = [km, mo].filter(Boolean).join(" · ");
  }

  return {
    part,
    kmSinceService: kmSince,
    kmRemaining,
    monthsSinceService: monthsSince,
    monthsRemaining,
    level,
    reason,
  };
}
