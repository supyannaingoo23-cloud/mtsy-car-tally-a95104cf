import { FormEvent, useEffect, useState } from "react";
import { Fuel, Plus, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FuelFill, deleteFuelFill, getFuelFills, saveFuelFill } from "@/lib/db";
import { computeQuotaStatus, QUOTA_LITERS } from "@/lib/quota";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

const FuelFillsCard = () => {
  const [fills, setFills] = useState<FuelFill[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FuelFill | null>(null);
  const [date, setDate] = useState(today());
  const [liters, setLiters] = useState<number>(QUOTA_LITERS);
  const [note, setNote] = useState("");

  const load = async () => setFills(await getFuelFills());

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setDate(today());
    setLiters(QUOTA_LITERS);
    setNote("");
    setOpen(true);
  };

  const startEdit = (f: FuelFill) => {
    setEditing(f);
    setDate(f.date);
    setLiters(f.liters);
    setNote(f.note);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!liters || liters <= 0) return toast.error("Enter liters > 0");
    try {
      await saveFuelFill({
        id: editing?.id ?? `fill-${Date.now()}`,
        date,
        liters,
        note: note.trim(),
      });
      toast.success(editing ? "Fuel fill updated" : "Fuel fill recorded");
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    }
  };

  const remove = async (id: string) => {
    await deleteFuelFill(id);
    toast.success("Fuel fill deleted");
    load();
  };

  const status = computeQuotaStatus(fills);

  return (
    <section className="surface-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold tracking-wider uppercase text-sm">
            Fuel Fills
          </h2>
        </div>
        <Button
          size="sm"
          onClick={startNew}
          className="h-8 font-display uppercase tracking-wider text-[10px] bg-gradient-primary text-primary-foreground"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Fill
        </Button>
      </div>

      <div
        className={cn(
          "px-4 py-2 text-xs border-b border-border/60",
          status.canRefuelToday ? "text-success" : "text-muted-foreground",
        )}
      >
        {status.reason}
      </div>

      {fills.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No fills logged yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {fills.slice(0, 20).map((f) => (
            <li key={f.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{f.date}</p>
                {f.note && (
                  <p className="text-xs text-muted-foreground truncate">{f.note}</p>
                )}
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
                onClick={() => remove(f.id)}
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
                Date
              </Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Liters
              </Label>
              <NumberInput value={liters} onChange={setLiters} placeholder="35" />
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
    </section>
  );
};

export default FuelFillsCard;
