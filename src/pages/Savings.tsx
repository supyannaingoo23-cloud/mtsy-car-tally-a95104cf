import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Pencil, PiggyBank, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NumberInput from "@/components/NumberInput";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import {
  DailyEntry,
  MonthlyInputs,
  SavingsCategory,
  Withdrawal,
  deleteWithdrawal,
  getDailyEntries,
  getMonthlyMap,
  getWithdrawals,
  saveWithdrawal,
} from "@/lib/db";
import {
  SAVINGS_LABEL,
  SavingsAccrual,
  computeAccruals,
  fmtMoney,
  sumAccruals,
  sumWithdrawals,
  ymKey,
  yKey,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

type Range = "month" | "year" | "all";

const Savings = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [monthlyMap, setMonthlyMap] = useState<Record<string, MonthlyInputs>>({});
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [range, setRange] = useState<Range>("month");
  const [dialogCat, setDialogCat] = useState<SavingsCategory | null>(null);
  const [editing, setEditing] = useState<Withdrawal | null>(null);

  const refresh = async () => {
    const [e, m, w] = await Promise.all([
      getDailyEntries(),
      getMonthlyMap(),
      getWithdrawals(),
    ]);
    setEntries(e);
    setMonthlyMap(m);
    setWithdrawals(w);
  };

  useEffect(() => {
    refresh();
  }, []);

  const accruals: SavingsAccrual[] = useMemo(
    () => computeAccruals(entries, monthlyMap),
    [entries, monthlyMap],
  );

  const ym = ymKey(new Date());
  const yr = yKey(new Date());
  const filter =
    range === "month"
      ? (d: string) => d.startsWith(ym)
      : range === "year"
        ? (d: string) => d.startsWith(yr)
        : undefined;

  // Running balance (lifetime) — what the dashboard shows
  const lifetimeIncome = sumAccruals(accruals);
  const lifetimeOut = sumWithdrawals(withdrawals);
  const balances: Record<SavingsCategory, number> = {
    general: lifetimeIncome.general - lifetimeOut.general,
    child: lifetimeIncome.child - lifetimeOut.child,
    donation: lifetimeIncome.donation - lifetimeOut.donation,
  };

  // Range view — income / withdrawals / net within selected window
  const rangeIncome = sumAccruals(accruals, filter);
  const rangeOut = sumWithdrawals(withdrawals, filter);

  // Combined transaction history (within range)
  type Tx =
    | { kind: "in"; id: string; date: string; category: SavingsCategory; amount: number; note: string }
    | { kind: "out"; id: string; date: string; category: SavingsCategory; amount: number; note: string };

  const txs: Tx[] = useMemo(() => {
    const inflows: Tx[] = accruals.flatMap((a) => {
      const monthLabel = `Auto-accrual ${a.ym}`;
      const date = `${a.ym}-01`;
      const items: Tx[] = [];
      if (a.general > 0)
        items.push({ kind: "in", id: `in-g-${a.ym}`, date, category: "general", amount: a.general, note: monthLabel });
      if (a.child > 0)
        items.push({ kind: "in", id: `in-c-${a.ym}`, date, category: "child", amount: a.child, note: monthLabel });
      if (a.donation > 0)
        items.push({ kind: "in", id: `in-d-${a.ym}`, date, category: "donation", amount: a.donation, note: monthLabel });
      return items;
    });
    const outflows: Tx[] = withdrawals.map((w) => ({
      kind: "out",
      id: w.id,
      date: w.date,
      category: w.category,
      amount: w.amount,
      note: w.note,
    }));
    const all = [...inflows, ...outflows];
    const filtered = filter ? all.filter((t) => filter(t.date)) : all;
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [accruals, withdrawals, filter]);

  const handleDelete = async (id: string) => {
    await deleteWithdrawal(id);
    await refresh();
    toast.success("Withdrawal deleted");
  };

  const cats: SavingsCategory[] = ["general", "child", "donation"];

  return (
    <div className="space-y-5">
      <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="month" className="font-display uppercase tracking-wider">
            Month
          </TabsTrigger>
          <TabsTrigger value="year" className="font-display uppercase tracking-wider">
            Year
          </TabsTrigger>
          <TabsTrigger value="all" className="font-display uppercase tracking-wider">
            All
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lifetime balance cards (always shown so user always sees the running balance) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <PiggyBank className="h-4 w-4 text-success" />
          <h2 className="font-display font-bold tracking-wider uppercase text-xs">
            Running Balance
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {cats.map((c) => (
            <BalanceCard
              key={c}
              category={c}
              balance={balances[c]}
              accrued={lifetimeIncome[c]}
              withdrawn={lifetimeOut[c]}
              onWithdraw={() => setDialogCat(c)}
            />
          ))}
        </div>
      </section>

      {/* Range summary */}
      <section className="surface-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display uppercase tracking-wider text-sm font-bold">
          {range === "month" ? "This Month" : range === "year" ? "This Year" : "All Time"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {cats.map((c) => {
            const net = rangeIncome[c] - rangeOut[c];
            return (
              <StatCard
                key={`net-${c}`}
                label={`${SAVINGS_LABEL[c]} (Net)`}
                value={fmtMoney(net)}
                tone={net < 0 ? "danger" : "success"}
              />
            );
          })}
          {cats.map((c) => (
            <StatCard
              key={`out-${c}`}
              label={`${SAVINGS_LABEL[c]} -`}
              value={fmtMoney(rangeOut[c])}
              tone="danger"
            />
          ))}
        </div>
      </section>

      {/* Transaction history */}
      <section className="surface-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/60">
          <h2 className="font-display font-bold tracking-wider uppercase text-sm">
            Transaction History
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {txs.length} {txs.length === 1 ? "entry" : "entries"} in selected range
          </p>
        </div>
        <div className="divide-y divide-border/60">
          {txs.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No transactions in this range.
            </p>
          )}
          {txs.map((t) => (
            <div key={`${t.kind}-${t.id}`} className="p-3 flex items-center gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-lg grid place-items-center shrink-0",
                  t.kind === "in" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                )}
              >
                {t.kind === "in" ? (
                  <ArrowUpCircle className="h-4 w-4" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{SAVINGS_LABEL[t.category]}</p>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.date}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{t.note}</p>
              </div>
              <span
                className={cn(
                  "font-display tabular text-sm font-bold",
                  t.kind === "in" ? "text-success" : "text-destructive",
                )}
              >
                {t.kind === "in" ? "+" : "-"}
                {fmtMoney(t.amount)}
              </span>
              {t.kind === "out" && (
                <>
                  <button
                    onClick={() => {
                      const w = withdrawals.find((x) => x.id === t.id);
                      if (w) setEditing(w);
                    }}
                    className="text-muted-foreground hover:text-primary transition-smooth"
                    aria-label="Edit withdrawal"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-muted-foreground hover:text-destructive transition-smooth"
                    aria-label="Delete withdrawal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <WithdrawDialog
        category={dialogCat}
        onClose={() => setDialogCat(null)}
        onSaved={refresh}
      />
    </div>
  );
};

const BalanceCard = ({
  category,
  balance,
  accrued,
  withdrawn,
  onWithdraw,
}: {
  category: SavingsCategory;
  balance: number;
  accrued: number;
  withdrawn: number;
  onWithdraw: () => void;
}) => {
  const negative = balance < 0;
  return (
    <div className="surface-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {SAVINGS_LABEL[category]}
          </p>
          <p
            className={cn(
              "font-display text-3xl font-bold tabular mt-1",
              negative ? "text-destructive" : "text-primary",
            )}
          >
            {fmtMoney(balance)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onWithdraw}
          className="font-display uppercase tracking-wider text-[10px]"
        >
          Withdraw
        </Button>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-success">+ {fmtMoney(accrued)} accrued</span>
        <span className="text-destructive">- {fmtMoney(withdrawn)} withdrawn</span>
      </div>
    </div>
  );
};

const WithdrawDialog = ({
  category,
  onClose,
  onSaved,
}: {
  category: SavingsCategory | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (category) {
      setAmount(0);
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [category]);

  const submit = async () => {
    if (!category) return;
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    await saveWithdrawal({
      id: `${Date.now()}`,
      date,
      category,
      amount: amount,
      note: note.trim() || "Withdrawal",
    });
    toast.success("Withdrawal recorded");
    await onSaved();
    onClose();
  };

  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider">
            Withdraw — {category ? SAVINGS_LABEL[category] : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Date
            </Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Amount
            </Label>
            <NumberInput
              value={amount}
              onChange={(n) => setAmount(n)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Note / Reason
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is this withdrawal for?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={submit}
            className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Savings;
