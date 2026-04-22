import {
  DailyEntry,
  FuelPrices,
  MaintenancePart,
  MonthlyInputs,
  SavingsCategory,
  Withdrawal,
  getDailyEntries,
  getFuelPrices,
  getMonthlyMap,
  getParts,
  getWithdrawals,
  pushAllToCloud,
  replaceDailyEntries,
  replaceMonthlyMap,
  replaceParts,
  replaceWithdrawals,
  saveFuelPrices,
} from "./db";

export type BackupV1 = {
  version: 1;
  exportedAt: string;
  daily: DailyEntry[];
  monthly: Record<string, MonthlyInputs>;
  parts: MaintenancePart[];
  withdrawals: Withdrawal[];
  fuel: FuelPrices;
};

export async function exportToJson() {
  const [daily, monthly, parts, withdrawals, fuel] = await Promise.all([
    getDailyEntries(),
    getMonthlyMap(),
    getParts(),
    getWithdrawals(),
    getFuelPrices(),
  ]);
  const payload: BackupV1 = {
    version: 1,
    exportedAt: new Date().toISOString(),
    daily,
    monthly,
    parts,
    withdrawals,
    fuel,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mtsy-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importFromJson(file: File) {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<BackupV1>;
  if (!data || typeof data !== "object") throw new Error("Invalid backup file");

  const daily = Array.isArray(data.daily)
    ? data.daily.map((d: any) => ({
        id: String(d.id ?? d.date),
        date: String(d.date),
        mileageStart: Number(d.mileageStart) || 0,
        mileageStop: Number(d.mileageStop) || 0,
        fuelFees: Number(d.fuelFees) || 0,
        otherFees: Number(d.otherFees) || 0,
        income: Number(d.income) || 0,
      }))
    : [];

  const monthly: Record<string, MonthlyInputs> = {};
  if (data.monthly && typeof data.monthly === "object") {
    for (const [k, v] of Object.entries(data.monthly as Record<string, any>)) {
      monthly[k] = {
        gc: Number(v.gc) || 0,
        plasticIncome: Number(v.plasticIncome) || 0,
        rentalRepresent: Number(v.rentalRepresent) || 0,
        rentalPresent: Number(v.rentalPresent) || 0,
        rentalOutflow: Number(v.rentalOutflow) || 0,
        plasticOutflow: Number(v.plasticOutflow) || 0,
      };
    }
  }

  const parts: MaintenancePart[] = Array.isArray(data.parts)
    ? data.parts.map((p: any) => ({
        key: p.key,
        label: p.label,
        kmInterval: Number(p.kmInterval) || 0,
        monthsInterval: p.monthsInterval ? Number(p.monthsInterval) : undefined,
        lastServiceMileage: Number(p.lastServiceMileage) || 0,
        lastServiceDate: String(p.lastServiceDate),
      }))
    : [];

  const withdrawals: Withdrawal[] = Array.isArray(data.withdrawals)
    ? data.withdrawals.map((w: any) => ({
        id: String(w.id ?? `${Date.now()}-${Math.random()}`),
        date: String(w.date),
        category: w.category as SavingsCategory,
        amount: Number(w.amount) || 0,
        note: String(w.note ?? ""),
      }))
    : [];

  const fuel: FuelPrices = data.fuel
    ? {
        price92: Number((data.fuel as any).price92) || 0,
        price95: Number((data.fuel as any).price95) || 0,
        priceDiesel: Number((data.fuel as any).priceDiesel) || 0,
      }
    : { price92: 0, price95: 0, priceDiesel: 0 };

  await Promise.all([
    replaceDailyEntries(daily),
    replaceMonthlyMap(monthly),
    replaceParts(parts),
    replaceWithdrawals(withdrawals),
    saveFuelPrices(fuel),
  ]);

  // Ensure cloud is in sync after restore
  await pushAllToCloud();
}
