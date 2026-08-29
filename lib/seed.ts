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

// Fallback ranking shown until Supabase has real data: the two real anchors
// below plus exactly one empty, unclaimed slot — not a padded-out ranking of
// fictional companies. The anchors didn't actually pay, so they sit at the $1
// entry price rather than a fake amount real buyers would have to outbid —
// the first real visitor should be able to take #1 for $2, not $2,601. The
// empty slot sits at $0 so it always sorts last and is free to claim from $1.
export const SEED: Billboard[] = [1, 1, 0].map((amount, i) => ({
  id: `empty-${i}`,
  name: `empty-${i}`,
  url: "",
  color: "#fffaf0",
  amount,
  placeholder: true,
}));

// The two placeholder slots at rank 1 and rank 2 are overlaid with these real
// domains (favicon, SEO copy, colour — fetched live, see withAnchors below)
// instead of staying empty, so the road never opens on a totally bare ranking.
export const ANCHOR_DOMAINS = ["billeltighidet.fr", "lacompagniedesinternetsbordelaise.fr"];

// Categories aren't scraped off the site — a real buyer picks one at checkout
// — so the anchors need one hardcoded here, same index order as
// ANCHOR_DOMAINS, purely to have the category label rendered on the highway.
export const ANCHOR_CATEGORIES = ["Design & Creative", "Other"];

// Same story for clicks and claim freshness — real numbers only exist once a
// company has actually been clicked or paid for, which the anchors never do.
// Claimed-at is kept as an offset and turned into an ISO timestamp on demand
// so the "X ago" label stays sensible instead of freezing to the moment this
// file was written.
export const ANCHOR_CLICK_COUNTS = [128, 47];
const ANCHOR_CLAIMED_MINUTES_AGO = [45, 2880]; // 45m ago, 2d ago
export function anchorClaimedAt(i: number): string {
  return new Date(Date.now() - ANCHOR_CLAIMED_MINUTES_AGO[i] * 60_000).toISOString();
}
