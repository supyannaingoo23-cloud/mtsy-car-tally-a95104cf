import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { pullFromCloud } from "./lib/db";

// Pull latest data from Cloud on startup, then mount.
// If offline, the local mirror is used immediately.
pullFromCloud().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
