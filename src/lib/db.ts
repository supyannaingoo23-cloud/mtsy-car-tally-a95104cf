// MTSY local DB layer (IndexedDB via idb-keyval)
import { get, set, update } from "idb-keyval";

export type DailyEntry = {
  id: string; // iso date yyyy-mm-dd
  date: string; // yyyy-mm-dd
  mileageStart: number;
  mileageStop: number;
  fuelFees: number;
  otherFees: number;
  income: number;
};

export type MonthlyInputs = {
  // key: yyyy-mm
  gc: number;
  plasticIncome: number;
  rentalRepresent: number;
  rentalPresent: number;
  rentalOutflow: number;
  plasticOutflow: number;
};

export type PartKey =
  | "engineOil"
  | "gearOil"
  | "gearOilFilter"
  | "brakeFluid"
  | "coolant"
  | "sparkPlug"
  | "filters";

export type MaintenancePart = {
  key: PartKey;
  label: string;
  kmInterval: number;
  monthsInterval?: number;
  lastServiceMileage: number;
  lastServiceDate: string; // yyyy-mm-dd
};

export const PART_DEFS: { key: PartKey; label: string; kmInterval: number; monthsInterval?: number }[] = [
  { key: "engineOil", label: "Engine Oil", kmInterval: 5000, monthsInterval: 6 },
  { key: "gearOil", label: "Gear Oil", kmInterval: 30000 },
  { key: "gearOilFilter", label: "Gear Oil Filter", kmInterval: 140000 },
  { key: "brakeFluid", label: "Brake Fluid", kmInterval: 30000, monthsInterval: 24 },
  { key: "coolant", label: "Coolant", kmInterval: 45000, monthsInterval: 24 },
  { key: "sparkPlug", label: "Spark Plug", kmInterval: 30000 },
  { key: "filters", label: "Filters", kmInterval: 30000 },
];

const K_DAILY = "mtsy:daily";
const K_MONTHLY = "mtsy:monthly";
const K_PARTS = "mtsy:parts";

// Daily
export async function getDailyEntries(): Promise<DailyEntry[]> {
  return (await get<DailyEntry[]>(K_DAILY)) ?? [];
}
export async function saveDailyEntry(entry: DailyEntry) {
  const list = await getDailyEntries();
  const idx = list.findIndex((e) => e.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  list.sort((a, b) => a.date.localeCompare(b.date));
  await set(K_DAILY, list);
}
export async function deleteDailyEntry(id: string) {
  const list = await getDailyEntries();
  await set(K_DAILY, list.filter((e) => e.id !== id));
}
export async function replaceDailyEntries(entries: DailyEntry[]) {
  await set(K_DAILY, entries);
}

// Monthly
export async function getMonthlyMap(): Promise<Record<string, MonthlyInputs>> {
  return (await get<Record<string, MonthlyInputs>>(K_MONTHLY)) ?? {};
}
export async function getMonthly(yyyymm: string): Promise<MonthlyInputs> {
  const map = await getMonthlyMap();
  return (
    map[yyyymm] ?? {
      gc: 0,
      plasticIncome: 0,
      rentalRepresent: 0,
      rentalPresent: 0,
      rentalOutflow: 0,
      plasticOutflow: 0,
    }
  );
}
export async function saveMonthly(yyyymm: string, inputs: MonthlyInputs) {
  await update<Record<string, MonthlyInputs>>(K_MONTHLY, (cur) => ({
    ...(cur ?? {}),
    [yyyymm]: inputs,
  }));
}
export async function replaceMonthlyMap(map: Record<string, MonthlyInputs>) {
  await set(K_MONTHLY, map);
}

// Parts
export async function getParts(): Promise<MaintenancePart[]> {
  const stored = (await get<MaintenancePart[]>(K_PARTS)) ?? [];
  // Ensure all parts exist
  const today = new Date().toISOString().slice(0, 10);
  const merged = PART_DEFS.map((def) => {
    const existing = stored.find((p) => p.key === def.key);
    return (
      existing ?? {
        ...def,
        lastServiceMileage: 0,
        lastServiceDate: today,
      }
    );
  });
  return merged;
}
export async function savePart(part: MaintenancePart) {
  const list = await getParts();
  const idx = list.findIndex((p) => p.key === part.key);
  if (idx >= 0) list[idx] = part;
  else list.push(part);
  await set(K_PARTS, list);
}
export async function replaceParts(parts: MaintenancePart[]) {
  await set(K_PARTS, parts);
}

// Helpers
export function totalExpense(e: DailyEntry) {
  return (e.fuelFees || 0) + (e.otherFees || 0);
}
export function dailyProfit(e: DailyEntry) {
  return (e.income || 0) - totalExpense(e);
}
export function kmDriven(e: DailyEntry) {
  return Math.max(0, (e.mileageStop || 0) - (e.mileageStart || 0));
}
