import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Baby, HandCoins, PiggyBank, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import LiveClock from "@/components/LiveClock";
import StatCard from "@/components/StatCard";
import FuelPricesCard from "@/components/FuelPricesCard";
import FridayFuelReminder from "@/components/FridayFuelReminder";
import QuotaCard from "@/components/QuotaCard";
import MonthlyFuelCard from "@/components/MonthlyFuelCard";
import MonthFilter from "@/components/MonthFilter";
import { Button } from "@/components/ui/button";
import { useMonthFilter } from "@/contexts/MonthFilterContext";
import {
  DailyEntry,
  MaintenancePart,
  MonthlyInputs,
  Withdrawal,
  getDailyEntries,
  getMonthly,
  getMonthlyMap,
  getParts,
  getWithdrawals,
} from "@/lib/db";
import {
  computeAccruals,
  computeFinance,
  fmtMoney,
  sumAccruals,
  sumWithdrawals,
  ymKey,
} from "@/lib/finance";
import { computeStatus } from "@/lib/maintenance";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { ym } = useMonthFilter();
  const [allEntries, setAllEntries] = useState<DailyEntry[]>([]);
  const [monthly, setMonthly] = useState<MonthlyInputs | null>(null);
  const [monthlyMap, setMonthlyMap] = useState<Record<string, MonthlyInputs>>({});
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [parts, setParts] = useState<MaintenancePart[]>([]);

  // Load full datasets once (cheap, mirrored from IndexedDB).
  useEffect(() => {
    (async () => {
      try {
        const [all, map, wd, pts] = await Promise.all([
          getDailyEntries(),
          getMonthlyMap(),
          getWithdrawals(),
          getParts(),
        ]);
        setAllEntries(all);
        setMonthlyMap(map);
        setWithdrawals(wd);
        setParts(pts);
      } catch {
        // Swallow load errors — UI shows safe zeros until data arrives.
      }
    })();
  }, []);

  // Re-fetch the selected month's manual inputs whenever the filter changes.
  useEffect(() => {
    (async () => {
      try {
        setMonthly(await getMonthly(ym));
      } catch {
        setMonthly(null);
      }
    })();
  }, [ym]);

  // Entries filtered by the selected month for this dashboard.
  const entries = useMemo(
    () => allEntries.filter((e) => e?.date?.startsWith(ym)),
    [allEntries, ym],
  );

  // Months that exist in saved data — feeds the MonthFilter dropdown.
  const dataMonths = useMemo(
    () => [
      ...allEntries.map((e) => e.date),
      ...Object.keys(monthlyMap),
    ],
    [allEntries, monthlyMap],
  );

  const finance = monthly
    ? computeFinance(entries, monthly)
    : { netProfit: 0, generalSavings: 0, childSavings: 0, donation: 0, totalIncome: 0, dailyProfitSum: 0, manualIncome: 0, totalOutflow: 0, retained: 0 };

  // Lifetime running savings balances
  const accruals = computeAccruals(allEntries, monthlyMap);
  const totalIn = sumAccruals(accruals);
  const totalOut = sumWithdrawals(withdrawals);
  const balances = {
    general: totalIn.general - totalOut.general,
    child: totalIn.child - totalOut.child,
    donation: totalIn.donation - totalOut.donation,
  };

  const currentMileage = (() => {
    const fromEntries = allEntries.reduce(
      (m, e) => Math.max(m, e.mileageStop || 0, e.mileageStart || 0),
      0,
    );
    const fromParts = parts.reduce((m, p) => Math.max(m, p.lastServiceMileage || 0), 0);
    return Math.max(fromEntries, fromParts);
  })();

  const statuses = parts.map((p) => computeStatus(p, currentMileage));
  const alerts = statuses.filter((s) => s.level !== "ok");

  return (
    <div className="space-y-4">
      <LiveClock />
      <MonthFilter extraMonths={dataMonths} />
      <FridayFuelReminder />

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          label="Net Profit (This Month)"
          value={fmtMoney(finance.netProfit)}
          tone="primary"
          hint={ym}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label="Daily Profit Sum"
          value={fmtMoney(finance.dailyProfitSum)}
          hint={`${entries.length} entries this month`}
        />
        <StatCard
          label="Current Mileage"
          value={fmtNumber(currentMileage)}
          hint="km (latest)"
        />
        <StatCard
          label="General Income (Mo)"
          value={fmtMoney(finance.manualIncome)}
        />
        <StatCard
          label="Outflows (This Month)"
          value={fmtMoney(finance.totalOutflow)}
          tone="danger"
          hint="Rental + Plastic outflow"
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
        />
      </section>
      <QuotaCard />
      <MonthlyFuelCard />
      <FuelPricesCard />


      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-success" />
            <h2 className="font-display font-bold tracking-wider uppercase text-sm">
              Savings Balances
            </h2>
          </div>
          <Link to="/savings" className="text-xs text-primary inline-flex items-center gap-1">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <SavingsBalanceCard
            label="General Savings"
            percent="30%"
            balance={balances.general}
            accrued={totalIn.general}
            withdrawn={totalOut.general}
            icon={<PiggyBank className="h-4 w-4" />}
          />
          <SavingsBalanceCard
            label="Child Savings"
            percent="20%"
            balance={balances.child}
            accrued={totalIn.child}
            withdrawn={totalOut.child}
            icon={<Baby className="h-4 w-4" />}
          />
          <SavingsBalanceCard
            label="Donation"
            percent="2%"
            balance={balances.donation}
            accrued={totalIn.donation}
            withdrawn={totalOut.donation}
            icon={<HandCoins className="h-4 w-4" />}
          />
        </div>
      </section>

      <section className="surface-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h2 className="font-display font-bold tracking-wider uppercase text-sm">
              Maintenance Alerts
            </h2>
          </div>
          <Link to="/maintenance" className="text-xs text-primary inline-flex items-center gap-1">
            View <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border/60">
          {alerts.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">All systems good. No alerts.</p>
          )}
          {alerts.map((a) => (
            <div key={a.part.key} className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-lg grid place-items-center shrink-0",
                  a.level === "overdue"
                    ? "bg-destructive/15 text-destructive animate-pulse-glow"
                    : "bg-primary/15 text-primary",
                )}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.part.label}</p>
                <p className="text-xs text-muted-foreground truncate">{a.reason}</p>
              </div>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded",
                  a.level === "overdue"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary/20 text-primary",
                )}
              >
                {a.level === "overdue" ? "Overdue" : "Due Soon"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/daily">
          <Button variant="default" className="w-full h-14 font-display tracking-wider uppercase bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            + Log Today
          </Button>
        </Link>
        <Link to="/finance">
          <Button variant="secondary" className="w-full h-14 font-display tracking-wider uppercase">
            Finance
          </Button>
        </Link>
      </section>
    </div>
  );
};

const SavingsBalanceCard = ({
  label,
  percent,
  balance,
  accrued,
  withdrawn,
  icon,
}: {
  label: string;
  percent: string;
  balance: number;
  accrued: number;
  withdrawn: number;
  icon: React.ReactNode;
}) => {
  const negative = balance < 0;
  return (
    <Link
      to="/savings"
      className="surface-card border border-border rounded-xl p-4 block transition-smooth hover:border-primary/60"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
            {icon}
          </span>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold">
            {label}
          </p>
        </div>
        <span className="text-[10px] font-display font-bold text-primary uppercase tracking-wider">
          {percent}
        </span>
      </div>
      <p
        className={cn(
          "font-display text-3xl font-bold tabular mt-2",
          negative ? "text-destructive" : "text-primary",
        )}
      >
        {fmtMoney(balance)}
      </p>
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-success">+ {fmtMoney(accrued)}</span>
        <span className="text-destructive">- {fmtMoney(withdrawn)}</span>
      </div>
    </Link>
  );
};

export default Dashboard;
