import { DailyEntry, MonthlyInputs, dailyProfit } from "./db";

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
  return `${sign}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function fmtKm(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

export function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function yKey(d: Date) {
  return String(d.getFullYear());
}
