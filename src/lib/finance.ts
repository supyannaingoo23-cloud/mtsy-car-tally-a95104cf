import { DailyEntry, MonthlyInputs, SavingsCategory, Withdrawal, dailyProfit } from "./db";

export type FinanceSummary = {
  dailyProfitSum: number;
  manualIncome: number;
  totalIncome: number;
  totalOutflow: number;
  netProfit: number;
  generalSavings: number; // 30%
  childSavings: number; // 20%
  donation: number; // 2%
  retained: number; // remainder
};

export function computeFinance(entries: DailyEntry[], inputs: MonthlyInputs): FinanceSummary {
  const dailyProfitSum = entries.reduce((s, e) => s + dailyProfit(e), 0);
  const manualIncome =
    (inputs.gc || 0) +
    (inputs.plasticIncome || 0) +
    (inputs.rentalRepresent || 0) +
    (inputs.rentalPresent || 0);
  const totalIncome = dailyProfitSum + manualIncome;
  const totalOutflow = (inputs.rentalOutflow || 0) + (inputs.plasticOutflow || 0);
  const netProfit = totalIncome - totalOutflow;
  const positive = Math.max(0, netProfit);
  const generalSavings = positive * 0.3;
  const childSavings = positive * 0.2;
  const donation = positive * 0.02;
  const retained = netProfit - generalSavings - childSavings - donation;
  return {
    dailyProfitSum,
    manualIncome,
    totalIncome,
    totalOutflow,
    netProfit,
    generalSavings,
    childSavings,
    donation,
    retained,
  };
}

export function fmtMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  return `${sign}${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtKm(n: number) {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} km`;
}

export function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function yKey(d: Date) {
  return String(d.getFullYear());
}

export const SAVINGS_RATE: Record<SavingsCategory, number> = {
  general: 0.3,
  child: 0.2,
  donation: 0.02,
};

export const SAVINGS_LABEL: Record<SavingsCategory, string> = {
  general: "General Savings",
  child: "Child Savings",
  donation: "Donation",
};

export type SavingsAccrual = {
  ym: string;
  general: number;
  child: number;
  donation: number;
};

/**
 * Compute per-month savings accruals across all stored months.
 * Each month's accrual = % of that month's positive net profit.
 */
export function computeAccruals(
  entries: DailyEntry[],
  monthlyMap: Record<string, MonthlyInputs>,
): SavingsAccrual[] {
  const months = new Set<string>([
    ...Object.keys(monthlyMap),
    ...entries.map((e) => e.date.slice(0, 7)),
  ]);
  return Array.from(months)
    .sort()
    .map((ym) => {
      const monthEntries = entries.filter((e) => e.date.startsWith(ym));
      const inputs =
        monthlyMap[ym] ?? {
          gc: 0,
          plasticIncome: 0,
          rentalRepresent: 0,
          rentalPresent: 0,
          rentalOutflow: 0,
          plasticOutflow: 0,
        };
      const f = computeFinance(monthEntries, inputs);
      return {
        ym,
        general: f.generalSavings,
        child: f.childSavings,
        donation: f.donation,
      };
    });
}

export function sumAccruals(
  accruals: SavingsAccrual[],
  filter?: (ym: string) => boolean,
): Record<SavingsCategory, number> {
  const list = filter ? accruals.filter((a) => filter(a.ym)) : accruals;
  return list.reduce(
    (acc, a) => ({
      general: acc.general + a.general,
      child: acc.child + a.child,
      donation: acc.donation + a.donation,
    }),
    { general: 0, child: 0, donation: 0 },
  );
}

export function sumWithdrawals(
  withdrawals: Withdrawal[],
  filter?: (date: string) => boolean,
): Record<SavingsCategory, number> {
  const list = filter ? withdrawals.filter((w) => filter(w.date)) : withdrawals;
  return list.reduce(
    (acc, w) => {
      acc[w.category] += w.amount || 0;
      return acc;
    },
    { general: 0, child: 0, donation: 0 } as Record<SavingsCategory, number>,
  );
}
