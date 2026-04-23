import { FormEvent, useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STORAGE_KEY = "mtsy:auth";
const PASS_KEY = "mtsy:pass";
const VALID_USER = "admin";
const DEFAULT_PASS = "1234";

export function getStoredPassword(): string {
  try {
    return localStorage.getItem(PASS_KEY) ?? DEFAULT_PASS;
  } catch {
    return DEFAULT_PASS;
  }
}

export function setStoredPassword(pw: string) {
  try {
    localStorage.setItem(PASS_KEY, pw);
  } catch {
    /* ignore */
  }
}

export function verifyPassword(pw: string): boolean {
  return pw === getStoredPassword();
}

/** Validate against policy: 6-18 chars, must contain letter, number AND special. */
export function validatePasswordPolicy(pw: string): string | null {
  if (pw.length < 6 || pw.length > 18) return "Password must be 6–18 characters.";
  if (!/[A-Za-z]/.test(pw)) return "Must contain at least one letter.";
  if (!/[0-9]/.test(pw)) return "Must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must contain at least one special character (e.g. @, #, $, !).";
  return null;
}

export function isAuthed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAuthed() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
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
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (user.trim().toLowerCase() === VALID_USER && verifyPassword(pass)) {
      setAuthed();
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
                type={show ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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
