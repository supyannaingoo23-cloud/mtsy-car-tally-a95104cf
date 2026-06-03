import { useEffect, useMemo, useState } from "react";
import { Fuel } from "lucide-react";
import { useMonthFilter } from "@/contexts/MonthFilterContext";
import { FuelFill, getFuelFills } from "@/lib/db";
import { fmtNumber } from "@/lib/format";
import { fmtMoney } from "@/lib/finance";

/**
 * Monthly Fuel Consumption summary.
 * Shows Total Liters + Total Fuel Cost for the globally-selected month.
 * Fuel cost is INFORMATIONAL ONLY — it does not feed expenses or profit.
 */
const MonthlyFuelCard = () => {
  const { ym } = useMonthFilter();
  const [fills, setFills] = useState<FuelFill[]>([]);

  const load = async () => {
    try {
      setFills(await getFuelFills());
    } catch {
      setFills((prev) => prev); // keep last good state on error
    }
  };

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("mtsy:fuel-fills-changed", onChange);
    return () => window.removeEventListener("mtsy:fuel-fills-changed", onChange);
  }, []);

  // Aggregate liters + cost for the selected month only.
  const { liters, cost, count } = useMemo(() => {
    const monthFills = fills.filter((f) => f?.date?.startsWith(ym));
    return monthFills.reduce(
      (acc, f) => ({
        liters: acc.liters + (Number(f.liters) || 0),
        cost: acc.cost + (Number(f.cost) || 0),
        count: acc.count + 1,
      }),
      { liters: 0, cost: 0, count: 0 },
    );
  }, [fills, ym]);

  return (
    <section className="surface-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Fuel className="h-4 w-4" />
        </span>
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold">
          Monthly Fuel Consumption · {ym}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Liters</p>
          <p className="font-display text-xl font-bold tabular text-primary">
            {fmtNumber(liters)}<span className="text-xs text-muted-foreground"> L</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Fuel Cost</p>
          <p className="font-display text-xl font-bold tabular text-primary">{fmtMoney(cost)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Refuels</p>
          <p className="font-display text-xl font-bold tabular text-primary">{count}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Informational only · excluded from expenses & profit
      </p>
    </section>
  );
};

export default MonthlyFuelCard;
