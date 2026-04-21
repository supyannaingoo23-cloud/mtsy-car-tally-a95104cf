import { useRef } from "react";
import { Download, Upload, Smartphone, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportToExcel, importFromExcel } from "@/lib/backup";

const Settings = () => {
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (f: File | null) => {
    if (!f) return;
    try {
      await importFromExcel(f);
      toast.success("Imported. Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error("Import failed", { description: e?.message ?? "Invalid file" });
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold text-primary">
          Backup & Restore
        </h2>
        <p className="text-xs text-muted-foreground">
          Export all data (daily entries, monthly inputs, maintenance) to an Excel file. Import to restore.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={async () => {
              await exportToExcel();
              toast.success("Backup downloaded");
            }}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-display uppercase tracking-wider"
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
            onChange={(e) => onImport(e.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-display uppercase tracking-wider text-sm font-bold flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" /> Install on Device
        </h2>
        <p className="text-xs text-muted-foreground">
          Install MTSY to your phone home screen for app-like full-screen use, completely offline.
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
          MTSY Car Rental — operations & finance app. All data stored locally on this device.
        </p>
        <p className="text-[10px] text-muted-foreground">v1.0 · Offline-first PWA</p>
      </section>
    </div>
  );
};

export default Settings;
