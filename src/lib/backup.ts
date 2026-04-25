import * as XLSX from "xlsx";
import {
  getDailyEntries,
  getFuelHistory,
  getFuelPrices,
  getMonthlyMap,
  getParts,
  getWithdrawals,
  pullFuelHistory,
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

/**
 * Export every table to a single multi-sheet .xlsx file.
 * Sheets included: Daily, Savings (Withdrawals), Fuel History,
 * Fuel Prices (current), Monthly Finance, Maintenance.
 *
 * Format choices kept Google-Sheets friendly:
 *  - ISO yyyy-mm-dd dates (parsed correctly by Sheets)
 *  - Plain numbers, no merged cells, no embedded formulas
 *  - First row of every sheet is the header row
 */
export async function exportToExcel() {
  // Pull the freshest fuel history from cloud (fall back to local if offline)
  let fuelHist;
  try {
    fuelHist = await pullFuelHistory();
  } catch {
    fuelHist = await getFuelHistory();
  }

  const [daily, monthly, parts, withdrawals, fuel] = await Promise.all([
    getDailyEntries(),
    getMonthlyMap(),
    getParts(),
    getWithdrawals(),
    getFuelPrices(),
  ]);

  const wb = XLSX.utils.book_new();

  // ----- Daily Records -----
  const dailySheet = XLSX.utils.json_to_sheet(
    daily.map((d) => ({
      Date: d.date,
      "Mileage Start": d.mileageStart,
      "Mileage Stop": d.mileageStop,
      "KM Driven": Math.max(0, (d.mileageStop || 0) - (d.mileageStart || 0)),
      "Fuel Fees": d.fuelFees,
      "Other Fees": d.otherFees,
      Income: d.income,
      "Total Expense": (d.fuelFees || 0) + (d.otherFees || 0),
      "Daily Profit":
        (d.income || 0) - ((d.fuelFees || 0) + (d.otherFees || 0)),
    })),
  );
  XLSX.utils.book_append_sheet(wb, dailySheet, "Daily");

  // ----- Savings / Withdrawals -----
  const savingsSheet = XLSX.utils.json_to_sheet(
    withdrawals.map((w) => ({
      ID: w.id,
      Date: w.date,
      Category: w.category,
      Amount: w.amount,
      Note: w.note,
    })),
  );
  XLSX.utils.book_append_sheet(wb, savingsSheet, "Savings");

  // ----- Fuel History -----
  const fuelHistorySheet = XLSX.utils.json_to_sheet(
    fuelHist.map((h) => ({
      Date: h.date,
      "Gasoline 92": h.gasoline92,
      "Gasoline 95": h.gasoline95,
      "Recorded At": h.createdAt,
    })),
  );
  XLSX.utils.book_append_sheet(wb, fuelHistorySheet, "Fuel History");

  // ----- Current Fuel Prices snapshot -----
  const fuelNowSheet = XLSX.utils.json_to_sheet([
    {
      "Gasoline 92": fuel.price92,
      "Gasoline 95": fuel.price95,
      "Last Updated": fuel.updatedAt ?? "",
    },
  ]);
  XLSX.utils.book_append_sheet(wb, fuelNowSheet, "Fuel Prices");

  // ----- Monthly Finance inputs -----
  const monthlyRows = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, v]) => ({
      Month: ym,
      GC: v.gc,
      "Plastic Income": v.plasticIncome,
      "Rental Represent": v.rentalRepresent,
      "Rental Present": v.rentalPresent,
      "Rental Outflow": v.rentalOutflow,
      "Plastic Outflow": v.plasticOutflow,
    }));
  const monthlySheet = XLSX.utils.json_to_sheet(monthlyRows);
  XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly Finance");

  // ----- Maintenance -----
  const partsSheet = XLSX.utils.json_to_sheet(
    parts.map((p) => ({
      Key: p.key,
      Label: p.label,
      "KM Interval": p.kmInterval,
      "Months Interval": p.monthsInterval ?? "",
      "Last Service Mileage": p.lastServiceMileage,
      "Last Service Date": p.lastServiceDate,
    })),
  );
  XLSX.utils.book_append_sheet(wb, partsSheet, "Maintenance");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `mtsy-backup-${stamp}.xlsx`);
}

/**
 * Import a multi-sheet .xlsx file produced by exportToExcel (or compatible
 * Google-Sheets export). Unknown sheets are ignored; missing sheets are skipped.
 */
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

  // Accept both new "Savings" and legacy "Withdrawals"
  const savingsSheetName = wb.SheetNames.includes("Savings")
    ? "Savings"
    : wb.SheetNames.includes("Withdrawals")
      ? "Withdrawals"
      : null;
  if (savingsSheetName) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[savingsSheetName]);
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

  // Accept new "Monthly Finance" or legacy "Monthly"
  const monthlySheetName = wb.SheetNames.includes("Monthly Finance")
    ? "Monthly Finance"
    : wb.SheetNames.includes("Monthly")
      ? "Monthly"
      : null;
  if (monthlySheetName) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[monthlySheetName]);
    const map: Record<string, MonthlyInputs> = {};
    for (const r of rows) {
      const ym = r.Month ?? r.ym;
      if (!ym) continue;
      map[String(ym)] = {
        gc: Number(r.GC ?? r.gc) || 0,
        plasticIncome: Number(r["Plastic Income"] ?? r.plasticIncome) || 0,
        rentalRepresent:
          Number(r["Rental Represent"] ?? r.rentalRepresent) || 0,
        rentalPresent: Number(r["Rental Present"] ?? r.rentalPresent) || 0,
        rentalOutflow: Number(r["Rental Outflow"] ?? r.rentalOutflow) || 0,
        plasticOutflow:
          Number(r["Plastic Outflow"] ?? r.plasticOutflow) || 0,
      };
    }
    await replaceMonthlyMap(map);
  }

  if (wb.SheetNames.includes("Maintenance")) {
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["Maintenance"]);
    const parts: MaintenancePart[] = rows.map((r) => ({
      key: r.Key ?? r.key,
      label: r.Label ?? r.label,
      kmInterval: Number(r["KM Interval"] ?? r.kmInterval) || 0,
      monthsInterval:
        r["Months Interval"] !== "" && r["Months Interval"] != null
          ? Number(r["Months Interval"])
          : r.monthsInterval
            ? Number(r.monthsInterval)
            : undefined,
      lastServiceMileage:
        Number(r["Last Service Mileage"] ?? r.lastServiceMileage) || 0,
      lastServiceDate: String(r["Last Service Date"] ?? r.lastServiceDate),
    }));
    await replaceParts(parts);
  }
}
