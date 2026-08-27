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

// The smallest billboard has a fixed, readable size and every rank above it
// grows from there. Size therefore follows your position in the ranking, not the
// raw amount — a 200-long ranking still ends on a real billboard instead of a
// speck, and the leader is always the same monster whatever the money involved.
const MIN_PANEL_H = 5.2;
const MAX_PANEL_H = 34;
const GROWTH = 2.4; // >1 keeps the drama at the top and the tail legible

export function computeLayout(billboards: Billboard[]): SceneLayout {
  const sorted = [...billboards].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const n = sorted.length;
  let cursor = 0;
  const items = sorted.map((b, i) => {
    const rank = i + 1;
    const t = n > 1 ? (n - rank) / (n - 1) : 1; // 1 for the leader, 0 for the last
    const panelH = MIN_PANEL_H + (MAX_PANEL_H - MIN_PANEL_H) * Math.pow(t, GROWTH);
    const panelW = panelH * 1.9;
    const poleH = 1.8 + panelH * 0.36;
    const totalH = poleH + panelH;
    const x = cursor + panelW / 2;
    cursor = x + panelW / 2 + Math.max(9, panelW * 0.38);
    return { ...b, rank, x, panelW, panelH, poleH, totalH };
  });
  const endX = items.length ? items[items.length - 1].x + items[items.length - 1].panelW / 2 : 40;
  return { items, startX: -90, endX: endX + 40 };
}

export const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

// One world unit ≈ one metre, so the scene can brag in feet like a real highway sign.
export const FEET_PER_UNIT = 3.28084;
export const fmtFeet = (units: number) =>
  `${Math.round(units * FEET_PER_UNIT).toLocaleString("en-US")} ft`;
