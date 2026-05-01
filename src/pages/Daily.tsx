import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NumberInput from "@/components/NumberInput";
import FuelPricesCard from "@/components/FuelPricesCard";
import { toast } from "sonner";
import {
  DailyEntry,
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
};

const empty = (date: string, mileageStart: number): FormState => ({
  date,
  mileageStart: String(mileageStart || ""),
  mileageStop: "",
  fuelFees: "",
  otherFees: "",
  income: "",
});

const Daily = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [form, setForm] = useState<FormState>(empty(today(), 0));
  const [editingId, setEditingId] = useState<string | null>(null);
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
    }),
    [form, editingId],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.date) return toast.error("Pick a date");
    if (draft.mileageStop && draft.mileageStop < draft.mileageStart) {
      return toast.error("Mileage Stop must be ≥ Start");
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
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    const lastStop = entries.length ? entries[entries.length - 1].mileageStop : 0;
    setForm(empty(today(), lastStop));
  };

  const remove = async (id: string) => {
    await deleteDailyEntry(id);
    toast.success("Entry deleted");
    if (editingId === id) cancelEdit();
    load();
  };

  const recent = [...entries].reverse().slice(0, 30);

  return (
    <div className="space-y-5">
      <FuelPricesCard compact title="Fuel Prices (Today)" />

      <form onSubmit={submit} className="surface-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-display font-bold uppercase tracking-wider text-sm text-primary">
          New Daily Entry
        </h2>

        <Field label="Date">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>

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


        <Button
          type="submit"
          className="w-full h-12 font-display tracking-wider uppercase bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
        >
          Save Entry
        </Button>
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
              return (
                <li key={e.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{e.date}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {fmtNumber(kmDriven(e))} km · Exp {fmtMoney(totalExpense(e))} · Inc{" "}
                      {fmtMoney(e.income)}
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
                    onClick={() => remove(e.id)}
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
