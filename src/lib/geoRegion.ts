// Approximate centroids for Myanmar's Union Territory + 14 Regions/States.
// Used to map browser GPS coordinates to the nearest administrative division
// for display purposes only (no manual selection is changed).
import { MYANMAR_REGIONS } from "./regions";

type Centroid = { name: (typeof MYANMAR_REGIONS)[number]; lat: number; lng: number };

const CENTROIDS: Centroid[] = [
  { name: "Nay Pyi Taw (Union Territory)", lat: 19.7633, lng: 96.0785 },
  { name: "Ayeyarwady Region", lat: 17.0, lng: 95.2 },
  { name: "Bago Region", lat: 18.3, lng: 96.5 },
  { name: "Magway Region", lat: 20.15, lng: 94.95 },
  { name: "Mandalay Region", lat: 21.5, lng: 96.0 },
  { name: "Sagaing Region", lat: 23.5, lng: 95.5 },
  { name: "Tanintharyi Region", lat: 12.5, lng: 99.0 },
  { name: "Yangon Region", lat: 16.85, lng: 96.2 },
  { name: "Chin State", lat: 22.5, lng: 93.6 },
  { name: "Kachin State", lat: 26.0, lng: 97.5 },
  { name: "Kayah State", lat: 19.3, lng: 97.3 },
  { name: "Kayin State", lat: 17.3, lng: 97.7 },
  { name: "Mon State", lat: 16.3, lng: 97.65 },
  { name: "Rakhine State", lat: 20.1, lng: 93.5 },
  { name: "Shan State", lat: 21.5, lng: 98.5 },
];

function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestMyanmarRegion(lat: number, lng: number): string {
  let best = CENTROIDS[0];
  let bestD = Infinity;
  for (const c of CENTROIDS) {
    const d = haversine(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}

export type GeoRegionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; region: string }
  | { status: "error"; message: string };

export function detectRegion(): Promise<GeoRegionState> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ status: "error", message: "Geolocation unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const region = nearestMyanmarRegion(pos.coords.latitude, pos.coords.longitude);
        resolve({ status: "ok", region });
      },
      (err) => resolve({ status: "error", message: err.message || "Permission denied" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
