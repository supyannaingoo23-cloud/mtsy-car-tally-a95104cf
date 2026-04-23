import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import NumberInput from "@/components/NumberInput";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DailyEntry,
  MonthlyInputs,
  Withdrawal,
  getDailyEntries,
  getMonthly,
  getMonthlyMap,
  getWithdrawals,
  saveMonthly,
} from "@/lib/db";
import { computeFinance, fmtMoney, sumWithdrawals, ymKey, yKey } from "@/lib/finance";
import StatCard from "@/components/StatCard";

const ymOptions = (entries: DailyEntry[]) => {
  const set = new Set<string>();
  set.add(ymKey(new Date()));
  entries.forEach((e) => set.add(e.date.slice(0, 7)));
  return Array.from(set).sort().reverse();
};

const Finance = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [ym, setYm] = useState<string>(ymKey(new Date()));
  const [inputs, setInputs] = useState<MonthlyInputs | null>(null);
  const [monthlyMap, setMonthlyMap] = useState<Record<string, MonthlyInputs>>({});
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    (async () => {
      setEntries(await getDailyEntries());
      setMonthlyMap(await getMonthlyMap());
      setWithdrawals(await getWithdrawals());
    })();
  }, []);

  useEffect(() => {
    (async () => setInputs(await getMonthly(ym)))();
  }, [ym]);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(ym)),
    [entries, ym],
  );

  const finance = inputs
    ? computeFinance(monthEntries, inputs)
    : null;

  // Annual
  const yearKey = yKey(new Date());
  const yearEntries = entries.filter((e) => e.date.startsWith(yearKey));
  const yearInputs: MonthlyInputs = Object.entries(monthlyMap)
    .filter(([k]) => k.startsWith(yearKey))
    .reduce(
      (acc, [, v]) => ({
        gc: acc.gc + v.gc,
        plasticIncome: acc.plasticIncome + v.plasticIncome,
        rentalRepresent: acc.rentalRepresent + v.rentalRepresent,
        rentalPresent: acc.rentalPresent + v.rentalPresent,
        rentalOutflow: acc.rentalOutflow + v.rentalOutflow,
        plasticOutflow: acc.plasticOutflow + v.plasticOutflow,
      }),
      { gc: 0, plasticIncome: 0, rentalRepresent: 0, rentalPresent: 0, rentalOutflow: 0, plasticOutflow: 0 },
    );
  const annual = computeFinance(yearEntries, yearInputs);

  // Withdrawals deducted from savings balances
  const monthWd = sumWithdrawals(withdrawals, (d) => d.startsWith(ym));
  const yearWd = sumWithdrawals(withdrawals, (d) => d.startsWith(yearKey));

  const monthSavings = finance
    ? {
        general: finance.generalSavings - monthWd.general,
        child: finance.childSavings - monthWd.child,
        donation: finance.donation - monthWd.donation,
      }
    : { general: 0, child: 0, donation: 0 };
  const monthTotalSavings = monthSavings.general + monthSavings.child + monthSavings.donation;

  const annualSavings = {
    general: annual.generalSavings - yearWd.general,
    child: annual.childSavings - yearWd.child,
    donation: annual.donation - yearWd.donation,
  };
  const annualTotalSavings = annualSavings.general + annualSavings.child + annualSavings.donation;

  const updateField = (k: keyof MonthlyInputs, v: number) => {
    if (!inputs) return;
    setInputs({ ...inputs, [k]: v || 0 });
  };

  const persist = async () => {
    if (!inputs) return;
    await saveMonthly(ym, inputs);
    setMonthlyMap({ ...monthlyMap, [ym]: inputs });
    toast.success("Saved");
  };

  return (
    <div className="space-y-5">
      <Tabs defaultValue="month" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="month" className="font-display uppercase tracking-wider">Monthly</TabsTrigger>
          <TabsTrigger value="year" className="font-display uppercase tracking-wider">Annual</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="space-y-4 mt-4">
          <div className="surface-card border border-border rounded-xl p-4 space-y-3">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Month
            </Label>
            <select
              value={ym}
              onChange={(e) => setYm(e.target.value)}
              className="w-full h-10 rounded-md bg-input border border-border px-3 text-sm font-medium"
            >
              {ymOptions(entries).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {inputs && finance && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Daily Profit Sum" value={fmtMoney(finance.dailyProfitSum)} hint={`${monthEntries.length} entries`} />
                <StatCard label="General Income" value={fmtMoney(finance.manualIncome)} />
                <StatCard label="Total Income" value={fmtMoney(finance.totalIncome)} tone="success" />
                <StatCard label="Total Outflow" value={fmtMoney(finance.totalOutflow)} tone="danger" />
                <StatCard label="Net Profit" value={fmtMoney(finance.netProfit)} tone="primary" />
                <StatCard
                  label="Total Savings"
                  value={fmtMoney(monthTotalSavings)}
                  hint={monthWd.general + monthWd.child + monthWd.donation > 0 ? `− ${fmtMoney(monthWd.general + monthWd.child + monthWd.donation)} withdrawn` : undefined}
                />
              </div>

              <div className="surface-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-display uppercase tracking-wider text-sm font-bold text-primary">
                  General Income
                </h3>
                <NumField label="GC" value={inputs.gc} onChange={(v) => updateField("gc", v)} />
                <NumField label="Plastic Income" value={inputs.plasticIncome} onChange={(v) => updateField("plasticIncome", v)} />
                <NumField label="Rental Represent" value={inputs.rentalRepresent} onChange={(v) => updateField("rentalRepresent", v)} />
                <NumField label="Rental Present" value={inputs.rentalPresent} onChange={(v) => updateField("rentalPresent", v)} />
              </div>

              <div className="surface-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-display uppercase tracking-wider text-sm font-bold text-destructive">
                  Outflows
                </h3>
                <NumField label="Rental Outflow" value={inputs.rentalOutflow} onChange={(v) => updateField("rentalOutflow", v)} />
                <NumField label="Plastic Outflow" value={inputs.plasticOutflow} onChange={(v) => updateField("plasticOutflow", v)} />
              </div>

              <div className="surface-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-display uppercase tracking-wider text-sm font-bold">
                  Automated Savings
                </h3>
                <SavingsRow label="General Savings (30%)" value={monthSavings.general} />
                <SavingsRow label="Child Savings (20%)" value={monthSavings.child} />
                <SavingsRow label="Donation (2%)" value={monthSavings.donation} />
                <div className="border-t border-border/60 pt-3">
                  <SavingsRow label="Retained (48%)" value={finance.retained} bold />
                </div>
              </div>

              <Button
                onClick={persist}
                className="w-full h-12 font-display tracking-wider uppercase bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                Save Month
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="year" className="space-y-4 mt-4">
          <div className="surface-card border border-border rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Year
            </p>
            <p className="font-display text-3xl font-bold text-primary">{yearKey}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Income" value={fmtMoney(annual.totalIncome)} tone="success" />
            <StatCard label="Total Outflow" value={fmtMoney(annual.totalOutflow)} tone="danger" />
            <StatCard label="Net Profit" value={fmtMoney(annual.netProfit)} tone="primary" />
            <StatCard
              label="Total Savings"
              value={fmtMoney(annualTotalSavings)}
              hint={yearWd.general + yearWd.child + yearWd.donation > 0 ? `− ${fmtMoney(yearWd.general + yearWd.child + yearWd.donation)} withdrawn` : undefined}
            />
            <StatCard label="General (30%)" value={fmtMoney(annualSavings.general)} />
            <StatCard label="Child (20%)" value={fmtMoney(annualSavings.child)} />
            <StatCard label="Donation (2%)" value={fmtMoney(annualSavings.donation)} />
            <StatCard label="Retained" value={fmtMoney(annual.retained)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const NumField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {label}
    </Label>
    <NumberInput value={value} onChange={onChange} placeholder="0" />
  </div>
);

const SavingsRow = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className={bold ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
      {label}
    </span>
    <span className={`font-display tabular ${bold ? "text-lg font-bold text-primary" : "font-semibold"}`}>
      {fmtMoney(value)}
    </span>
  </div>
);

export default Finance;
