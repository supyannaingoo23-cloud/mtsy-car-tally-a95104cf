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
  const kmRemaining = part.kmInterval - kmSince;

  const monthsSince = differenceInMonths(new Date(), parseISO(part.lastServiceDate));
  const monthsRemaining = part.monthsInterval ? part.monthsInterval - monthsSince : null;

  // thresholds
  const kmDuePct = kmSince / part.kmInterval;
  let level: AlertLevel = "ok";
  let reason = "";
  if (kmDuePct >= 1) {
    level = "overdue";
    reason = `Overdue by ${Math.abs(kmRemaining).toLocaleString()} km`;
  } else if (kmDuePct >= 0.9) {
    level = "due-soon";
    reason = `Due in ${kmRemaining.toLocaleString()} km`;
  }

  if (monthsRemaining !== null) {
    if (monthsRemaining <= 0 && level !== "overdue") {
      level = "overdue";
      reason = `Overdue by ${Math.abs(monthsRemaining)} mo`;
    } else if (monthsRemaining <= 1 && level === "ok") {
      level = "due-soon";
      reason = `Due in ${monthsRemaining} mo`;
    }
  }

  if (level === "ok") {
    const km = `${kmRemaining.toLocaleString()} km left`;
    const mo = monthsRemaining !== null ? ` · ${monthsRemaining} mo left` : "";
    reason = km + mo;
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
