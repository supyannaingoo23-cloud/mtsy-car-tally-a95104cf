// Compact month selector — drop-in for any page that wants the global month filter.
// Builds options from supplied data dates + a rolling window so past/future months are reachable.
import { useMemo } from "react";
import { CalendarRange, RotateCcw } from "lucide-react";
import { useMonthFilter } from "@/contexts/MonthFilterContext";
import { ymKey } from "@/lib/finance";
import { cn } from "@/lib/utils";

type Props = {
  /** Extra yyyy-mm keys (or yyyy-mm-dd dates) to include in options. */
  extraMonths?: string[];
  className?: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const labelFor = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

const toYm = (s: string) => (s?.length >= 7 ? s.slice(0, 7) : s);

const buildOptions = (current: string, extras: string[]): string[] => {
  const set = new Set<string>();
  set.add(current);
  // Rolling window: 12 months back, 1 month forward
  const [cy, cm] = current.split("-").map(Number);
  for (let i = -12; i <= 1; i++) {
    const d = new Date(cy, cm - 1 + i, 1);
    set.add(ymKey(d));
  }
  (extras || []).forEach((e) => {
    const k = toYm(e);
    if (/^\d{4}-\d{2}$/.test(k)) set.add(k);
  });
  return Array.from(set).sort().reverse();
};

const MonthFilter = ({ extraMonths = [], className }: Props) => {
  const { ym, setYm, isCurrentMonth, resetToCurrent } = useMonthFilter();
  const current = ymKey(new Date());

  const options = useMemo(
    () => buildOptions(current, extraMonths),
    [current, extraMonths],
  );

  return (
    <div
      className={cn(
        "surface-card border border-border rounded-xl p-3 flex items-center gap-2",
        className,
      )}
    >
      <CalendarRange className="h-4 w-4 text-primary shrink-0" />
      <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold shrink-0">
        Month
      </label>
      <select
        value={ym}
        onChange={(e) => setYm(e.target.value)}
        className="flex-1 h-9 rounded-md bg-input border border-border px-2 text-sm font-medium"
        aria-label="Select month filter"
      >
        {options.map((k) => (
          <option key={k} value={k}>
            {labelFor(k)}
            {k === current ? " · Current" : ""}
          </option>
        ))}
      </select>
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={resetToCurrent}
          className="h-9 px-2 rounded-md text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          aria-label="Reset to current month"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Now
        </button>
      )}
    </div>
  );
};

export default MonthFilter;
