// MTSY local DB layer (IndexedDB via idb-keyval) + Cloud mirror (Supabase)
import { get, set, update } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";

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

export type FuelPrices = {
  price92: number;
  price95: number;
  priceDiesel: number;
  updatedAt?: string;
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
const K_WITHDRAWALS = "mtsy:withdrawals";
const K_FUEL = "mtsy:fuel";

export type SavingsCategory = "general" | "child" | "donation";

export type Withdrawal = {
  id: string;
  date: string; // yyyy-mm-dd
  category: SavingsCategory;
  amount: number;
  note: string;
};

// ---------- Mappers (db row <-> app type) ----------
const toDaily = (r: any): DailyEntry => ({
  id: r.id,
  date: r.date,
  mileageStart: Number(r.mileage_start) || 0,
  mileageStop: Number(r.mileage_stop) || 0,
  fuelFees: Number(r.fuel_fees) || 0,
  otherFees: Number(r.other_fees) || 0,
  income: Number(r.income) || 0,
});
const fromDaily = (e: DailyEntry) => ({
  id: e.id,
  date: e.date,
  mileage_start: e.mileageStart,
  mileage_stop: e.mileageStop,
  fuel_fees: e.fuelFees,
  other_fees: e.otherFees,
  income: e.income,
});
const toMonthly = (r: any): MonthlyInputs => ({
  gc: Number(r.gc) || 0,
  plasticIncome: Number(r.plastic_income) || 0,
  rentalRepresent: Number(r.rental_represent) || 0,
  rentalPresent: Number(r.rental_present) || 0,
  rentalOutflow: Number(r.rental_outflow) || 0,
  plasticOutflow: Number(r.plastic_outflow) || 0,
});
const fromMonthly = (ym: string, m: MonthlyInputs) => ({
  ym,
  gc: m.gc,
  plastic_income: m.plasticIncome,
  rental_represent: m.rentalRepresent,
  rental_present: m.rentalPresent,
  rental_outflow: m.rentalOutflow,
  plastic_outflow: m.plasticOutflow,
});
const toPart = (r: any): MaintenancePart => ({
  key: r.key,
  label: r.label,
  kmInterval: Number(r.km_interval) || 0,
  monthsInterval: r.months_interval == null ? undefined : Number(r.months_interval),
  lastServiceMileage: Number(r.last_service_mileage) || 0,
  lastServiceDate: r.last_service_date,
});
const fromPart = (p: MaintenancePart) => ({
  key: p.key,
  label: p.label,
  km_interval: p.kmInterval,
  months_interval: p.monthsInterval ?? null,
  last_service_mileage: p.lastServiceMileage,
  last_service_date: p.lastServiceDate,
});
const toWd = (r: any): Withdrawal => ({
  id: r.id,
  date: r.date,
  category: r.category as SavingsCategory,
  amount: Number(r.amount) || 0,
  note: r.note ?? "",
});
const fromWd = (w: Withdrawal) => ({
  id: w.id,
  date: w.date,
  category: w.category,
  amount: w.amount,
  note: w.note,
});

// ---------- Daily ----------
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
  // Cloud
  void supabase.from("daily_entries").upsert(fromDaily(entry));
}
export async function deleteDailyEntry(id: string) {
  const list = await getDailyEntries();
  await set(K_DAILY, list.filter((e) => e.id !== id));
  void supabase.from("daily_entries").delete().eq("id", id);
}
export async function replaceDailyEntries(entries: DailyEntry[]) {
  await set(K_DAILY, entries);
  await supabase.from("daily_entries").delete().neq("id", "__never__");
  if (entries.length) await supabase.from("daily_entries").upsert(entries.map(fromDaily));
}

// ---------- Monthly ----------
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
  void supabase.from("monthly_inputs").upsert(fromMonthly(yyyymm, inputs));
}
export async function replaceMonthlyMap(map: Record<string, MonthlyInputs>) {
  await set(K_MONTHLY, map);
  await supabase.from("monthly_inputs").delete().neq("ym", "__never__");
  const rows = Object.entries(map).map(([ym, m]) => fromMonthly(ym, m));
  if (rows.length) await supabase.from("monthly_inputs").upsert(rows);
}

// ---------- Parts ----------
export async function getParts(): Promise<MaintenancePart[]> {
  const stored = (await get<MaintenancePart[]>(K_PARTS)) ?? [];
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
  void supabase.from("maintenance_parts").upsert(fromPart(part));
}
export async function replaceParts(parts: MaintenancePart[]) {
  await set(K_PARTS, parts);
  await supabase.from("maintenance_parts").delete().neq("key", "__never__");
  if (parts.length) await supabase.from("maintenance_parts").upsert(parts.map(fromPart));
}

// ---------- Withdrawals ----------
export async function getWithdrawals(): Promise<Withdrawal[]> {
  return (await get<Withdrawal[]>(K_WITHDRAWALS)) ?? [];
}
export async function saveWithdrawal(w: Withdrawal) {
  const list = await getWithdrawals();
  const idx = list.findIndex((x) => x.id === w.id);
  if (idx >= 0) list[idx] = w;
  else list.push(w);
  list.sort((a, b) => b.date.localeCompare(a.date));
  await set(K_WITHDRAWALS, list);
  void supabase.from("withdrawals").upsert(fromWd(w));
}
export async function deleteWithdrawal(id: string) {
  const list = await getWithdrawals();
  await set(K_WITHDRAWALS, list.filter((w) => w.id !== id));
  void supabase.from("withdrawals").delete().eq("id", id);
}
export async function replaceWithdrawals(list: Withdrawal[]) {
  await set(K_WITHDRAWALS, list);
  await supabase.from("withdrawals").delete().neq("id", "__never__");
  if (list.length) await supabase.from("withdrawals").upsert(list.map(fromWd));
}

// ---------- Fuel Prices ----------
export async function getFuelPrices(): Promise<FuelPrices> {
  const local = (await get<FuelPrices>(K_FUEL)) ?? {
    price92: 0,
    price95: 0,
    priceDiesel: 0,
  };
  return local;
}
export async function saveFuelPrices(p: FuelPrices) {
  await set(K_FUEL, p);
  void supabase.from("fuel_prices").upsert({
    id: 1,
    price_92: p.price92,
    price_95: p.price95,
    price_diesel: p.priceDiesel,
    updated_at: new Date().toISOString(),
  });
}

// ---------- Cloud Sync (pull-on-startup, Cloud is source of truth when newer) ----------
export async function pullFromCloud(): Promise<void> {
  try {
    const [d, m, p, w, f] = await Promise.all([
      supabase.from("daily_entries").select("*").order("date"),
      supabase.from("monthly_inputs").select("*"),
      supabase.from("maintenance_parts").select("*"),
      supabase.from("withdrawals").select("*").order("date", { ascending: false }),
      supabase.from("fuel_prices").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (!d.error && d.data) {
      await set(K_DAILY, d.data.map(toDaily));
    }
    if (!m.error && m.data) {
      const map: Record<string, MonthlyInputs> = {};
      for (const row of m.data as any[]) map[row.ym] = toMonthly(row);
      await set(K_MONTHLY, map);
    }
    if (!p.error && p.data && p.data.length) {
      await set(K_PARTS, (p.data as any[]).map(toPart));
    }
    if (!w.error && w.data) {
      await set(K_WITHDRAWALS, (w.data as any[]).map(toWd));
    }
    if (!f.error && f.data) {
      await set(K_FUEL, {
        price92: Number((f.data as any).price_92) || 0,
        price95: Number((f.data as any).price_95) || 0,
        priceDiesel: Number((f.data as any).price_diesel) || 0,
        updatedAt: (f.data as any).updated_at,
      });
    }
  } catch (e) {
    console.warn("[mtsy] cloud pull failed (offline?)", e);
  }
}

/** Push entire local store up to cloud (used after JSON import). */
export async function pushAllToCloud(): Promise<void> {
  const [daily, monthly, parts, withdrawals, fuel] = await Promise.all([
    getDailyEntries(),
    getMonthlyMap(),
    getParts(),
    getWithdrawals(),
    getFuelPrices(),
  ]);
  await Promise.all([
    replaceDailyEntries(daily),
    replaceMonthlyMap(monthly),
    replaceParts(parts),
    replaceWithdrawals(withdrawals),
    saveFuelPrices(fuel),
  ]);
}

// ---------- Helpers ----------
export function totalExpense(e: DailyEntry) {
  return (e.fuelFees || 0) + (e.otherFees || 0);
}
export function dailyProfit(e: DailyEntry) {
  return (e.income || 0) - totalExpense(e);
}
export function kmDriven(e: DailyEntry) {
  return Math.max(0, (e.mileageStop || 0) - (e.mileageStart || 0));
}
