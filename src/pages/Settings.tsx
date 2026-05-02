import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  Smartphone,
  Info,
  FileJson,
  FileSpreadsheet,
  Fuel,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NumberInput from "@/components/NumberInput";
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
import { exportToExcel, importFromExcel } from "@/lib/backup";
import { exportToJson, importFromJson } from "@/lib/jsonBackup";
import {
  downloadStoredBackup,
  formatLastBackupLabel,
  generateAutoBackup,
  getAutoBackupMeta,
} from "@/lib/autoBackup";
import {
  factoryReset,
  FuelHistoryEntry,
  FuelPrices,
  getFuelHistory,
  getFuelPrices,
  getRegion,
  pullFuelHistory,
  saveFuelPrices,
  setRegion,
} from "@/lib/db";
import { MYANMAR_REGIONS } from "@/lib/regions";
import {
  logout,
  setStoredPassword,
  validatePasswordPolicy,
  verifyPassword,
} from "@/components/Login";
import { fmtNumber } from "@/lib/format";

const Settings = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [fuel, setFuel] = useState<FuelPrices>({
    price92: 0,
    price95: 0,
    priceDiesel: 0,
  });
  const [savingFuel, setSavingFuel] = useState(false);

  // Change password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Factory reset
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPw, setResetPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Auto-backup meta
  const [autoMeta, setAutoMeta] = useState(getAutoBackupMeta());
  const [autoBusy, setAutoBusy] = useState(false);

  // Fuel history
  const [fuelHistory, setFuelHistory] = useState<FuelHistoryEntry[]>([]);

  // Region (Myanmar 14 regions/states)
  const [region, setRegionState] = useState<string>("");
  const [savingRegion, setSavingRegion] = useState(false);

  useEffect(() => {
    (async () => {
      setFuel(await getFuelPrices());
      setRegionState((await getRegion()) ?? "");
      // Try cloud refresh first; fall back to local mirror
      try {
        setFuelHistory(await pullFuelHistory());
      } catch {
        setFuelHistory(await getFuelHistory());
      }
    })();
  }, []);

  const saveRegion = async () => {
    if (!region) return toast.error("Pick a region");
    setSavingRegion(true);
    try {
      await setRegion(region);
      toast.success("Region saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSavingRegion(false);
    }
  };

  const refreshAutoMeta = () => setAutoMeta(getAutoBackupMeta());

  const runAutoBackupNow = async () => {
    setAutoBusy(true);
    try {
      await generateAutoBackup();
      refreshAutoMeta();
      toast.success("Auto-backup refreshed");
    } catch (e: any) {
      toast.error("Backup failed", { description: e?.message ?? "Unknown error" });
    } finally {
      setAutoBusy(false);
    }
  };

  const downloadAutoBackup = async () => {
    setAutoBusy(true);
    try {
      await downloadStoredBackup();
      refreshAutoMeta();
      toast.success("Backup downloaded");
    } catch (e: any) {
      toast.error("Download failed", { description: e?.message ?? "Unknown error" });
    } finally {
      setAutoBusy(false);
    }
  };

  const changePassword = async () => {
    if (!verifyPassword(curPw)) {
      toast.error("Current password is incorrect");
      return;
    }
    const err = validatePasswordPolicy(newPw);
    if (err) {
      toast.error(err);
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPw(true);
    setStoredPassword(newPw);
    setSavingPw(false);
    setCurPw("");
    setNewPw("");
    setConfirmPw("");
    toast.success("Password updated");
  };

  const doFactoryReset = async () => {
    if (!verifyPassword(resetPw)) {
      toast.error("Current password is incorrect");
      return;
    }
    setResetting(true);
    try {
      await factoryReset();
      toast.success("All data wiped. Reloading…");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      toast.error("Reset failed", { description: e?.message ?? "Unknown error" });
      setResetting(false);
    }
  };

  const saveFuel = async () => {
    setSavingFuel(true);
    try {
      await saveFuelPrices({ ...fuel, priceDiesel: 0 });
      setFuelHistory(await getFuelHistory());
      toast.success("Fuel prices saved to history");
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message ?? "Unknown error" });
    } finally {
      setSavingFuel(false);
    }
  };

  const onImportExcel = async (f: File | null) => {
    if (!f) return;
    try {
      await importFromExcel(f);
      toast.success("Imported. Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error("Import failed", { description: e?.message ?? "Invalid file" });
    }
  };

  const onImportJson = async (f: File | null) => {
    if (!f) return;
    try {
      await importFromJson(f);
      toast.success("Restored. Reloading…");
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error("Restore failed", { description: e?.message ?? "Invalid JSON" });
    }
  };

  const updatedLabel = fuel.updatedAt
    ? `Last updated ${new Date(fuel.updatedAt).toLocaleDateString()}`
    : "Not yet set";

  return (
    <div className="space-y-4">
      <section className="surface-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" /> Fuel Prices (Weekly)
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {updatedLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gasoline 92">
            <NumberInput
              value={fuel.price92}
              onChange={(n) => setFuel({ ...fuel, price92: n })}
              placeholder="0"
            />
          </Field>
          <Field label="Gasoline 95">
            <NumberInput
              value={fuel.price95}
              onChange={(n) => setFuel({ ...fuel, price95: n })}
              placeholder="0"
            />
          </Field>
        </div>
        <Button
          onClick={saveFuel}
          disabled={savingFuel}
          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-display uppercase tracking-wider"
        >
          {savingFuel ? "Saving…" : "Save Fuel Prices"}
        </Button>
      </section>

      <section className="surface-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" /> Fuel History
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {fuelHistory.length} records
          </span>
        </div>
        {fuelHistory.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No fuel-price history yet. Save weekly prices above to start tracking changes.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 max-h-80 overflow-y-auto">
            {fuelHistory.map((h, i) => {
              const prev = fuelHistory[i + 1];
              const d92 = prev ? h.gasoline92 - prev.gasoline92 : 0;
              const d95 = prev ? h.gasoline95 - prev.gasoline95 : 0;
              return (
                <li key={h.id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold tabular">{h.date}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <HistoryCell label="92" value={h.gasoline92} delta={prev ? d92 : undefined} />
                  <HistoryCell label="95" value={h.gasoline95} delta={prev ? d95 : undefined} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display uppercase tracking-wider text-sm font-bold text-primary flex items-center gap-2">
            <FileJson className="h-4 w-4" /> JSON Backup & Restore
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground text-right">
            Last auto-backup
            <br />
            <span className="text-foreground normal-case tracking-normal">
              {formatLastBackupLabel(autoMeta.lastBackupAt)}
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          A JSON snapshot is generated automatically once per month and saved to
          this device. Export anytime, or import a file to overwrite all records
          and re-sync to Cloud.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={async () => {
              await exportToJson();
              toast.success("JSON downloaded");
            }}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-display uppercase tracking-wider"
          >
            <Download className="h-4 w-4 mr-2" /> Export JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => jsonRef.current?.click()}
            className="font-display uppercase tracking-wider"
          >
            <Upload className="h-4 w-4 mr-2" /> Import JSON
          </Button>
          <Button
            variant="secondary"
            onClick={downloadAutoBackup}
            disabled={autoBusy || !autoMeta.hasPayload}
            className="font-display uppercase tracking-wider"
          >
            <Download className="h-4 w-4 mr-2" /> Download Last Auto-Backup
          </Button>
          <Button
            variant="outline"
            onClick={runAutoBackupNow}
            disabled={autoBusy}
            className="font-display uppercase tracking-wider"
          >
            {autoBusy ? "Working…" : "Refresh Auto-Backup"}
          </Button>
          <input
            ref={jsonRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onImportJson(e.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" /> Excel Backup
        </h2>
        <p className="text-xs text-muted-foreground">
          Single .xlsx file with sheets for Daily, Savings, Fuel History, Fuel
          Prices, Monthly Finance, and Maintenance. Opens cleanly in Google
          Sheets.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await exportToExcel();
              toast.success("Excel downloaded");
            }}
            className="font-display uppercase tracking-wider"
          >
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            className="font-display uppercase tracking-wider"
          >
            <Upload className="h-4 w-4 mr-2" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => onImportExcel(e.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" /> Install on Device
        </h2>
        <p className="text-xs text-muted-foreground">
          Install MTSY to your phone home screen for app-like full-screen use.
        </p>
        <Link to="/install">
          <Button variant="secondary" className="w-full font-display uppercase tracking-wider">
            How to Install
          </Button>
        </Link>
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-2">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> About
        </h2>
        <p className="text-xs text-muted-foreground">
          MTSY Car Rental — operations & finance app. Data is mirrored between this device and Lovable Cloud.
        </p>
        <p className="text-[10px] text-muted-foreground">v1.2 · Cloud-synced PWA</p>
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Change Password
        </h2>
        <p className="text-xs text-muted-foreground">
          Must be 6–18 characters and include letters, numbers, and a special character (e.g. @, #, $, !).
        </p>
        <PasswordField
          label="Current Password"
          value={curPw}
          onChange={setCurPw}
          show={showCur}
          onToggle={() => setShowCur((s) => !s)}
          autoComplete="current-password"
        />
        <PasswordField
          label="New Password"
          value={newPw}
          onChange={setNewPw}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm New Password"
          value={confirmPw}
          onChange={setConfirmPw}
          show={showConfirm}
          onToggle={() => setShowConfirm((s) => !s)}
          autoComplete="new-password"
        />
        <Button
          onClick={changePassword}
          disabled={savingPw || !curPw || !newPw || !confirmPw}
          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-display uppercase tracking-wider"
        >
          {savingPw ? "Saving…" : "Update Password"}
        </Button>
      </section>

      <section className="surface-card border border-destructive/40 rounded-xl p-5 space-y-3">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" /> Danger Zone
        </h2>
        <p className="text-xs text-muted-foreground">
          Permanently delete ALL records (daily, monthly, savings, withdrawals, fuel prices) from this device and the Cloud. This cannot be undone.
        </p>
        <Button
          onClick={() => {
            setResetPw("");
            setShowResetPw(false);
            setResetOpen(true);
          }}
          className="w-full font-display uppercase tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <AlertTriangle className="h-4 w-4 mr-2" /> Factory Reset
        </Button>
      </section>

      <Button
        variant="outline"
        onClick={() => {
          if (confirm("Sign out of this device?")) logout();
        }}
        className="w-full font-display uppercase tracking-wider border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>

      <AlertDialog open={resetOpen} onOpenChange={(o) => !resetting && setResetOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirm Factory Reset
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently erase ALL records from this device and Lovable Cloud. Enter your current password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Current Password
            </Label>
            <div className="relative">
              <Input
                type={showResetPw ? "text" : "password"}
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                className="pr-10"
                disabled={resetting}
              />
              <button
                type="button"
                onClick={() => setShowResetPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={showResetPw ? "Hide password" : "Show password"}
              >
                {showResetPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doFactoryReset();
              }}
              disabled={resetting || !resetPw}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? "Erasing…" : "Erase Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const PasswordField = ({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {label}
    </Label>
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••"
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
      {label}
    </Label>
    {children}
  </div>
);

const HistoryCell = ({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta?: number;
}) => {
  const hasDelta = delta !== undefined && delta !== 0;
  const up = (delta ?? 0) > 0;
  return (
    <div className="text-right min-w-[64px]">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="font-display font-bold text-primary tabular text-sm">
        {fmtNumber(value, { decimals: value % 1 === 0 ? 0 : 2 })}
      </p>
      {hasDelta && (
        <p
          className={`text-[9px] font-semibold tabular ${
            up ? "text-destructive" : "text-success"
          }`}
        >
          {up ? "+" : ""}
          {fmtNumber(delta!, { decimals: 0 })}
        </p>
      )}
    </div>
  );
};

export default Settings;

