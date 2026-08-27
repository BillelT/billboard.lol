import type { Billboard } from "./types";
import { BRAND_COLORS } from "./palette";

// Dev stress ranking (?stress=200): what the highway looks like with a real
// crowd of companies on it. Used to check draw calls and texture memory scale.
export function makeStressRanking(n: number): Billboard[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `stress-${i}`,
    name: `company-${i + 1}.com`,
    url: "https://example.com",
    color: BRAND_COLORS[i % BRAND_COLORS.length],
    amount: Math.round(4000 / Math.pow(i + 1, 0.85)) + 1,
  }));
}

// Demo-mode ranking. Replaced by Supabase data when configured.
export const SEED: Billboard[] = [
  { id: "s1", name: "omnicorp.biz", url: "https://example.com", color: "#2f6bff", amount: 2600 },
  { id: "s2", name: "hypergrowth.io", url: "https://example.com", color: "#e4572e", amount: 1450 },
  { id: "s3", name: "moneyprinter.app", url: "https://example.com", color: "#12b886", amount: 880 },
  { id: "s4", name: "synergy.consulting", url: "https://example.com", color: "#7048e8", amount: 560 },
  { id: "s5", name: "rocketmath.ai", url: "https://example.com", color: "#f6a41d", amount: 370 },
  { id: "s6", name: "coldemail.pro", url: "https://example.com", color: "#0ca6b8", amount: 240 },
  { id: "s7", name: "pixelbarn.studio", url: "https://example.com", color: "#e64980", amount: 155 },
  { id: "s8", name: "tumbleweed.dev", url: "https://example.com", color: "#37415c", amount: 90 },
  { id: "s9", name: "sidequest.lol", url: "https://example.com", color: "#2f6bff", amount: 55 },
  { id: "s10", name: "ramen.capital", url: "https://example.com", color: "#e4572e", amount: 28 },
  { id: "s11", name: "two-guys.garage", url: "https://example.com", color: "#12b886", amount: 12 },
  { id: "s12", name: "mom-approved.site", url: "https://example.com", color: "#f6a41d", amount: 5 },
];
