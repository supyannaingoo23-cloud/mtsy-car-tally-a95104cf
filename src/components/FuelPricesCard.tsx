import { useEffect, useState } from "react";
import { Fuel, TrendingDown, TrendingUp } from "lucide-react";
import {
  FuelHistoryEntry,
  FuelPrices,
  getFuelHistory,
  getFuelPrices,
} from "@/lib/db";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  /** Hide the small "updated" footer (compact view). */
  compact?: boolean;
  /** Override title text. */
  title?: string;
  /** Show delta vs previous history entry. */
  showDelta?: boolean;
};

const FuelPricesCard = ({
  compact = false,
  title = "Fuel Prices",
  showDelta = true,
}: Props) => {
  const [prices, setPrices] = useState<FuelPrices>({
    price92: 0,
    price95: 0,
    priceDiesel: 0,
  });
  const [history, setHistory] = useState<FuelHistoryEntry[]>([]);

  useEffect(() => {
    (async () => {
      setPrices(await getFuelPrices());
      setHistory(await getFuelHistory());
    })();
  }, []);

  const latest = history[0];
  const previous = history[1];

  const updatedLabel = prices.updatedAt
    ? `Updated ${new Date(prices.updatedAt).toLocaleDateString()}`
    : "Update weekly in Settings";

  return (
    <section className="surface-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold tracking-wider uppercase text-sm">
            {title}
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border/60">
        <PriceCell
          label="92"
          value={prices.price92}
          delta={
            showDelta && latest && previous
              ? latest.gasoline92 - previous.gasoline92
              : undefined
          }
        />
        <PriceCell
          label="95"
          value={prices.price95}
          delta={
            showDelta && latest && previous
              ? latest.gasoline95 - previous.gasoline95
              : undefined
          }
        />
      </div>
      {!compact && (
        <p className="text-[10px] text-muted-foreground px-4 py-2 border-t border-border/60">
          {updatedLabel}
        </p>
      )}
    </section>
  );
};

const PriceCell = ({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta?: number;
}) => {
  const hasDelta = delta !== undefined && delta !== 0;
  const up = (delta ?? 0) > 0;
  return (
    <div className="p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-primary tabular mt-1">
        {fmtNumber(value, { decimals: value % 1 === 0 ? 0 : 2 })}
      </p>
      {hasDelta && (
        <p
          className={cn(
            "mt-1 inline-flex items-center justify-center gap-0.5 text-[10px] font-semibold tabular",
            up ? "text-destructive" : "text-success",
          )}
        >
          {up ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {up ? "+" : ""}
          {fmtNumber(delta!, { decimals: 0 })}
        </p>
      )}
    </div>
  );
};

export default FuelPricesCard;
