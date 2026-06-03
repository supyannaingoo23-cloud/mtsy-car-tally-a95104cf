import { FormEvent, useEffect, useMemo, useState } from "react";
import { Fuel, Plus, Trash2 } from "lucide-react";
import { useMonthFilter } from "@/contexts/MonthFilterContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NumberInput from "@/components/NumberInput";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  FuelFill,
  FuelHistoryEntry,
  deleteFuelFill,
  getFuelFills,
  getFuelHistory,
  getFuelPrices,
  getQuotaLiters,
  getRegion,
  saveFuelFill,
} from "@/lib/db";
import { MYANMAR_REGIONS } from "@/lib/regions";
import { fmtNumber } from "@/lib/format";
import { fmtMoney } from "@/lib/finance";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Octane-92 price effective on a given date.
 * Picks the most recent fuel_history row with date <= target, else falls back
 * to the current snapshot price. Returns 0 if neither is available.
 */
const price92On = (
  dateStr: string,
  history: FuelHistoryEntry[],
  currentPrice92: number,
): number => {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const match = sorted.find((h) => h.date <= dateStr);
  if (match && Number(match.gasoline92) > 0) return Number(match.gasoline92);
  return Number(currentPrice92) || 0;
};

const FuelFillsCard = () => {
  const { ym } = useMonthFilter();
  const [fills, setFills] = useState<FuelFill[]>([]);
  const [quota, setQuota] = useState<number>(35);
  const [defaultRegion, setDefaultRegion] = useState<string>("");
  const [history, setHistory] = useState<FuelHistoryEntry[]>([]);
  const [currentPrice92, setCurrentPrice92] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FuelFill | null>(null);
  const [date, setDate] = useState(today());
  const [region, setRegion] = useState<string>("");
  const [liters, setLiters] = useState<number>(35);
  const [note, setNote] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FuelFill | null>(null);

  const load = async () => {
    const [f, q, r, h, p] = await Promise.all([
      getFuelFills(),
      getQuotaLiters(),
      getRegion(),
      getFuelHistory(),
      getFuelPrices(),
    ]);
    setFills(f);
    setQuota(q);
    setDefaultRegion(r ?? "");
    setHistory(h);
    setCurrentPrice92(Number(p?.price92) || 0);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setDate(today());
    setRegion(defaultRegion || "");
    setLiters(quota);
    setNote("");
    setOpen(true);
  };

  const startEdit = (f: FuelFill) => {
    setEditing(f);
    setDate(f.date);
    setRegion(f.region ?? "");
    setLiters(f.liters);
    setNote(f.note);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!region) return toast.error("Pick a region/state");
    if (!liters || liters <= 0) return toast.error("Enter liters > 0");
    try {
      await saveFuelFill({
        id: editing?.id ?? `fill-${Date.now()}`,
        date,
        liters,
        cost: Math.max(0, Number(computedCost) || 0),
        note: note.trim(),
        region,
      });
      toast.success(editing ? "Fuel fill updated" : "Fuel fill recorded");
      setOpen(false);
      await load();
      window.dispatchEvent(new CustomEvent("mtsy:fuel-fills-changed"));
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    }
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    try {
      await deleteFuelFill(pendingDelete.id);
      toast.success("Fuel fill deleted");
      setPendingDelete(null);
      await load();
      window.dispatchEvent(new CustomEvent("mtsy:fuel-fills-changed"));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  // Restrict the visible fills to the globally-selected month.
  const monthFills = useMemo(
    () => fills.filter((f) => f?.date?.startsWith(ym)),
    [fills, ym],
  );

  // Octane-92 price effective on the form's selected date (historical lookup).
  const effectivePrice92 = useMemo(
    () => price92On(date, history, currentPrice92),
    [date, history, currentPrice92],
  );
  // Auto-calculated fuel cost = liters × effective 92 price. Frozen on save.
  const computedCost = useMemo(
    () => (Number(liters) || 0) * (Number(effectivePrice92) || 0),
    [liters, effectivePrice92],
  );

  return (
    <section className="surface-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold tracking-wider uppercase text-sm">
            Fuel Fills
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            · {ym}
          </span>
        </div>
        <Button
          size="sm"
          onClick={startNew}
          className="h-8 font-display uppercase tracking-wider text-[10px] bg-gradient-primary text-primary-foreground"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Fill
        </Button>
      </div>

      {monthFills.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {fills.length === 0
            ? "No fills logged yet."
            : "No fills in this month."}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {monthFills.slice(0, 20).map((f) => (
            <li key={f.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{f.date}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {f.region || "—"}
                  {f.note && ` · ${f.note}`}
                </p>
              </div>
              <span className="font-display font-bold tabular text-sm text-primary">
                {fmtNumber(f.liters)} L
              </span>
              <button
                type="button"
                onClick={() => startEdit(f)}
                className="text-xs text-muted-foreground hover:text-primary px-2"
                aria-label="Edit"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(f)}
                className="p-2 text-muted-foreground hover:text-destructive transition-smooth"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">
              {editing ? "Edit Fuel Fill" : "New Fuel Fill"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Region / State *
              </Label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                required
                className="w-full h-10 rounded-md bg-input border border-border px-3 text-sm font-medium"
              >
                <option value="">— Select region —</option>
                {MYANMAR_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Liters
              </Label>
              <NumberInput value={liters} onChange={setLiters} placeholder={String(quota)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Fuel Cost (Ks) · Auto
              </Label>
              {/* Auto-calculated: liters × Octane 92 price effective on this date.
                  Stored historically — does NOT affect monthly expenses or profit. */}
              <div className="h-10 rounded-md bg-muted/40 border border-border px-3 text-sm font-semibold flex items-center justify-between">
                <span className="tabular text-primary">{fmtMoney(computedCost)}</span>
                <span className="text-[10px] text-muted-foreground">
                  @ {fmtNumber(effectivePrice92)} Ks/L (92)
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Date
              </Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Note (optional)
              </Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Station, odometer..." />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fuel fill?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.date} · {pendingDelete?.region} · {pendingDelete?.liters}L. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default FuelFillsCard;
