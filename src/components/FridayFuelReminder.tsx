import { useEffect, useState } from "react";
import { Fuel, X } from "lucide-react";
import { Link } from "react-router-dom";

const DISMISS_KEY = "mtsy:fridayReminder:dismissedFor"; // stores yyyy-mm-dd of dismissed Friday

const todayStr = () => new Date().toISOString().slice(0, 10);
const isFriday = () => new Date().getDay() === 5;

const FridayFuelReminder = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isFriday()) {
      setShow(false);
      return;
    }
    const dismissed = localStorage.getItem(DISMISS_KEY);
    setShow(dismissed !== todayStr());
  }, []);

  if (!show) return null;

  return (
    <div className="surface-card border border-primary/40 bg-primary/5 rounded-xl p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
        <Fuel className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold uppercase tracking-wider text-xs">
          It's Friday!
        </p>
        <p className="text-xs text-muted-foreground">
          Please update the weekly Fuel Prices.
        </p>
      </div>
      <Link
        to="/settings"
        className="text-[10px] uppercase tracking-wider font-bold text-primary px-2 py-1 rounded border border-primary/40 hover:bg-primary/10 transition-colors"
      >
        Update
      </Link>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, todayStr());
          setShow(false);
        }}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default FridayFuelReminder;
