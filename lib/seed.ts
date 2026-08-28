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

// Fallback ranking shown until Supabase has real data: empty, unclaimed slots
// rather than fictional companies. The staggered amounts only exist to stagger
// the panel sizes the way a real ranking would (see computeLayout) and to seed
// the "biggest billboard for $…" starting price — no fake advertiser is shown.
export const SEED: Billboard[] = [2600, 1450, 880, 560, 370, 240, 155, 90, 55, 28, 12, 5].map(
  (amount, i) => ({
    id: `empty-${i}`,
    name: `empty-${i}`,
    url: "",
    color: "#fffaf0",
    amount,
    placeholder: true,
  }),
);
