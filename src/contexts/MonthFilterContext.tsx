// Shared month filter so Dashboard, Daily, Finance, and Fuel widgets
// all read/write the same "selected month" (yyyy-mm) and survive navigation.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ymKey } from "@/lib/finance";

type MonthFilterContextValue = {
  ym: string; // yyyy-mm
  setYm: (next: string) => void;
  isCurrentMonth: boolean;
  resetToCurrent: () => void;
};

const STORAGE_KEY = "mtsy:monthFilter";
const MonthFilterContext = createContext<MonthFilterContextValue | null>(null);

const readInitial = (): string => {
  const current = ymKey(new Date());
  if (typeof window === "undefined") return current;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && /^\d{4}-\d{2}$/.test(v)) return v;
  } catch {
    /* ignore */
  }
  return current;
};

export const MonthFilterProvider = ({ children }: { children: ReactNode }) => {
  const [ym, setYmState] = useState<string>(() => readInitial());

  const setYm = useCallback((next: string) => {
    if (!/^\d{4}-\d{2}$/.test(next)) return;
    setYmState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const resetToCurrent = useCallback(() => setYm(ymKey(new Date())), [setYm]);

  // Auto-roll to new month when the calendar advances while app stays open.
  useEffect(() => {
    const id = window.setInterval(() => {
      const stored = (() => {
        try {
          return window.localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      // Only auto-roll if user never overrode (stored === current at last write).
      if (!stored) {
        const now = ymKey(new Date());
        setYmState((prev) => (prev === now ? prev : now));
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo<MonthFilterContextValue>(
    () => ({
      ym,
      setYm,
      isCurrentMonth: ym === ymKey(new Date()),
      resetToCurrent,
    }),
    [ym, setYm, resetToCurrent],
  );

  return (
    <MonthFilterContext.Provider value={value}>
      {children}
    </MonthFilterContext.Provider>
  );
};

export const useMonthFilter = (): MonthFilterContextValue => {
  const ctx = useContext(MonthFilterContext);
  if (!ctx) throw new Error("useMonthFilter must be used inside MonthFilterProvider");
  return ctx;
};
