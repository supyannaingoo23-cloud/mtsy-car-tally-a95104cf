import { useEffect, useState } from "react";

const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="surface-card rounded-xl border border-border p-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          Now
        </p>
        <p className="font-display text-3xl font-bold tabular text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.4)]">
          {time}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          Today
        </p>
        <p className="text-sm font-medium">{date}</p>
      </div>
    </div>
  );
};

export default LiveClock;
