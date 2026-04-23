import { useEffect, useState } from "react";
import { Fuel } from "lucide-react";
import { FuelPrices, getFuelPrices } from "@/lib/db";
import { fmtNumber } from "@/lib/format";

type Props = {
  /** Hide the small "updated" footer (compact view). */
  compact?: boolean;
  /** Override title text. */
  title?: string;
};

const FuelPricesCard = ({ compact = false, title = "Fuel Prices" }: Props) => {
  const [prices, setPrices] = useState<FuelPrices>({
    price92: 0,
    price95: 0,
    priceDiesel: 0,
  });

  useEffect(() => {
    (async () => setPrices(await getFuelPrices()))();
  }, []);

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
        <PriceCell label="92" value={prices.price92} />
        <PriceCell label="95" value={prices.price95} />
      </div>
      {!compact && (
        <p className="text-[10px] text-muted-foreground px-4 py-2 border-t border-border/60">
          {updatedLabel}
        </p>
      )}
    </section>
  );
};

const PriceCell = ({ label, value }: { label: string; value: number }) => (
  <div className="p-4 text-center">
    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {label}
    </p>
    <p className="font-display text-2xl font-bold text-primary tabular mt-1">
      {fmtNumber(value, { decimals: value % 1 === 0 ? 0 : 2 })}
    </p>
  </div>
);

export default FuelPricesCard;
