import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Fuel, MapPin, CalendarClock } from "lucide-react";
import { FuelFill, getFuelFills, getQuotaLiters, getRegion } from "@/lib/db";
import { computeAllRegionStatuses, QuotaStatus } from "@/lib/quota";
import { Progress } from "@/components/ui/progress";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { detectRegion } from "@/lib/geoRegion";

const QuotaCard = () => {
  const [fills, setFills] = useState<FuelFill[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [quota, setQuota] = useState<number>(35);
  const [gpsRegion, setGpsRegion] = useState<string | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "ok" | "error">("idle");

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

  useEffect(() => {
    let cancelled = false;
    setGpsState("loading");
    detectRegion().then((res) => {
      if (cancelled) return;
      if (res.status === "ok") {
        setGpsRegion(res.region);
        setGpsState("ok");
      } else {
        setGpsState("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const statuses: QuotaStatus[] = computeAllRegionStatuses(fills, region, new Date(), quota);

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
        {statuses.map((s, i) => {
          const usedPct = Math.min(100, Math.max(0, s.usedPercent));
          return (
            <li key={s.region || i} className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {s.region || "All regions"}
                  </p>
                  {s.lastFillDate && (
                    <p className="text-[10px] text-muted-foreground">
                      Last fill {s.lastFillDate} · {fmtNumber(s.lastFillLiters)}L
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-display font-bold uppercase tracking-wider px-2 py-1 rounded whitespace-nowrap",
                    s.badge === "available" && "bg-success/15 text-success",
                    s.badge === "waiting-even" && "bg-destructive/15 text-destructive",
                    s.badge === "countdown" && "bg-primary/15 text-primary",
                  )}
                >
                  {s.reason}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] tabular">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {fmtNumber(s.remainingLiters)}L
                    </span>{" "}
                    Remaining /{" "}
                    <span className="font-semibold text-foreground">
                      {fmtNumber(s.quotaTotal)}L
                    </span>{" "}
                    Total
                  </span>
                  <span className="text-muted-foreground">{usedPct}% used</span>
                </div>
                <Progress value={usedPct} className="h-1.5" />
              </div>

              {s.nextEligibleDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  <span>
                    Next Eligible:{" "}
                    <span className="font-semibold text-foreground">
                      {s.nextEligibleDate}
                    </span>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Link>
  );
};

export default QuotaCard;
