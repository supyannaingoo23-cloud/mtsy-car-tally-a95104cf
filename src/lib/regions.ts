// Nay Pyi Taw + 14 Regions/States of Myanmar, sorted strictly alphabetically (A–Z).
// Sorting is locale-aware so display order is stable across browsers/devices.
const _RAW_REGIONS = [
  "Ayeyarwady Region",
  "Bago Region",
  "Chin State",
  "Kachin State",
  "Kayah State",
  "Kayin State",
  "Magway Region",
  "Mandalay Region",
  "Mon State",
  "Nay Pyi Taw (Union Territory)",
  "Rakhine State",
  "Sagaing Region",
  "Shan State",
  "Tanintharyi Region",
  "Yangon Region",
] as const;

export const MYANMAR_REGIONS = [..._RAW_REGIONS].sort((a, b) =>
  a.localeCompare(b, "en", { sensitivity: "base" }),
) as unknown as typeof _RAW_REGIONS;

export type MyanmarRegion = (typeof MYANMAR_REGIONS)[number];
