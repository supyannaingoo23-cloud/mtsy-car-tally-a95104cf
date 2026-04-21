import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, PiggyBank, TrendingUp, Wrench } from "lucide-react";
import LiveClock from "@/components/LiveClock";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  DailyEntry,
  MaintenancePart,
  MonthlyInputs,
  getDailyEntries,
  getMonthly,
  getParts,
} from "@/lib/db";
import { computeFinance, fmtMoney, ymKey } from "@/lib/finance";
import { computeStatus } from "@/lib/maintenance";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [monthly, setMonthly] = useState<MonthlyInputs | null>(null);
  const [parts, setParts] = useState<MaintenancePart[]>([]);

  useEffect(() => {
    (async () => {
      const all = await getDailyEntries();
      const ym = ymKey(new Date());
      setEntries(all.filter((e) => e.date.startsWith(ym)));
      setMonthly(await getMonthly(ym));
      setParts(await getParts());
    })();
  }, []);

  const finance = monthly
    ? computeFinance(entries, monthly)
    : { netProfit: 0, generalSavings: 0, childSavings: 0, donation: 0, totalIncome: 0, dailyProfitSum: 0, manualIncome: 0, totalOutflow: 0, retained: 0 };

  const totalSavings = finance.generalSavings + finance.childSavings + finance.donation;

  const currentMileage = entries.length
    ? Math.max(...entries.map((e) => e.mileageStop || 0))
    : parts.reduce((m, p) => Math.max(m, p.lastServiceMileage), 0);

  const statuses = parts.map((p) => computeStatus(p, currentMileage));
  const alerts = statuses.filter((s) => s.level !== "ok");

  return (
    <div className="space-y-4">
      <LiveClock />

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          label="Net Profit (Mo)"
          value={fmtMoney(finance.netProfit)}
          tone="primary"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label="Total Savings"
          value={fmtMoney(totalSavings)}
          tone="success"
          icon={<PiggyBank className="h-4 w-4 text-success" />}
        />
        <StatCard
          label="Daily Profit Sum"
          value={fmtMoney(finance.dailyProfitSum)}
          hint={`${entries.length} entries this month`}
        />
        <StatCard
          label="Current Mileage"
          value={currentMileage.toLocaleString()}
          hint="km (latest)"
        />
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

export default Dashboard;
