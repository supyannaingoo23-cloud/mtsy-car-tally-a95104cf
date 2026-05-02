import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Fuel, MapPin } from "lucide-react";
import { FuelFill, getFuelFills, getRegion } from "@/lib/db";
import { computeQuotaStatus, QUOTA_LITERS } from "@/lib/quota";
import { cn } from "@/lib/utils";

const QuotaCard = () => {
  const [fills, setFills] = useState<FuelFill[]>([]);
  const [region, setRegion] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setFills(await getFuelFills());
      setRegion(await getRegion());
    })();
  }, []);

  const status = computeQuotaStatus(fills);
  const dayParity = status.isEvenToday ? "Even" : "Odd";
  const todayDate = new Date().getDate();

  return (
    <Link
      to="/daily"
      className="surface-card border border-border rounded-xl overflow-hidden block transition-smooth hover:border-primary/60"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold tracking-wider uppercase text-sm">
            {QUOTA_LITERS}L Quota
          </h2>
        </div>
        {region && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <MapPin className="h-3 w-3" />
            {region}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/60">
        <div className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            Days Left
          </p>
          <p
            className={cn(
              "font-display text-3xl font-bold tabular mt-1",
              status.canRefuelToday ? "text-success" : "text-primary",
            )}
          >
            {status.canRefuelToday ? "0" : status.daysUntilEligible}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {status.canRefuelToday ? "Eligible today" : "until eligible"}
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            Today
          </p>
          <p
            className={cn(
              "font-display text-3xl font-bold tabular mt-1",
              status.isEvenToday ? "text-success" : "text-destructive",
            )}
          >
            {dayParity}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Day {todayDate}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground px-4 py-2 border-t border-border/60">
        {status.reason}
        {status.lastFillDate && (
          <span className="text-foreground/70"> · Last fill {status.lastFillDate}</span>
        )}
      </p>
    </Link>
  );
};

export default QuotaCard;
