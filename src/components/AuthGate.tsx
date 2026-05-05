import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Login, { isLocalAuthed } from "./Login";
import { supabase } from "@/integrations/supabase/client";
import { claimOwnershipIfUnclaimed, pullFromCloud } from "@/lib/db";
import { initNotificationsAndTracking } from "@/lib/notifications";

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"checking" | "authed" | "unauthed">("checking");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Set up auth listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const localOk = isLocalAuthed();
      const supaOk = !!session;
      if (supaOk || localOk) {
        setStatus("authed");
        if (supaOk) {
          // Claim ownership in the background once Google session is set
          void claimOwnershipIfUnclaimed();
        }
      } else {
        setStatus("unauthed");
      }
    });

    // Then check current state and pull cloud data
    (async () => {
      const { data } = await supabase.auth.getSession();
      const supaOk = !!data.session;
      const localOk = isLocalAuthed();

      if (supaOk) {
        await claimOwnershipIfUnclaimed();
      }
      if (supaOk || localOk) {
        setSyncing(true);
        try {
          await pullFromCloud();
        } finally {
          if (mounted) setSyncing(false);
        }
        if (mounted) setStatus("authed");
        void initNotificationsAndTracking();
      } else {
        if (mounted) setStatus("unauthed");
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthed") {
    return (
      <Login
        onSuccess={async () => {
          setSyncing(true);
          try {
            await pullFromCloud();
          } finally {
            setSyncing(false);
          }
          setStatus("authed");
        }}
      />
    );
  }

  if (syncing) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Syncing your data…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
