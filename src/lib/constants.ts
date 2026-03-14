import type { EqBandConfig } from "../types";

export const EQ_BANDS: EqBandConfig[] = [
  { frequency: 62,    type: "peaking",   Q: 1.4 },
  { frequency: 125,   type: "peaking",   Q: 1.4 },
  { frequency: 250,   type: "peaking",   Q: 1.4 },
  { frequency: 500,   type: "peaking",   Q: 1.4 },
  { frequency: 1000,  type: "peaking",   Q: 1.4 },
  { frequency: 2000,  type: "peaking",   Q: 1.4 },
  { frequency: 4000,  type: "peaking",   Q: 1.4 },
  { frequency: 8000,  type: "peaking",   Q: 1.4 },
  { frequency: 12000, type: "highshelf", Q: 0.7 },
  { frequency: 16000, type: "highshelf", Q: 0.7 },
];

export const EQ_BAND_LABELS = ["62", "125", "250", "500", "1K", "2K", "4K", "8K", "12K", "16K"];

export const BUILT_IN_PRESETS: { name: string; gains: number[] }[] = [
  { name: "Flat",      gains: [0,  0,  0,  0,  0,  0,  0,  0,  0,  0] },
  { name: "Rock",      gains: [4,  3,  0, -1, -2,  0,  2,  4,  4,  4] },
  { name: "Pop",       gains: [-2, 0,  2,  4,  4,  2,  0, -2, -2, -2] },
  { name: "Jazz",      gains: [3,  2,  0,  2,  0,  0,  0,  2,  3,  3] },
  { name: "Classical", gains: [4,  3,  0,  0,  0,  0,  0,  3,  4,  4] },
];

export const MAX_EQ_GAIN = 12;
export const MIN_EQ_GAIN = -12;

export const QUALITY_COLORS: Record<string, string> = {
  low: "#5c1a1a",   // < 720p
  mid: "#2b2b2b",   // = 720p
  high: "#3d1a5e",  // > 720p
};

export function qualityToHeight(q: string): number {
  return parseInt(q.replace("p", ""), 10) || 720;
}

export function qualityColor(q: string): string {
  const h = qualityToHeight(q);
  if (h < 720) return QUALITY_COLORS.low;
  if (h > 720) return QUALITY_COLORS.high;
  return QUALITY_COLORS.mid;
}
