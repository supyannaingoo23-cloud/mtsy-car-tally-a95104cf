import * as XLSX from "xlsx";
import {
  getDailyEntries,
  getMonthlyMap,
  getParts,
  getWithdrawals,
  replaceDailyEntries,
  replaceMonthlyMap,
  replaceParts,
  replaceWithdrawals,
  DailyEntry,
  MonthlyInputs,
  MaintenancePart,
  SavingsCategory,
  Withdrawal,
} from "./db";

export async function exportToExcel() {
  const [daily, monthly, parts, withdrawals] = await Promise.all([
    getDailyEntries(),
    getMonthlyMap(),
    getParts(),
    getWithdrawals(),
  ]);

  const wb = XLSX.utils.book_new();

  const dailySheet = XLSX.utils.json_to_sheet(
    daily.map((d) => ({
      Date: d.date,
      "Mileage Start": d.mileageStart,
      "Mileage Stop": d.mileageStop,
      "Fuel Fees": d.fuelFees,
      "Other Fees": d.otherFees,
      Income: d.income,
      "Total Expense": (d.fuelFees || 0) + (d.otherFees || 0),
      "Daily Profit": (d.income || 0) - ((d.fuelFees || 0) + (d.otherFees || 0)),
    })),
  );
  XLSX.utils.book_append_sheet(wb, dailySheet, "Daily");

  const monthlyRows = Object.entries(monthly).map(([k, v]) => ({ Month: k, ...v }));
  const monthlySheet = XLSX.utils.json_to_sheet(monthlyRows);
  XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly");

  const partsSheet = XLSX.utils.json_to_sheet(parts);
  XLSX.utils.book_append_sheet(wb, partsSheet, "Maintenance");

  const withdrawalsSheet = XLSX.utils.json_to_sheet(
    withdrawals.map((w) => ({
      ID: w.id,
      Date: w.date,
      Category: w.category,
      Amount: w.amount,
      Note: w.note,
    })),
  );
  XLSX.utils.book_append_sheet(wb, withdrawalsSheet, "Withdrawals");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `mtsy-backup-${stamp}.xlsx`);
}

export async function importFromExcel(file: File) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);

  if (wb.SheetNames.includes("Daily")) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["Daily"]);
    const entries: DailyEntry[] = rows
      .filter((r) => r.Date)
      .map((r) => ({
        id: String(r.Date),
        date: String(r.Date),
        mileageStart: Number(r["Mileage Start"]) || 0,
        mileageStop: Number(r["Mileage Stop"]) || 0,
        fuelFees: Number(r["Fuel Fees"]) || 0,
        otherFees: Number(r["Other Fees"]) || 0,
        income: Number(r.Income) || 0,
      }));
    await replaceDailyEntries(entries);
  }

  if (wb.SheetNames.includes("Monthly")) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["Monthly"]);
    const map: Record<string, MonthlyInputs> = {};
    for (const r of rows) {
      if (!r.Month) continue;
      map[String(r.Month)] = {
        gc: Number(r.gc) || 0,
        plasticIncome: Number(r.plasticIncome) || 0,
        rentalRepresent: Number(r.rentalRepresent) || 0,
        rentalPresent: Number(r.rentalPresent) || 0,
        rentalOutflow: Number(r.rentalOutflow) || 0,
        plasticOutflow: Number(r.plasticOutflow) || 0,
      };
    }
    await replaceMonthlyMap(map);
  }

  if (wb.SheetNames.includes("Maintenance")) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["Maintenance"]);
    const parts: MaintenancePart[] = rows.map((r) => ({
      key: r.key,
      label: r.label,
      kmInterval: Number(r.kmInterval) || 0,
      monthsInterval: r.monthsInterval ? Number(r.monthsInterval) : undefined,
      lastServiceMileage: Number(r.lastServiceMileage) || 0,
      lastServiceDate: String(r.lastServiceDate),
    }));
    await replaceParts(parts);
  }

  if (wb.SheetNames.includes("Withdrawals")) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["Withdrawals"]);
    const list: Withdrawal[] = rows
      .filter((r) => r.Date && r.Category)
      .map((r) => ({
        id: String(r.ID || `${Date.now()}-${Math.random()}`),
        date: String(r.Date),
        category: String(r.Category) as SavingsCategory,
        amount: Number(r.Amount) || 0,
        note: String(r.Note || ""),
      }));
    await replaceWithdrawals(list);
  }
}
