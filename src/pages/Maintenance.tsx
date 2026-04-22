import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NumberInput from "@/components/NumberInput";
import { fmtNumber } from "@/lib/format";
import { toast } from "sonner";
import {
  DailyEntry,
  MaintenancePart,
  getDailyEntries,
  getParts,
  savePart,
} from "@/lib/db";
import { computeStatus } from "@/lib/maintenance";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

const Maintenance = () => {
  const [parts, setParts] = useState<MaintenancePart[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [currentMileage, setCurrentMileage] = useState<number>(0);

  const load = async () => {
    const [p, e] = await Promise.all([getParts(), getDailyEntries()]);
    setParts(p);
    setEntries(e);
    const latest = e.length ? Math.max(...e.map((x) => x.mileageStop || 0)) : 0;
    setCurrentMileage(latest || p.reduce((m, x) => Math.max(m, x.lastServiceMileage), 0));
  };

  useEffect(() => {
    load();
  }, []);

  const updatePart = async (next: MaintenancePart) => {
    await savePart(next);
    setParts((cur) => cur.map((p) => (p.key === next.key ? next : p)));
  };

  const markReplaced = async (p: MaintenancePart) => {
    const next: MaintenancePart = {
      ...p,
      lastServiceMileage: currentMileage,
      lastServiceDate: today(),
    };
    await updatePart(next);
    toast.success(`${p.label} reset`);
  };

  return (
    <div className="space-y-4">
      <section className="surface-card border border-border rounded-xl p-4 space-y-3">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Current Mileage (km)
        </Label>
        <NumberInput
          value={currentMileage}
          onChange={(n) => setCurrentMileage(n)}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">
          Auto-filled from latest daily entry. Edit if needed before checking status.
        </p>
      </section>

      <section className="space-y-3">
        {parts.map((p) => {
          const s = computeStatus(p, currentMileage);
          const tone =
            s.level === "overdue"
              ? "border-destructive/60"
              : s.level === "due-soon"
                ? "border-primary/60"
                : "border-border";
          const pct = Math.min(100, (s.kmSinceService / p.kmInterval) * 100);
          return (
            <article
              key={p.key}
              className={cn(
                "surface-card border rounded-xl p-4 space-y-3",
                tone,
                s.level === "overdue" && "shadow-glow",
              )}
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold tracking-wide text-base">{p.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {fmtNumber(p.kmInterval)} km
                    {p.monthsInterval ? ` · ${p.monthsInterval} mo` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded",
                    s.level === "overdue" && "bg-destructive text-destructive-foreground",
                    s.level === "due-soon" && "bg-primary/20 text-primary",
                    s.level === "ok" && "bg-success/15 text-success",
                  )}
                >
                  {s.level === "overdue" ? "Overdue" : s.level === "due-soon" ? "Due Soon" : "OK"}
                </span>
              </header>

              <div className="space-y-1.5">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      s.level === "overdue"
                        ? "bg-destructive"
                        : s.level === "due-soon"
                          ? "bg-primary"
                          : "bg-success",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground tabular">
                  {fmtNumber(s.kmSinceService)} / {fmtNumber(p.kmInterval)} km · {s.reason}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Last Service KM
                  </Label>
                  <NumberInput
                    value={p.lastServiceMileage}
                    onChange={(n) =>
                      updatePart({ ...p, lastServiceMileage: n })
                    }
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Last Service Date
                  </Label>
                  <Input
                    type="date"
                    value={p.lastServiceDate}
                    onChange={(e) => updatePart({ ...p, lastServiceDate: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              <Button
                onClick={() => markReplaced(p)}
                variant="secondary"
                className="w-full font-display uppercase tracking-wider"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Replaced
              </Button>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default Maintenance;
