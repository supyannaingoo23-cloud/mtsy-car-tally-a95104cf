import { Link } from "react-router-dom";
import { ArrowLeft, Smartphone, Apple, Chrome } from "lucide-react";

const Install = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 border-b border-border/60 backdrop-blur-xl bg-background/80">
      <div className="mx-auto max-w-screen-sm px-4 h-14 flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold uppercase tracking-wider">Install MTSY</h1>
      </div>
    </header>

    <main className="mx-auto max-w-screen-sm px-4 py-6 space-y-5">
      <div className="surface-card border border-border rounded-xl p-6 text-center space-y-3">
        <div className="h-20 w-20 rounded-2xl bg-gradient-primary mx-auto grid place-items-center shadow-glow">
          <Smartphone className="h-10 w-10 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold">Add to Home Screen</h2>
        <p className="text-sm text-muted-foreground">
          MTSY runs offline as a full-screen app once installed.
        </p>
      </div>

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Chrome className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold uppercase tracking-wider text-sm">Android (Chrome)</h3>
        </div>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Tap the ⋮ menu (top-right)</li>
          <li>Choose "Add to Home screen" / "Install app"</li>
          <li>Confirm — MTSY appears on your home screen</li>
        </ol>
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Apple className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold uppercase tracking-wider text-sm">iPhone (Safari)</h3>
        </div>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Tap the Share button</li>
          <li>Scroll and tap "Add to Home Screen"</li>
          <li>Confirm — MTSY appears as an app icon</li>
        </ol>
      </section>

      <section className="surface-card border border-border rounded-xl p-5 space-y-2">
        <h3 className="font-display font-bold uppercase tracking-wider text-sm">Need an .APK?</h3>
        <p className="text-xs text-muted-foreground">
          You can wrap this app with Capacitor to generate a real Android APK for the Play Store. Run locally:
        </p>
        <pre className="text-[11px] bg-secondary/40 rounded-lg p-3 overflow-x-auto tabular">
{`npm install
npx cap init "MTSY" com.mtsy.rental
npm run build
npx cap add android
npx cap sync
npx cap open android`}
        </pre>
      </section>
    </main>
  </div>
);

export default Install;
