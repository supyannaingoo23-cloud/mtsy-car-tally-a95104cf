import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NumberInput from "@/components/NumberInput";
import FuelPricesCard from "@/components/FuelPricesCard";
import FuelFillsCard from "@/components/FuelFillsCard";
import MonthFilter from "@/components/MonthFilter";
import { useMonthFilter } from "@/contexts/MonthFilterContext";
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
  DailyEntry,
  TripType,
  dailyProfit,
  deleteDailyEntry,
  getDailyEntries,
  kmDriven,
  saveDailyEntry,
  totalExpense,
} from "@/lib/db";
import { fmtMoney } from "@/lib/finance";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

type FormState = {
  date: string;
  mileageStart: string;
  mileageStop: string;
  fuelFees: string;
  otherFees: string;
  income: string;
  tripType: TripType;
  tripStart: string;
  tripEnd: string;
};

const empty = (date: string, mileageStart: number): FormState => ({
  date,
  mileageStart: String(mileageStart || ""),
  mileageStop: "",
  fuelFees: "",
  otherFees: "",
  income: "",
  tripType: "city",
  tripStart: "",
  tripEnd: "",
});

const tripDays = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
};

const Daily = () => {
  const { ym } = useMonthFilter();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [form, setForm] = useState<FormState>(empty(today(), 0));
  const [editingId, setEditingId] = useState<FuelOrNull>(null);
  const [pendingDelete, setPendingDelete] = useState<DailyEntry | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = async () => {
    const list = await getDailyEntries();
    setEntries(list);
    if (!editingId) {
      const lastStop = list.length ? list[list.length - 1].mileageStop : 0;
      setForm((f) => ({
        ...f,
        mileageStart: f.mileageStart || String(lastStop || ""),
      }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draft: DailyEntry = useMemo(
    () => ({
      id: editingId ?? form.date,
      date: form.date,
      mileageStart: Number(form.mileageStart) || 0,
      mileageStop: Number(form.mileageStop) || 0,
      fuelFees: Number(form.fuelFees) || 0,
      otherFees: Number(form.otherFees) || 0,
      income: Number(form.income) || 0,
      tripType: form.tripType,
      tripStart: form.tripType === "long" ? form.tripStart || null : null,
      tripEnd: form.tripType === "long" ? form.tripEnd || null : null,
    }),
    [form, editingId],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.date) return toast.error("Pick a date");
    if (draft.mileageStop && draft.mileageStop < draft.mileageStart) {
      return toast.error("Mileage Stop must be ≥ Start");
    }
    if (form.tripType === "long" && (!form.tripStart || !form.tripEnd)) {
      return toast.error("Long trip needs start & end dates");
    }
    try {
      await saveDailyEntry(draft);
      toast.success(editingId ? "Entry updated" : "Entry saved");
    } catch (err: any) {
      return toast.error(err?.message || "Failed to save");
    }
    const next = await getDailyEntries();
    setEntries(next);
    setEditingId(null);
    const lastStop = next.length ? next[next.length - 1].mileageStop : 0;
    setForm(empty(today(), lastStop));
  };

  const startEdit = (e: DailyEntry) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      mileageStart: String(e.mileageStart || ""),
      mileageStop: String(e.mileageStop || ""),
      fuelFees: String(e.fuelFees || ""),
      otherFees: String(e.otherFees || ""),
      income: String(e.income || ""),
      tripType: e.tripType ?? "city",
      tripStart: e.tripStart ?? "",
      tripEnd: e.tripEnd ?? "",
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    const lastStop = entries.length ? entries[entries.length - 1].mileageStop : 0;
    setForm(empty(today(), lastStop));
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    try {
      await deleteDailyEntry(pendingDelete.id);
      toast.success("Entry deleted");
      if (editingId === pendingDelete.id) cancelEdit();
      setPendingDelete(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const recent = [...entries].reverse().slice(0, 30);

  return (
    <div className="space-y-5">
      <FuelPricesCard compact title="Fuel Prices (Today)" />
      <FuelFillsCard />

      <form ref={formRef} onSubmit={submit} className="surface-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-display font-bold uppercase tracking-wider text-sm text-primary">
          {editingId ? `Edit Entry — ${form.date}` : "New Daily Entry"}
        </h2>

        <Field label="Date">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            Trip Type
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, tripType: "city" })}
              className={cn(
                "h-10 rounded-md border text-sm font-display uppercase tracking-wider",
                form.tripType === "city"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              City Trip
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, tripType: "long" })}
              className={cn(
                "h-10 rounded-md border text-sm font-display uppercase tracking-wider",
                form.tripType === "long"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              Long Trip
            </button>
          </div>
        </div>

        {form.tripType === "long" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trip Start">
              <Input
                type="date"
                value={form.tripStart}
                onChange={(e) => setForm({ ...form, tripStart: e.target.value })}
              />
            </Field>
            <Field label="Trip End">
              <Input
                type="date"
                value={form.tripEnd}
                onChange={(e) => setForm({ ...form, tripEnd: e.target.value })}
              />
            </Field>
            <div className="col-span-2 text-xs text-muted-foreground">
              Total trip days: <span className="text-foreground font-bold">{tripDays(form.tripStart, form.tripEnd)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mileage Start (km)">
            <NumberInput
              value={form.mileageStart}
              onChange={(n) => setForm({ ...form, mileageStart: n ? String(n) : "" })}
              placeholder="0"
            />
          </Field>
          <Field label="Mileage Stop (km)">
            <NumberInput
              value={form.mileageStop}
              onChange={(n) => setForm({ ...form, mileageStop: n ? String(n) : "" })}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fuel Fees">
            <NumberInput
              value={form.fuelFees}
              onChange={(n) => setForm({ ...form, fuelFees: n ? String(n) : "" })}
              placeholder="0"
            />
          </Field>
          <Field label="Other Fees">
            <NumberInput
              value={form.otherFees}
              onChange={(n) => setForm({ ...form, otherFees: n ? String(n) : "" })}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Income">
          <NumberInput
            value={form.income}
            onChange={(n) => setForm({ ...form, income: n ? String(n) : "" })}
            placeholder="0"
          />
        </Field>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Mini label="Driven" value={`${fmtNumber(kmDriven(draft))} km`} />
          <Mini label="Expense" value={fmtMoney(totalExpense(draft))} />
          <Mini
            label="Profit"
            value={fmtMoney(dailyProfit(draft))}
            tone={dailyProfit(draft) >= 0 ? "success" : "danger"}
          />
        </div>


        <div className="flex gap-2">
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={cancelEdit}
              className="h-12 font-display tracking-wider uppercase"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 h-12 font-display tracking-wider uppercase bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
          >
            {editingId ? "Update Entry" : "Save Entry"}
          </Button>
        </div>
      </form>

      <section className="surface-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-display font-bold uppercase tracking-wider text-sm">
            Recent Entries
          </h3>
          <span className="text-xs text-muted-foreground">{entries.length} total</span>
        </div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {recent.map((e) => {
              const profit = dailyProfit(e);
              const isLong = e.tripType === "long";
              return (
                <li key={e.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{e.date}</p>
                      <span className={cn(
                        "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold",
                        isLong ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                      )}>
                        {isLong ? "Long" : "City"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground tabular">
                      {fmtNumber(kmDriven(e))} km · Exp {fmtMoney(totalExpense(e))} · Inc{" "}
                      {fmtMoney(e.income)}
                      {isLong && e.tripStart && e.tripEnd && (
                        <> · {tripDays(e.tripStart, e.tripEnd)} day{tripDays(e.tripStart, e.tripEnd) === 1 ? "" : "s"}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-display font-bold tabular text-base",
                      profit >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {fmtMoney(profit)}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    className="p-2 text-muted-foreground hover:text-primary transition-smooth"
                    aria-label="Edit entry"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(e)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-smooth"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete daily entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Entry for {pendingDelete?.date}. This cannot be undone.
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
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {label}
    </Label>
    {children}
  </div>
);

const Mini = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) => (
  <div
    className={cn(
      "rounded-lg border p-2 text-center",
      tone === "success" && "border-success/40 bg-success/10",
      tone === "danger" && "border-destructive/40 bg-destructive/10",
      tone === "default" && "border-border bg-secondary/40",
    )}
  >
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
      {label}
    </p>
    <p className="text-sm font-display font-bold tabular">{value}</p>
  </div>
);

export default Daily;
