import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Fuel, MapPin } from "lucide-react";
import { FuelFill, getFuelFills, getQuotaLiters, getRegion } from "@/lib/db";
import { computeAllRegionStatuses, QuotaStatus } from "@/lib/quota";
import { cn } from "@/lib/utils";

const QuotaCard = () => {
  const [fills, setFills] = useState<FuelFill[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [quota, setQuota] = useState<number>(35);

  const load = async () => {
    const [f, r, q] = await Promise.all([getFuelFills(), getRegion(), getQuotaLiters()]);
    setFills(f);
    setRegion(r);
    setQuota(q);
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("mtsy:fuel-fills-changed", handler);
    return () => window.removeEventListener("mtsy:fuel-fills-changed", handler);
  }, []);

  const statuses: QuotaStatus[] = computeAllRegionStatuses(fills, region);

  return (
    <Link
      to="/daily"
      className="surface-card border border-border rounded-xl overflow-hidden block transition-smooth hover:border-primary/60"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold tracking-wider uppercase text-sm">
            Fuel Quota ({quota}L)
          </h2>
        </div>
        {region && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <MapPin className="h-3 w-3" />
            {region}
          </span>
        )}
      </div>

      <ul className="divide-y divide-border/60">
        {statuses.map((s, i) => (
          <li key={s.region || i} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {s.region || "All regions"}
              </p>
              {s.lastFillDate && (
                <p className="text-[10px] text-muted-foreground">
                  Last fill {s.lastFillDate}
                </p>
              )}
            </div>
            <span
              className={cn(
                "text-xs font-display font-bold uppercase tracking-wider px-2 py-1 rounded",
                s.badge === "available" && "bg-success/15 text-success",
                s.badge === "waiting-even" && "bg-destructive/15 text-destructive",
                s.badge === "countdown" && "bg-primary/15 text-primary",
              )}
            >
              {s.reason}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
};

export default QuotaCard;
