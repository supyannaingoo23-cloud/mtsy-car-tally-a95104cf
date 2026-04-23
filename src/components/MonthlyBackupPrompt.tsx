import { useEffect, useState } from "react";
import { CalendarClock, Download } from "lucide-react";
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
import {
  dismissMonthlyPrompt,
  downloadStoredBackup,
  generateAutoBackup,
  shouldPromptThisMonth,
} from "@/lib/autoBackup";

/**
 * Mounts once at app root. On the first load of each calendar month
 * (or first ever load), it silently builds a JSON snapshot, stores it
 * in localStorage, and asks the user whether to download it now.
 */
export default function MonthlyBackupPrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shouldPromptThisMonth()) return;
      try {
        await generateAutoBackup();
      } catch (e) {
        console.warn("[mtsy] auto-backup generation failed", e);
        return;
      }
      if (!cancelled) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDownload = async () => {
    setBusy(true);
    try {
      await downloadStoredBackup();
      dismissMonthlyPrompt();
      toast.success("Monthly backup downloaded");
      setOpen(false);
    } catch (e: any) {
      toast.error("Download failed", { description: e?.message ?? "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  const onLater = () => {
    dismissMonthlyPrompt();
    setOpen(false);
    toast("Saved to local storage", {
      description: "You can download it from Settings anytime.",
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Monthly Auto-Backup is ready
          </AlertDialogTitle>
          <AlertDialogDescription>
            We've prepared a JSON snapshot of all your data (daily records,
            savings, finance, fuel prices, maintenance). Would you like to save
            it now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onLater}>
            Later
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              onDownload();
            }}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4 mr-2" />
            {busy ? "Saving…" : "Download Now"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
