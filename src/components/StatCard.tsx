import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "primary" | "success" | "danger";
  icon?: ReactNode;
};

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-border",
  primary: "border-primary/40 shadow-glow",
  success: "border-success/40",
  danger: "border-destructive/40",
};

const StatCard = ({ label, value, hint, tone = "default", icon }: Props) => (
  <div
    className={cn(
      "surface-card rounded-xl border p-4 flex flex-col gap-1.5",
      toneClasses[tone],
    )}
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
        {label}
      </span>
      {icon}
    </div>
    <span className="font-display font-bold text-2xl tabular text-foreground">{value}</span>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </div>
);

export default StatCard;
