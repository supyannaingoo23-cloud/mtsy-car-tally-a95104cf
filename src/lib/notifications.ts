// Local notifications + background GPS region monitoring for MTSY Car Tally.
// Safe on web (no-ops gracefully); fully active on Android/iOS via Capacitor.
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getFuelFills, getQuotaLiters } from "./db";
import { computeQuotaStatus } from "./quota";
import { nearestMyanmarRegion } from "./geoRegion";

const isNative = () => Capacitor.isNativePlatform();

const FRIDAY_NOTIF_ID = 9001;
const QUOTA_BASE_ID = 9100;
const REGION_BASE_ID = 9200;

/** Request notification + (background) location permissions on first launch. */
export async function requestAllPermissions(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.requestPermissions();
  } catch (e) {
    console.warn("[mtsy] notif permission failed", e);
  }
  try {
    // Dynamically import so web build doesn't crash if plugin missing.
    const { BackgroundGeolocation } = await import(
      "@capacitor-community/background-geolocation"
    );
    // Adding a watcher triggers the OS permission prompt (incl. "Always").
    await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "MTSY is tracking your region for fuel quota.",
        backgroundTitle: "MTSY Car Tally",
        requestPermissions: true,
        stale: false,
        distanceFilter: 1000, // meters
      },
      () => {
        /* handled by startRegionWatcher */
      },
    );
  } catch (e) {
    console.warn("[mtsy] background geo permission failed", e);
  }
}

/** Schedule a repeating Friday 9:00 AM local notification. */
export async function scheduleFridayFuelReminder(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: FRIDAY_NOTIF_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: FRIDAY_NOTIF_ID,
          title: "Friday Update",
          body: "Please check and update the fuel prices for this week",
          schedule: {
            on: { weekday: 6, hour: 9, minute: 0 }, // Capacitor: Sun=1..Sat=7 → Fri=6
            allowWhileIdle: true,
            repeats: true,
          },
        },
      ],
    });
  } catch (e) {
    console.warn("[mtsy] friday reminder schedule failed", e);
  }
}

async function notify(id: number, title: string, body: string) {
  if (!isNative()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{ id, title, body, schedule: { at: new Date(Date.now() + 500) } }],
    });
  } catch (e) {
    console.warn("[mtsy] notify failed", e);
  }
}

/** Trigger region-entered + quota alerts based on Supabase data. */
async function handleRegionChange(region: string) {
  try {
    const [fills, quotaTotal] = await Promise.all([getFuelFills(), getQuotaLiters()]);
    const status = computeQuotaStatus(fills, new Date(), region, quotaTotal);
    const nextDate = status.nextEligibleDate ?? "—";

    // Region-entered high-priority notification
    await notify(
      REGION_BASE_ID,
      `📍 Entered ${region}`,
      `Remaining: ${status.remainingLiters}L / ${status.quotaTotal}L • Reset: ${nextDate}`,
    );

    // Quota-zero alert
    if (status.remainingLiters <= 0) {
      await notify(
        QUOTA_BASE_ID,
        "Fuel limit reached",
        `Fuel limit reached for ${region}. Resetting on ${nextDate}.`,
      );
    }
  } catch (e) {
    console.warn("[mtsy] region change handler failed", e);
  }
}

let lastRegion: string | null = null;
let regionWatcherId: string | null = null;

/** Start background watcher; emits region-changed events. */
export async function startRegionWatcher(): Promise<void> {
  if (!isNative()) return;
  try {
    const { BackgroundGeolocation } = await import(
      "@capacitor-community/background-geolocation"
    );
    if (regionWatcherId) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: regionWatcherId });
      } catch {
        /* noop */
      }
    }
    regionWatcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "MTSY is monitoring your region for fuel quota.",
        backgroundTitle: "MTSY Car Tally",
        requestPermissions: true,
        stale: false,
        distanceFilter: 1000,
      },
      (location, error) => {
        if (error || !location) return;
        const region = nearestMyanmarRegion(location.latitude, location.longitude);
        if (region !== lastRegion) {
          lastRegion = region;
          void handleRegionChange(region);
        }
      },
    );
  } catch (e) {
    console.warn("[mtsy] region watcher failed", e);
  }
}

/** One-shot bootstrap, call once after auth. */
export async function initNotificationsAndTracking(): Promise<void> {
  if (!isNative()) return;
  await requestAllPermissions();
  await scheduleFridayFuelReminder();
  await startRegionWatcher();
}
