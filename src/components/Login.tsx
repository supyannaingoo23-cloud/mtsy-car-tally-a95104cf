import { FormEvent, useState } from "react";
import { Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STORAGE_KEY = "mtsy:auth";
const VALID_USER = "admin";
const VALID_PASS = "1234";

export function isAuthed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function logout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}

const Login = ({ onSuccess }: { onSuccess: () => void }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (user.trim().toLowerCase() === VALID_USER && pass === VALID_PASS) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      toast.success("Welcome back");
      onSuccess();
    } else {
      toast.error("Invalid credentials");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-primary grid place-items-center font-display font-bold text-2xl text-primary-foreground shadow-glow">
            M
          </div>
          <div>
            <h1 className="font-display font-bold tracking-[0.25em] text-xl">MTSY</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
              Car Rental
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="surface-card border border-border rounded-2xl p-5 space-y-4 shadow-glow"
        >
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Username
            </Label>
            <div className="relative">
              <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoCapitalize="none"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Password
            </Label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                className="pl-9"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 font-display tracking-wider uppercase bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
          >
            {busy ? "Signing in…" : "Sign In"}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            You'll stay signed in on this device.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
