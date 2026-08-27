import type { Billboard } from "./types";

// World axes: the road runs along +X, billboards line up on the far side of it.
export const BILL_Z = -14; // billboard line
export const ROAD_Z = 0; // road center
export const ROAD_W = 9; // two lanes

export interface LayoutItem extends Billboard {
  rank: number;
  x: number;
  panelW: number;
  panelH: number;
  poleH: number;
  totalH: number;
}

export interface SceneLayout {
  items: LayoutItem[];
  startX: number;
  endX: number;
}

// Rank 1 is huge and first; sizes shrink with amount along the road.
export function computeLayout(billboards: Billboard[]): SceneLayout {
  const sorted = [...billboards].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const max = Math.max(sorted[0]?.amount ?? 1, 1);
  let cursor = 0;
  const items = sorted.map((b, i) => {
    const t = Math.pow(Math.max(b.amount, 1) / max, 0.45);
    const panelH = 2.4 + 30 * t;
    const panelW = panelH * 1.9;
    const poleH = 1.8 + panelH * 0.36;
    const totalH = poleH + panelH;
    const x = cursor + panelW / 2;
    cursor = x + panelW / 2 + Math.max(9, panelW * 0.38);
    return { ...b, rank: i + 1, x, panelW, panelH, poleH, totalH };
  });
  const endX = items.length ? items[items.length - 1].x + items[items.length - 1].panelW / 2 : 40;
  return { items, startX: -90, endX: endX + 40 };
}

export const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
