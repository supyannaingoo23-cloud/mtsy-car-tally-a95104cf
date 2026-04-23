import { useEffect, useState } from "react";
import Login, { isAuthed } from "./Login";

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [authed, setAuthed] = useState<boolean>(() => isAuthed());
  // Re-check on mount in case storage was changed in another tab
  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <>{children}</>;
};

export default AuthGate;
