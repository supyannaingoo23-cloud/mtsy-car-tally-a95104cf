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
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import NumberInput from "@/components/NumberInput";
import { toast } from "sonner";
import { exportToExcel, importFromExcel } from "@/lib/backup";
import { exportToJson, importFromJson } from "@/lib/jsonBackup";
import { FuelPrices, getFuelPrices, saveFuelPrices } from "@/lib/db";
import { logout } from "@/components/Login";

const Settings = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [fuel, setFuel] = useState<FuelPrices>({
    price92: 0,
    price95: 0,
    priceDiesel: 0,
  });
  const [savingFuel, setSavingFuel] = useState(false);

  useEffect(() => {
    (async () => setFuel(await getFuelPrices()))();
  }, []);

  const saveFuel = async () => {
    setSavingFuel(true);
    await saveFuelPrices({ ...fuel, priceDiesel: 0 });
    setSavingFuel(false);
    toast.success("Fuel prices updated");
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

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold text-primary flex items-center gap-2">
          <FileJson className="h-4 w-4" /> JSON Backup & Restore
        </h2>
        <p className="text-xs text-muted-foreground">
          Manual backup of the entire database (daily, monthly, maintenance, withdrawals, fuel prices) as a JSON file.
          Import to overwrite all records and re-sync to Cloud.
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
          Export/import as a multi-sheet Excel file (legacy format).
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

      <Button
        variant="outline"
        onClick={() => {
          if (confirm("Sign out of this device?")) logout();
        }}
        className="w-full font-display uppercase tracking-wider border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
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

export default Settings;
