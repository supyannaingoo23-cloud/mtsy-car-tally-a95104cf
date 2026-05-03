// Nay Pyi Taw + 14 Regions/States of Myanmar
export const MYANMAR_REGIONS = [
  "Nay Pyi Taw (Union Territory)",
  "Ayeyarwady Region",
  "Bago Region",
  "Magway Region",
  "Mandalay Region",
  "Sagaing Region",
  "Tanintharyi Region",
  "Yangon Region",
  "Chin State",
  "Kachin State",
  "Kayah State",
  "Kayin State",
  "Mon State",
  "Rakhine State",
  "Shan State",
] as const;

export type MyanmarRegion = (typeof MYANMAR_REGIONS)[number];
