import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Gauge, CalendarDays, Wallet, Wrench, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Gauge, end: true },
  { to: "/daily", label: "Daily", icon: CalendarDays },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/maintenance", label: "Service", icon: Wrench },
  { to: "/settings", label: "More", icon: SettingsIcon },
];

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/daily": "Daily Tracking",
  "/finance": "Finance",
  "/maintenance": "Maintenance",
  "/settings": "Settings",
};

const AppLayout = () => {
  const loc = useLocation();
  const title = titles[loc.pathname] ?? "MTSY";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur-xl bg-background/70">
        <div className="mx-auto max-w-screen-sm px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center font-display font-bold text-primary-foreground shadow-glow">
              M
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-sm tracking-wider">MTSY</p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-[0.2em]">
                {title}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground tabular">Car Rental</span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-sm px-4 pb-28 pt-4 animate-slide-up">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-screen-sm grid grid-cols-5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wider transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-smooth",
                      isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]",
                    )}
                  />
                  <span className="font-display font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
